import type { PortfolioUpdateDiff, PublishGateResult } from '@wroom/shared';

import { getAll, patch, post } from '../wroom/client.js';

/**
 * Drafting a project's public page from a chat.
 *
 * This writes `projects.portfolio` — the copy the publish action later
 * snapshots — and nothing else. It cannot publish, it cannot change a
 * project's visibility, and it cannot attach an image. A project drafted here
 * is still private when the call returns, and stays that way until somebody
 * publishes it in the portal (CLAUDE.md §8).
 *
 * The pair mirrors the bootstrap importer: preview plans, commit writes, and
 * the commit re-sends the payload to the API rather than trusting anything the
 * preview handed back.
 */

/** Enough of a project to address it and to name it in a plan. */
export type PortfolioTarget = { id: string; slug: string; name: string };

type ApiProjectRef = { _id: string; slug: string; name: string };

/** The `meta` the portfolio save answers with. */
type SaveMeta = { publishState: PublishGateResult; blockingProductName: string | null };

/**
 * The project named by the payload, and the fields it would write.
 *
 * `projectSlug` addresses the project and is not part of the body — the API
 * takes an id in the path and would drop an unknown key silently, which is the
 * one failure mode a payload this size must not have.
 */
export function splitDraft(args: Record<string, unknown>): {
  slug: string;
  fields: Record<string, unknown>;
} {
  const { projectSlug, ...fields } = args;

  return {
    slug: typeof projectSlug === 'string' ? projectSlug.trim() : '',
    fields,
  };
}

/**
 * A slug resolved to the id the API's routes take.
 *
 * The list is the one `wroom_list_context` already reads, archived projects
 * included: a project can be drafted while archived, and answering "no such
 * project" for one that plainly exists would be the more confusing failure.
 * Returns null rather than throwing, so the caller can say which slugs exist.
 */
export async function findProject(slug: string): Promise<PortfolioTarget | null> {
  const projects = await getAll<ApiProjectRef>('/api/projects?includeArchived=true');
  const match = projects.find((project) => project.slug === slug);

  return match ? { id: String(match._id), slug: match.slug, name: match.name } : null;
}

/** What the draft would change. Writes nothing. */
export async function previewDraft(
  target: PortfolioTarget,
  fields: Record<string, unknown>,
): Promise<PortfolioUpdateDiff> {
  const { data } = await post<PortfolioUpdateDiff>(
    `/api/projects/${target.id}/portfolio/preview`,
    fields,
  );

  return data;
}

/**
 * Writes the draft, and reports the gate verdict the save answers with.
 *
 * Null when the route answered without one. The verdict is what says the
 * project is still private, so a missing one is reported as missing rather
 * than replaced with a guess.
 */
export async function commitDraft(
  target: PortfolioTarget,
  fields: Record<string, unknown>,
): Promise<SaveMeta | null> {
  const { meta } = await patch<unknown, SaveMeta>(
    `/api/projects/${target.id}/portfolio`,
    fields,
  );

  return meta ?? null;
}
