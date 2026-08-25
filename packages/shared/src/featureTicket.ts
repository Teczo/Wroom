/**
 * The ticket a feature card renders.
 *
 * Everything a Claude Code session needs to start a feature is already on the
 * card and on its project — the ref, the scope, what it waits on, the stack it
 * runs on, the repo it lives in. This renders that into the text that would
 * otherwise be typed out by hand every time. It is string templating and
 * nothing else: no request, no model, nothing stored.
 *
 * The input types are declared here and name only the fields actually read, so
 * this module does not churn every time `Feature` or `Project` grows a field.
 */

/** Enough of a feature to be the subject of a ticket. */
export type FeatureTicketFeature = {
  ref: string;
  title: string;
  description?: string | null;
  acceptanceCriteria?: string | null;
  priority?: string | null;
  size?: string | null;
  labels?: readonly string[] | null;
};

/** Enough of a feature to be listed as a dependency or a sibling. */
export type FeatureTicketRelated = {
  ref: string;
  title: string;
  status?: string | null;
};

/** Enough of a project to say where the work happens and what it is built on. */
export type FeatureTicketProject = {
  name: string;
  shortDescription?: string | null;
  repo?: { fullName?: string | null; defaultBranch?: string | null } | null;
  techStack?: {
    frontend?: readonly string[] | null;
    backend?: readonly string[] | null;
    database?: readonly string[] | null;
    other?: readonly string[] | null;
  } | null;
};

export type FeatureTicketInput = {
  feature: FeatureTicketFeature;
  project: FeatureTicketProject;
  /** Every other feature on the project — done ones included (see OUT OF SCOPE). */
  siblings: readonly FeatureTicketRelated[];
  /** What this feature waits on, already resolved from `dependsOnFeatureIds`. */
  deps: readonly FeatureTicketRelated[];
};

/**
 * A gap is more useful than a guess. An empty description means nobody has
 * written the scope yet, and the agent reading this needs to see that rather
 * than a plausible sentence assembled from the title.
 */
const NOTHING_WRITTEN = '(none written)';

/** Branch names stay typeable — a slug past this is a title, not a name. */
const MAX_SLUG_LENGTH = 48;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * The `feat/<REF>-<slug>` convention from CLAUDE.md §2.2. The ref keeps the
 * case it was entered in — refs are upper case by convention and a branch that
 * does not match the card is worse than a long one.
 */
export function featureBranchName(feature: { ref: string; title: string }): string {
  const ref = feature.ref.trim();
  const slug = slugify(feature.title).slice(0, MAX_SLUG_LENGTH).replace(/-+$/, '');

  return slug === '' ? `feat/${ref}` : `feat/${ref}-${slug}`;
}

/** Free text goes in as written, with only line endings and outer space made uniform. */
function block(value: string | null | undefined): string {
  const text = (value ?? '').replace(/\r\n/g, '\n').trim();
  return text === '' ? NOTHING_WRITTEN : text;
}

/** `PROJECT   Wroom` — one label column, wide enough for the longest label. */
function labelledLines(rows: readonly { label: string; value: string }[]): string[] {
  const width = Math.max(...rows.map((row) => row.label.length)) + 2;
  return rows.map((row) => `${row.label.padEnd(width)}${row.value}`);
}

/** `  WRM-011  Feature CSV import  [done]`, refs aligned down the list. */
function relatedLines(items: readonly FeatureTicketRelated[]): string[] {
  const width = Math.max(...items.map((item) => item.ref.length));

  return items.map((item) => {
    const status = item.status ? `  [${item.status}]` : '';
    return `  ${item.ref.padEnd(width)}  ${item.title}${status}`;
  });
}

/** Groups are joined with a middot so the four parts of the stack stay readable. */
function stackSummary(project: FeatureTicketProject): string {
  const stack = project.techStack;
  const groups = [stack?.frontend, stack?.backend, stack?.database, stack?.other]
    .map((group) => (group ?? []).filter((entry) => entry.trim() !== '').join(', '))
    .filter((group) => group !== '');

  return groups.length === 0 ? '(not recorded)' : groups.join(' · ');
}

function repoSummary(project: FeatureTicketProject): string {
  const fullName = project.repo?.fullName?.trim() ?? '';
  if (fullName === '') return '(not recorded)';

  const defaultBranch = project.repo?.defaultBranch?.trim() ?? '';
  return defaultBranch === '' ? fullName : `${fullName} — branch from ${defaultBranch}`;
}

