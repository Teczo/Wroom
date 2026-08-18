import {
  FEATURE_CSV_COLUMNS,
  FEATURE_ORDER_GAP,
  FEATURE_PRIORITIES,
  FEATURE_SIZES,
  FEATURE_STATUSES,
  type FeatureImportDiff,
  type FeatureImportResult,
  type FeaturePriority,
  type FeatureSize,
  type FeatureStatus,
  type ImportFieldChange,
  type ImportInvalidRow,
} from '@wroom/shared';
import mongoose from 'mongoose';
import Papa from 'papaparse';

import { FeatureModel, type FeatureDocument } from '../models/Feature.js';
import { ProjectModel } from '../models/Project.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { recomputeProjectRollup } from './rollupService.js';

/**
 * CSV import for a project's features.
 *
 * Matching is on `ref` within the project: a match updates, no match inserts,
 * and nothing is ever deleted — a feature the file says nothing about is left
 * exactly as it was and listed as unaffected.
 *
 * Preview and commit run the same pipeline. Commit re-parses rather than
 * trusting rows sent back by the client, so what gets written is what the
 * server itself judged valid.
 */

/** Both separators are accepted inside a `labels` or `dependsOn` cell. */
const CELL_SEPARATOR = /[;,]/;

type ParsedRow = {
  /** 1-based line number in the file as a person reading it would count. */
  row: number;
  ref: string;
  title: string;
  description: string;
  acceptanceCriteria: string;
  status: string;
  priority: string;
  size: string;
  labels: string[];
  dependsOn: string[];
};

type ValidRow = Omit<ParsedRow, 'status' | 'priority' | 'size'> & {
  status: FeatureStatus;
  priority: FeaturePriority;
  size: FeatureSize;
};

function splitCell(value: string): string[] {
  return value
    .split(CELL_SEPARATOR)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function cell(record: Record<string, string>, column: string): string {
  return (record[column] ?? '').trim();
}

/**
 * Parses the file. A malformed file throws with the line that broke, rather
 * than importing whatever happened to survive.
 */
function parseCsv(csv: string): { rows: ParsedRow[]; unknownColumns: string[] } {
  const result = Papa.parse<Record<string, string>>(csv.trim(), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
  });

  const fatal = result.errors.find((error) => error.type === 'Delimiter' || error.type === 'Quotes');
  if (fatal) {
    throw new ValidationError(
      `The file could not be read at line ${(fatal.row ?? 0) + 2}: ${fatal.message}`,
      { csv: `Line ${(fatal.row ?? 0) + 2}: ${fatal.message}` },
    );
  }

  const headers = result.meta.fields ?? [];
  const known = new Set<string>(FEATURE_CSV_COLUMNS);
  const unknownColumns = headers.filter((header) => header !== '' && !known.has(header));

  if (!headers.includes('ref')) {
    throw new ValidationError('The file needs a `ref` column — that is what rows match on.', {
      csv: 'No `ref` column found in the header row.',
    });
  }

  const rows = result.data.map((record, index) => ({
    // +2: one for the header row, one because people count from 1.
    row: index + 2,
    ref: cell(record, 'ref').toUpperCase(),
    title: cell(record, 'title'),
    description: cell(record, 'description'),
    acceptanceCriteria: cell(record, 'acceptanceCriteria'),
    status: cell(record, 'status').toLowerCase(),
    priority: cell(record, 'priority').toLowerCase(),
    size: cell(record, 'size').toLowerCase(),
    labels: splitCell(cell(record, 'labels')),
    dependsOn: splitCell(cell(record, 'dependsOn')).map((ref) => ref.toUpperCase()),
  }));

  return { rows, unknownColumns };
}

