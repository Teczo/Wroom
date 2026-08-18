import type { FieldDefType } from '@wroom/shared';

import { ProjectTypeModel, type ProjectTypeDocument } from '../models/ProjectType.js';
import { NotFoundError, UnprocessableError } from '../utils/errors.js';

export async function listProjectTypes(includeInactive = false): Promise<ProjectTypeDocument[]> {
  const filter = includeInactive ? {} : { active: true };
  return ProjectTypeModel.find(filter).sort({ sortOrder: 1, label: 1 });
}

export async function getProjectTypeByKey(key: string): Promise<ProjectTypeDocument> {
  const projectType = await ProjectTypeModel.findOne({ key });
  if (!projectType) throw new NotFoundError(`Project type '${key}'`);
  return projectType;
}

function describeType(type: FieldDefType): string {
  switch (type) {
    case 'number':
      return 'a number';
    case 'boolean':
      return 'true or false';
    case 'multiselect':
      return 'a list of the allowed options';
    case 'date':
      return 'a date';
    case 'url':
      return 'a URL';
    default:
      return 'text';
  }
}

function valueMatchesType(value: unknown, type: FieldDefType, options: string[]): boolean {
  switch (type) {
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'select':
      return typeof value === 'string' && (options.length === 0 || options.includes(value));
    case 'multiselect':
      return (
        Array.isArray(value) &&
        value.every(
          (entry) =>
            typeof entry === 'string' && (options.length === 0 || options.includes(entry)),
        )
      );
    case 'date':
      return typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
    case 'url':
      if (typeof value !== 'string') return false;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    default:
      return typeof value === 'string';
  }
}

function isVisible(
  showIf: { field: string; equals?: unknown } | null | undefined,
  details: Record<string, unknown>,
): boolean {
  if (!showIf) return true;
  return details[showIf.field] === showIf.equals;
}

/**
 * Validates `projects.details` against the project type's `fieldDefs`.
 *
 * This is the schema-driven half of the form contract: the portal renders from
 * the same definitions, so the two cannot drift. Keys with no matching fieldDef
 * are dropped rather than stored.
 */
export async function validateProjectDetails(
  projectTypeKey: string,
  details: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const projectType = await getProjectTypeByKey(projectTypeKey);

  const clean: Record<string, unknown> = {};
  const problems: Record<string, string> = {};

  for (const fieldDef of projectType.fieldDefs) {
    const { key, label, type, options, required } = fieldDef;
    if (!isVisible(fieldDef.showIf, details)) continue;

    const value = details[key];
    const isEmpty =
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0);

    if (isEmpty) {
      if (required) problems[`details.${key}`] = `${label} is required.`;
      continue;
    }

    if (!valueMatchesType(value, type as FieldDefType, options)) {
      problems[`details.${key}`] = `${label} must be ${describeType(type as FieldDefType)}.`;
      continue;
    }

    clean[key] = value;
  }

  if (Object.keys(problems).length > 0) {
    throw new UnprocessableError(
      `Some ${projectType.label} fields need attention.`,
      problems,
    );
  }

  return clean;
}