/** The card's own metadata, as one line. Absent everywhere means no line at all. */
function cardSummary(feature: FeatureTicketFeature): string | null {
  const labels = (feature.labels ?? []).filter((label) => label.trim() !== '');
  const parts = [
    feature.priority ? `priority ${feature.priority}` : null,
    feature.size ? `size ${feature.size}` : null,
    labels.length > 0 ? `labels ${labels.join(', ')}` : null,
  ].filter((part): part is string => part !== null);

  return parts.length === 0 ? null : parts.join(' · ');
}

/**
 * Constant. Every ticket carries the same working rules, because the session
 * reading it starts with no memory of the last one.
 */
const HOW_TO_WORK = [
  'Read CLAUDE.md at the root of the repo before you touch anything. It is the',
  'constitution: the stack is locked, and its rules outrank this ticket.',
  '',
  'Build only what SCOPE asks for. No adjacent improvements, nothing "while I',
  'was in there" — write those in NOTICED instead.',
  '',
  'Do not add a dependency. If you believe the work needs one, say what and why,',
  'and stop.',
  '',
  'If a fix has failed twice, stop and report. Do not try a third approach, do',
  'not work around it, do not quietly stub it out.',
  '',
  'Work on the branch named above. Commit and push it.',
  '',
  'Finish with a report:',
  '  DONE      — what someone can now do that they could not before',
  '  NOT DONE  — anything in SCOPE you did not finish, and why',
  '  BLOCKED   — what stopped you, and what you need to continue',
  '  NOTICED   — worth doing later; do not do it now',
].join('\n');

/**
 * The whole ticket, as one string.
 *
 * Deterministic: the same card renders the same text every time. Nothing here
 * reads a clock, a random value or anything outside its input.
 */
export function renderFeatureTicket(input: FeatureTicketInput): string {
  const { feature, project, siblings, deps } = input;

  // A title is required on the card, but a ref with a dangling dash after it
  // would be the one thing here that reads as broken rather than as a gap.
  const title = feature.title.trim();
  const heading = title === '' ? feature.ref : `${feature.ref} — ${title}`;

  const rows = [
    { label: 'PROJECT', value: project.name },
    { label: 'REPO', value: repoSummary(project) },
    { label: 'STACK', value: stackSummary(project) },
    { label: 'BRANCH', value: featureBranchName(feature) },
  ];

  const card = cardSummary(feature);
  if (card !== null) rows.push({ label: 'CARD', value: card });

  const sections: string[] = [heading, labelledLines(rows).join('\n')];

  const about = (project.shortDescription ?? '').replace(/\r\n/g, '\n').trim();
  if (about !== '') sections.push(`ABOUT THE PROJECT\n${about}`);

  sections.push(`SCOPE\n${block(feature.description)}`);
  sections.push(`EXIT CRITERIA\n${block(feature.acceptanceCriteria)}`);

  // Unmet dependencies are shown, never filtered out. A ticket that quietly
  // dropped them would read as buildable when it is not.
  if (deps.length === 0) {
    sections.push('DEPENDS ON\nNothing. This one can be built on its own.');
  } else {
    const unmet = deps.filter((dep) => dep.status !== 'done');
    const warning =
      unmet.length === 0
        ? ''
        : `\n\n${unmet.map((dep) => dep.ref).join(', ')} ${
            unmet.length === 1 ? 'is' : 'are'
          } not done. Stop and report rather than building around ${
            unmet.length === 1 ? 'it' : 'them'
          }.`;

    sections.push(`DEPENDS ON\n${relatedLines(deps).join('\n')}${warning}`);
  }

  // Done siblings stay on this list: finished means "already exists, do not
  // rebuild it", which is as much a boundary as "someone else's ticket".
  const outOfScope =
    siblings.length === 0
      ? 'Nothing else — this is the only feature on the project.'
      : relatedLines(siblings).join('\n');

  sections.push(
    'OUT OF SCOPE\n' +
      'These are separate features with their own tickets. Do not build them, and\n' +
      'do not rebuild the ones already done.\n' +
      outOfScope,
  );

  sections.push(`HOW TO WORK\n${HOW_TO_WORK}`);

  return `${sections.join('\n\n')}\n`;
}