function oneOf<T extends string>(allowed: readonly T[], value: string, fallback: T): T | null {
  if (value === '') return fallback;
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

/** Everything wrong with a row, judged before anything is written. */
function validateRow(
  parsed: ParsedRow,
  refCounts: Map<string, number>,
  knownRefs: Set<string>,
): ImportInvalidRow | null {
  const fail = (column: string | null, reason: string): ImportInvalidRow => ({
    row: parsed.row,
    ref: parsed.ref,
    column,
    reason,
  });

  if (parsed.ref === '') return fail('ref', 'Every row needs a ref — it is what rows match on.');
  if (parsed.title === '') return fail('title', 'Every row needs a title.');

  if ((refCounts.get(parsed.ref) ?? 0) > 1) {
    return fail('ref', `'${parsed.ref}' appears more than once in this file.`);
  }

  if (oneOf(FEATURE_STATUSES, parsed.status, 'backlog') === null) {
    return fail('status', `'${parsed.status}' is not a status. Use one of: ${FEATURE_STATUSES.join(', ')}.`);
  }

  if (oneOf(FEATURE_PRIORITIES, parsed.priority, 'medium') === null) {
    return fail('priority', `'${parsed.priority}' is not a priority. Use one of: ${FEATURE_PRIORITIES.join(', ')}.`);
  }

  if (oneOf(FEATURE_SIZES, parsed.size, 'm') === null) {
    return fail('size', `'${parsed.size}' is not a size. Use one of: ${FEATURE_SIZES.join(', ')}.`);
  }

  if (parsed.dependsOn.includes(parsed.ref)) {
    return fail('dependsOn', 'A feature cannot depend on itself.');
  }

  const missing = parsed.dependsOn.filter((ref) => !knownRefs.has(ref));
  if (missing.length > 0) {
    return fail(
      'dependsOn',
      `${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} not in this file or on this project.`,
    );
  }

  return null;
}

function changesFor(existing: FeatureDocument, row: ValidRow): ImportFieldChange[] {
  const comparisons: Array<[string, string, string]> = [
    ['title', existing.title, row.title],
    ['description', existing.description, row.description],
    ['acceptanceCriteria', existing.acceptanceCriteria, row.acceptanceCriteria],
    ['status', existing.status, row.status],
    ['priority', existing.priority, row.priority],
    ['size', existing.size, row.size],
    ['labels', existing.labels.join(', '), row.labels.join(', ')],
  ];

  return comparisons
    .filter(([, from, to]) => from !== to)
    .map(([field, from, to]) => ({ field, from, to }));
}

type Plan = {
  diff: FeatureImportDiff;
  valid: ValidRow[];
  existingByRef: Map<string, FeatureDocument>;
};

async function buildPlan(projectId: string, csv: string): Promise<Plan> {
  const project = await ProjectModel.exists({ _id: projectId });
  if (!project) throw new NotFoundError('That project');

  const { rows, unknownColumns } = parseCsv(csv);

  const existing = await FeatureModel.find({ projectId });
  const existingByRef = new Map(existing.map((feature) => [feature.ref, feature]));

  const refCounts = new Map<string, number>();
  for (const row of rows) refCounts.set(row.ref, (refCounts.get(row.ref) ?? 0) + 1);

  // A dependsOn ref may point at a row in this file or a feature already on the
  // project — both are resolvable, anything else is not.
  const knownRefs = new Set<string>([...existingByRef.keys(), ...rows.map((row) => row.ref)]);

  const invalid: ImportInvalidRow[] = [];
  const valid: ValidRow[] = [];

  for (const parsed of rows) {
    const problem = validateRow(parsed, refCounts, knownRefs);

    if (problem) {
      invalid.push(problem);
      continue;
    }

    valid.push({
      ...parsed,
      status: oneOf(FEATURE_STATUSES, parsed.status, 'backlog')!,
      priority: oneOf(FEATURE_PRIORITIES, parsed.priority, 'medium')!,
      size: oneOf(FEATURE_SIZES, parsed.size, 'm')!,
    });
  }

  const touchedRefs = new Set(valid.map((row) => row.ref));

  return {
    valid,
    existingByRef,
    diff: {
      inserts: valid
        .filter((row) => !existingByRef.has(row.ref))
        .map((row) => ({ row: row.row, ref: row.ref, title: row.title, status: row.status })),

      updates: valid
        .filter((row) => existingByRef.has(row.ref))
        .map((row) => {
          const feature = existingByRef.get(row.ref)!;

          return {
            row: row.row,
            ref: row.ref,
            featureId: String(feature._id),
            title: row.title,
            changes: changesFor(feature, row),
          };
        }),

      invalid,
      unaffected: existing
        .filter((feature) => !touchedRefs.has(feature.ref))
        .map((feature) => ({ ref: feature.ref, title: feature.title })),
      unknownColumns,
    },
  };
}

/** Reads nothing into the database — the preview is a pure calculation. */
export async function previewImport(projectId: string, csv: string): Promise<FeatureImportDiff> {
  const { diff } = await buildPlan(projectId, csv);
  return diff;
}

export async function commitImport(
  projectId: string,
  csv: string,
  acknowledgeSkipped: boolean,
): Promise<FeatureImportResult> {
  const { diff, valid, existingByRef } = await buildPlan(projectId, csv);

  if (valid.length === 0) {
    throw new ValidationError('There is nothing valid to import in this file.', {
      csv: 'Every row in the file failed validation.',
    });
  }

  if (diff.invalid.length > 0 && !acknowledgeSkipped) {
    throw new ValidationError(
      `${diff.invalid.length} row${diff.invalid.length === 1 ? '' : 's'} will be skipped. Confirm that before importing.`,
      { acknowledgeSkipped: 'Confirm that the invalid rows will be skipped.' },
    );
  }

  // Where each status column's ordering carries on from.
  const nextOrder = new Map<string, number>();
  for (const feature of existingByRef.values()) {
    nextOrder.set(feature.status, Math.max(nextOrder.get(feature.status) ?? 0, feature.order));
  }

  const session = await mongoose.startSession();
  let inserted = 0;
  let updated = 0;

  try {
    await session.withTransaction(async () => {
      inserted = 0;
      updated = 0;

      const idByRef = new Map<string, mongoose.Types.ObjectId>(
        [...existingByRef.entries()].map(([ref, feature]) => [
          ref,
          feature._id as mongoose.Types.ObjectId,
        ]),
      );

      // First pass writes the rows. Dependencies are resolved afterwards,
      // because a row may depend on another row in the same file.
      for (const row of valid) {
        const fields = {
          title: row.title,
          description: row.description,
          acceptanceCriteria: row.acceptanceCriteria,
          status: row.status,
          priority: row.priority,
          size: row.size,
          labels: row.labels,
          source: 'csv' as const,
          externalKey: row.ref,
        };

        const existing = existingByRef.get(row.ref);

        if (existing) {
          await FeatureModel.updateOne({ _id: existing._id }, { $set: fields }, { session });
          updated += 1;
          continue;
        }

        const order = (nextOrder.get(row.status) ?? 0) + FEATURE_ORDER_GAP;
        nextOrder.set(row.status, order);

        const [created] = await FeatureModel.create(
          [{ ...fields, projectId, ref: row.ref, order, completedAt: row.status === 'done' ? new Date() : null }],
          { session },
        );

        idByRef.set(row.ref, created!._id as mongoose.Types.ObjectId);
        inserted += 1;
      }

      // Second pass: refs become ids now that every row has one.
      for (const row of valid) {
        if (row.dependsOn.length === 0) continue;

        await FeatureModel.updateOne(
          { _id: idByRef.get(row.ref) },
          { $set: { dependsOnFeatureIds: row.dependsOn.map((ref) => idByRef.get(ref)!) } },
          { session },
        );
      }
    });
  } finally {
    await session.endSession();
  }

  // Once, after everything, rather than per row.
  await recomputeProjectRollup(projectId);

  return { inserted, updated, skipped: diff.invalid.length };
}
