import type { BootstrapImportDiff, BootstrapImportResult } from '@wroom/shared';

/**
 * The plan, as something a person reads before approving it.
 *
 * This is the gate in the whole flow. Claude.ai shows raw tool arguments before
 * a call, which tells you what was *sent*, not what it would *do* — the two
 * differ the moment anything already exists. So the preview comes back as text
 * laid out to be read, not JSON to be squinted at.
 */

function pluralise(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

export function renderPlan(diff: BootstrapImportDiff): string {
  const lines: string[] = [];

  lines.push('WOULD CREATE');
  if (diff.inserts.length === 0) {
    lines.push('  nothing — everything in this payload already exists');
  }
  for (const entry of diff.inserts) {
    lines.push(`  ${entry.kind.padEnd(7)} ${entry.ref}  —  ${entry.label}`);
  }

  lines.push('', 'WOULD UPDATE');
  if (diff.updates.length === 0) lines.push('  nothing');
  for (const entry of diff.updates) {
    lines.push(`  ${entry.kind.padEnd(7)} ${entry.ref}  —  ${entry.label}`);
    for (const change of entry.changes) {
      lines.push(`      ${change.field}: "${change.from}" -> "${change.to}"`);
    }
  }

  if (diff.unaffected.length > 0) {
    lines.push('', `UNCHANGED (${diff.unaffected.length})`);
    for (const entry of diff.unaffected) {
      lines.push(`  ${entry.kind.padEnd(7)} ${entry.ref}  —  ${entry.label}`);
    }
  }

  if (diff.invalid.length > 0) {
    lines.push('', `CANNOT BE IMPORTED (${diff.invalid.length})`);
    for (const row of diff.invalid) {
      const column = row.column ? ` [${row.column}]` : '';
      lines.push(`  features[${row.row}] ${row.ref}${column}: ${row.reason}`);
    }
    lines.push(
      '',
      'Commit will refuse while any of these are present. Fix them and preview again.',
    );
  }

  lines.push(
    '',
    diff.invalid.length > 0
      ? 'Nothing has been written. This payload cannot be committed as it stands.'
      : 'Nothing has been written yet. Committing applies exactly the above.',
  );

  return lines.join('\n');
}

export function renderResult(result: BootstrapImportResult): string {
  return [
    'WRITTEN',
    `  product   ${result.product}   [${result.productId}]`,
    `  project   ${result.project}   [${result.projectId}]`,
    `  features  ${pluralise(result.features.inserted, 'created')}, ${pluralise(result.features.updated, 'updated')}`,
    '',
    'The project rollup has been recomputed.',
    'Fill in the per-type details, environments and services in the portal.',
  ].join('\n');
}
