import {
  PUBLISH_GATE_MESSAGES,
  type BootstrapImportDiff,
  type BootstrapImportResult,
  type PortfolioUpdateDiff,
  type PublishGateResult,
} from '@wroom/shared';

import type { PortfolioTarget } from './portfolio.js';

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

/**
 * Where a project stands with the three gates, in words.
 *
 * Every portfolio answer carries this. Writing the copy is the part that looks
 * like publishing and is not it, and the one thing a person must not have to
 * infer is whether what they just approved is now on the public internet.
 */
function publishLines(
  publishState: PublishGateResult | null,
  blockingProductName: string | null,
): string[] {
  if (!publishState) {
    return ['PUBLISH STATE', '  Not reported. Check the project in the portal.'];
  }

  if (publishState.publishable) {
    return [
      'PUBLISH STATE',
      '  This project is marked public, so it is eligible.',
      '  Nothing here reaches the site until somebody publishes it in the portal.',
    ];
  }

  const lines = ['PUBLISH STATE', '  This project is not on the public site.'];

  for (const reason of publishState.blockedBy) {
    // The gate's own wording (CLAUDE.md §8) — never a sentence written here.
    lines.push(`    ${PUBLISH_GATE_MESSAGES[reason]}`);
  }

  if (blockingProductName) lines.push(`    The blocking product is ${blockingProductName}.`);

  return lines;
}

/** The project a portfolio answer is about. */
function targetLine(label: string, target: PortfolioTarget): string {
  return `${label}  ${target.slug}  —  ${target.name}`;
}

/**
 * The portfolio plan, as something a person reads before approving it.
 *
 * The same reasoning as `renderPlan`: raw tool arguments say what was sent, and
 * what a payload would *do* is a different thing the moment the project already
 * has copy on it. A field already holding the value being sent does not appear
 * here at all — the API leaves it out of the diff.
 */
export function renderPortfolioPlan(
  target: PortfolioTarget,
  diff: PortfolioUpdateDiff,
): string {
  const lines: string[] = [targetLine('PROJECT', target), '', 'WOULD CHANGE'];

  if (diff.changes.length === 0) {
    lines.push('  nothing — the page already says all of this');
  }

  const width = Math.max(0, ...diff.changes.map((change) => change.field.length));

  // Unquoted, unlike the bootstrap plan: a value here may be a summary of a
  // list rather than the literal string being written, and quoting a summary
  // reads as though those characters are what would be saved.
  for (const change of diff.changes) {
    lines.push(`  ${change.field.padEnd(width)}  ${change.from}  ->  ${change.to}`);
  }

  lines.push('', ...publishLines(diff.publishState, diff.blockingProductName));

  lines.push(
    '',
    diff.changes.length === 0
      ? 'Nothing has been written, and committing this would change nothing.'
      : 'Nothing has been written yet. Committing applies exactly the above.',
  );

  return lines.join('\n');
}

/** What the commit wrote, and the reminder that writing is not publishing. */
export function renderPortfolioResult(
  target: PortfolioTarget,
  fields: string[],
  publishState: PublishGateResult | null,
  blockingProductName: string | null,
): string {
  const lines: string[] = [
    'WRITTEN',
    `  ${targetLine('project', target)}`,
    `  fields   ${fields.length === 0 ? 'none' : fields.join(', ')}`,
    '',
    ...publishLines(publishState, blockingProductName),
    '',
    'Nothing has been published. Images, visibility and the publish itself are',
    'done in the portal.',
  ];

  return lines.join('\n');
}
