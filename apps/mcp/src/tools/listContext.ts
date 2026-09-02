import { getAll } from '../wroom/client.js';

/**
 * What already exists, so a bootstrap payload can be written without colliding
 * with it: the products to hang a project off, the project type keys that are
 * valid, and the slugs already taken.
 *
 * **Everything here is projected down to an allowlist.** `/api` returns whole
 * documents and filters nothing: products carry `clientName`, `isClientWork`
 * and `ndaRestricted`, and projects carry the entire `portfolio` sub-document.
 * The three publish gates run at publish time, not on read, so nothing upstream
 * is going to keep an NDA client's name out of a chat transcript. The
 * allowlists below are the only thing that does — which is why they are
 * written as explicit field reads and not a delete-list. A field added to the
 * API later cannot leak through code that never asked for it.
 */

type ApiProduct = { _id: string; name: string; slug: string };
type ApiProjectType = { key: string; label: string };
type ApiProject = { name: string; slug: string };
type ApiMark = { key: string; kind: string; label: string; usageApproved: boolean };

export type ContextProduct = { _id: string; name: string; slug: string };
export type ContextProjectType = { key: string; label: string };
export type ContextProject = { name: string; slug: string };
export type ContextMark = { key: string; kind: string; label: string; usageApproved: boolean };

export type WroomContext = {
  products: ContextProduct[];
  projectTypes: ContextProjectType[];
  projects: ContextProject[];
  marks: ContextMark[];
};

export async function listContext(): Promise<WroomContext> {
  const [products, projectTypes, projects, marks] = await Promise.all([
    getAll<ApiProduct>('/api/products'),
    getAll<ApiProjectType>('/api/project-types'),
    // Archived projects still own their slugs, so they belong in a list whose
    // job is to say what is taken.
    getAll<ApiProject>('/api/projects?includeArchived=true'),
    getAll<ApiMark>('/api/media-library'),
  ]);

  return {
    products: products.map((product) => ({
      _id: product._id,
      name: product.name,
      slug: product.slug,
    })),
    projectTypes: projectTypes.map((projectType) => ({
      key: projectType.key,
      label: projectType.label,
    })),
    projects: projects.map((project) => ({ name: project.name, slug: project.slug })),
    // `svg` and `blobUrl` are deliberately not read. They are the mark itself —
    // markup sanitised on write for a render path that wraps it (CLAUDE.md
    // §7.3). A chat window is not that path, and a portfolio payload names a
    // mark by key, never by its contents.
    marks: marks.map((mark) => ({
      key: mark.key,
      kind: mark.kind,
      label: mark.label,
      usageApproved: mark.usageApproved,
    })),
  };
}

/** The same thing as something a person can read in a chat window. */
export function renderContext(context: WroomContext): string {
  const lines: string[] = [];

  lines.push(`PRODUCTS (${context.products.length})`);
  if (context.products.length === 0) lines.push('  none yet');
  for (const product of context.products) {
    lines.push(`  ${product.slug}  —  ${product.name}  [${product._id}]`);
  }

  lines.push('', `PROJECT TYPE KEYS (${context.projectTypes.length})`);
  if (context.projectTypes.length === 0) lines.push('  none yet');
  for (const projectType of context.projectTypes) {
    lines.push(`  ${projectType.key}  —  ${projectType.label}`);
  }

  lines.push('', `PROJECT SLUGS IN USE (${context.projects.length})`);
  if (context.projects.length === 0) lines.push('  none yet');
  for (const project of context.projects) {
    lines.push(`  ${project.slug}  —  ${project.name}`);
  }

  lines.push('', `MEDIA LIBRARY KEYS (${context.marks.length})`);
  if (context.marks.length === 0) lines.push('  none yet');
  for (const [kind, marks] of groupByKind(context.marks)) {
    lines.push(`  ${kind}`);
    for (const mark of marks) {
      // Not usage-approved is the trademark gate, and the publish action drops
      // such a mark silently. Saying so here is the difference between a key
      // that does nothing and one somebody notices is missing months later.
      const approved = mark.usageApproved ? '' : '   [not usage-approved — do not use]';
      lines.push(`    ${mark.key}  —  ${mark.label}${approved}`);
    }
  }

  lines.push(
    '',
    'A product or project slug listed above already exists. Reusing one updates',
    'that record rather than creating a new one.',
    '',
    'Media library keys are the only values accepted by techStackKeys,',
    'platformKeys and a feature card\'s iconKey. A key that is not on this list',
    'is dropped at publish without an error, so never invent one — if a mark is',
    'missing, it has to be added in the portal first.',
  );

  return lines.join('\n');
}

/** Marks grouped by kind, kinds in the order they first appear. */
function groupByKind(marks: ContextMark[]): [string, ContextMark[]][] {
  const groups = new Map<string, ContextMark[]>();

  for (const mark of marks) {
    const group = groups.get(mark.kind);
    if (group) group.push(mark);
    else groups.set(mark.kind, [mark]);
  }

  return [...groups.entries()];
}
