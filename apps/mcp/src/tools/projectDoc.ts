import { PROJECT_DOC_MAX_BODY_BYTES, type WorkMode } from '@wroom/shared';

import { get, post } from '../wroom/client.js';
import type { PortfolioTarget } from './portfolio.js';

/**
 * A hands-off project's CLAUDE.md, saved from a chat.
 *
 * Each commit is a new version — nothing here edits or deletes one. Once any
 * version has been pushed to the project's repo, the API refuses new ones, and
 * the repo copy is the real one (docs/DATA_MODEL.md, `projectDocs`).
 *
 * The API has no preview route for this, so the preview is put together from
 * two reads: the version list and the newest version's text. The commit still
 * goes through the API's own validation and numbering — what the preview says
 * is what it expects, not a promise. Two saves landing at once can move the
 * number on.
 */

/** A version as the list returns it — the body is left out there. */
type ApiDocSummary = { version: number; pushedAt: string | null };

type ApiDoc = ApiDocSummary & { body: string; source: string };

export type DocDraft = { slug: string; kind: string; body: string };

/** A project, with the mode the plan reports. */
export type DocTarget = PortfolioTarget & { workMode: WorkMode };

export type DocPlan = {
  target: DocTarget;
  kind: string;
  latestVersion: number | null;
  nextVersion: number;
  pushedVersion: number | null;
  oldLines: number | null;
  newLines: number;
  identical: boolean;
  bytes: number;
};

/** The payload split into what addresses the project and what gets saved. */
export function splitDocDraft(args: Record<string, unknown>): DocDraft {
  return {
    slug: typeof args.projectSlug === 'string' ? args.projectSlug.trim() : '',
    kind: typeof args.kind === 'string' ? args.kind : '',
    // Untouched: this is a file that will be committed, whitespace and all.
    body: typeof args.body === 'string' ? args.body : '',
  };
}

/** Lines as an editor counts them — a final newline does not start another. */
export function countLines(body: string): number {
  if (body === '') return 0;
  const lines = body.split(/\r?\n/);
  return lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
}

/** What saving would do. Reads, and writes nothing. */
export async function previewDoc(
  target: DocTarget,
  draft: DocDraft,
): Promise<DocPlan> {
  const kindQuery = `?kind=${encodeURIComponent(draft.kind)}`;
  const { data: versions } = await get<ApiDocSummary[]>(
    `/api/projects/${target.id}/docs${kindQuery}`,
  );

  // Newest first, as the API returns them.
  const latest = versions[0] ?? null;
  const pushed = versions.find((version) => version.pushedAt !== null) ?? null;

  let previous: ApiDoc | null = null;
  if (latest) {
    ({ data: previous } = await get<ApiDoc>(
      `/api/projects/${target.id}/docs/${latest.version}${kindQuery}`,
    ));
  }

  return {
    target,
    kind: draft.kind,
    latestVersion: latest?.version ?? null,
    nextVersion: (latest?.version ?? 0) + 1,
    pushedVersion: pushed?.version ?? null,
    oldLines: previous ? countLines(previous.body) : null,
    newLines: countLines(draft.body),
    identical: previous !== null && previous.body === draft.body,
    bytes: new TextEncoder().encode(draft.body).length,
  };
}

/** Saves the next version through the API, which numbers it. */
export async function commitDoc(target: PortfolioTarget, draft: DocDraft): Promise<ApiDoc> {
  const { data } = await post<ApiDoc>(`/api/projects/${target.id}/docs`, {
    kind: draft.kind,
    body: draft.body,
  });

  return data;
}

export function renderDocPlan(plan: DocPlan): string {
  const { target } = plan;
  const lines: string[] = [
    'PROJECT',
    `  ${target.name} (${target.slug})`,
    `  work mode  ${target.workMode}`,
  ];

  if (target.workMode !== 'hands-off') {
    lines.push(
      '  This project is managed, not hands-off. The version would still be saved,',
      '  but a managed project is planned in feature cards.',
    );
  }

  lines.push('', plan.kind === 'claude-md' ? 'CLAUDE.md' : plan.kind);

  if (plan.pushedVersion !== null) {
    lines.push(
      `  Version ${plan.pushedVersion} has already been pushed to the repo.`,
      '  This save would be refused: this CLAUDE.md now lives in the repo.',
      '',
      'Nothing has been written, and committing this would be refused.',
    );
    return lines.join('\n');
  }

  lines.push(
    plan.latestVersion === null
      ? '  would create  version 1 — the first one'
      : `  would create  version ${plan.nextVersion} (latest is ${plan.latestVersion})`,
    `  lines         ${plan.oldLines ?? 0} -> ${plan.newLines}`,
    `  size          ${Math.ceil(plan.bytes / 1000)}kB of ${PROJECT_DOC_MAX_BODY_BYTES / 1000}kB`,
  );

  if (plan.bytes > PROJECT_DOC_MAX_BODY_BYTES) {
    lines.push('  This is over the limit, and committing it would be refused.');
  }

  if (plan.identical) {
    lines.push(
      `  The text is identical to version ${plan.latestVersion}. Committing would still`,
      '  make a new version with the same text.',
    );
  }

  lines.push('', 'Nothing has been written yet. Committing saves exactly this text.');

  return lines.join('\n');
}

export function renderDocResult(target: PortfolioTarget, doc: ApiDoc): string {
  return [
    'SAVED',
    `  project  ${target.name} (${target.slug})`,
    `  version  ${doc.version}`,
    `  lines    ${countLines(doc.body)}`,
    '',
    'Nothing has been pushed to a repo.',
  ].join('\n');
}

/** The preview reports a missing project as part of the plan, not as a failure. */
export function renderDocNotFound(slug: string): string {
  return [
    'PROJECT',
    `  not found — there is no project with the slug "${slug}".`,
    '  `wroom_list_context` lists the slugs that exist.',
    '',
    'Nothing has been written, and committing this would be refused.',
  ].join('\n');
}
