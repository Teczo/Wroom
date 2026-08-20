import { PublishedProjectModel } from '../models/PublishedProject.js';

/**
 * The ids of currently published projects, held in memory.
 *
 * This exists because of a genuine tension: an enquiry should record which
 * case study it came from, but CLAUDE.md §8 says the enquiry route must read no
 * collection at all, and that rule is worth more than the field is.
 *
 * So the read happens somewhere else. This set is filled at boot and refreshed
 * on a timer, never inside a request, and the enquiry route asks it a question
 * that costs a hash lookup. The rule holds literally — no request to
 * `/public/enquiries` touches the database except to insert the enquiry — and
 * the field still means something.
 *
 * The cost is staleness: a project published a moment ago is not in the set
 * until the next refresh, so an enquiry sent from it stores null. That is the
 * right way round. A missing hint is a small loss; a public route that reads
 * collections is the thing the rule exists to prevent.
 */
const REFRESH_INTERVAL_MS = 60_000;

let publishedIds = new Set<string>();
let timer: ReturnType<typeof setInterval> | null = null;

export async function refreshPublishedProjectIds(): Promise<number> {
  const rows = await PublishedProjectModel.find().select({ projectId: 1, _id: 0 }).lean();

  publishedIds = new Set(rows.map((row) => String(row.projectId)));
  return publishedIds.size;
}

/**
 * Memory only. This is the function the enquiry route calls, and it must stay
 * synchronous and database-free — if it ever needs to await something, the
 * design above has been broken.
 */
export function isPublishedProjectId(id: string): boolean {
  return id !== '' && publishedIds.has(id);
}

export async function startPublishedProjectCache(): Promise<void> {
  await refreshPublishedProjectIds();

  timer ??= setInterval(() => {
    void refreshPublishedProjectIds().catch((error: unknown) => {
      // A failed refresh keeps the previous set rather than emptying it: stale
      // is better than treating every project as unpublished.
      console.error('[cache] could not refresh published project ids', error);
    });
  }, REFRESH_INTERVAL_MS);

  // Do not hold the process open for a cache.
  timer.unref?.();
}

export function stopPublishedProjectCache(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
