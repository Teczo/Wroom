import { FEATURE_CSV_COLUMNS } from './types.js';

/**
 * The importable template.
 *
 * Built from `FEATURE_CSV_COLUMNS` — the same constant the importer validates
 * headers against — so the file people download and the file the API accepts
 * cannot drift apart.
 */

export const FEATURE_CSV_TEMPLATE_FILENAME = 'wroom-features-template.csv';

/**
 * One obviously fictional row, using valid enum values and showing the
 * semicolon format for a multi-value cell.
 *
 * `dependsOn` is deliberately empty: a ref in that cell has to resolve to
 * another row in the file or a feature already on the project, and a one-row
 * template has nothing for it to point at — filling it in would make the
 * template fail its own importer. The portal's help text explains the format
 * instead.
 */
const EXAMPLE_ROW: Record<string, string> = {
  ref: 'EXAMPLE-001',
  title: 'Replace this row with your own',
  description: 'Longer detail goes here. Commas are fine inside a quoted cell.',
  acceptanceCriteria: 'What has to be true before this counts as done.',
  status: 'backlog',
  priority: 'medium',
  size: 'm',
  labels: 'example;delete-me',
  dependsOn: '',
};

/** Wraps a cell only when it needs it, and doubles any quote inside. */
function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function buildFeatureCsvTemplate(): string {
  const header = FEATURE_CSV_COLUMNS.join(',');
  const example = FEATURE_CSV_COLUMNS.map((column) => csvCell(EXAMPLE_ROW[column] ?? '')).join(',');

  return `${header}\n${example}\n`;
}
