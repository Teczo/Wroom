/**
 * Which ticket was copied last, remembered per project.
 *
 * This lives in the browser rather than on the feature. It is a private note
 * about what you were doing a minute ago, not a fact about the project — so it
 * follows the tab, not the account. Copy on a laptop and the phone will not
 * know about it.
 */

export type LastCopied = { featureId: string; copiedAt: string };

const keyFor = (projectId: string) => `wroom.last-copied-feature.${projectId}`;

function isLastCopied(value: unknown): value is LastCopied {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.featureId === 'string' && typeof candidate.copiedAt === 'string';
}

/**
 * Storage throws in a private window and when the user has blocked it, so every
 * read and write is guarded. A board with no storage simply shows no mark.
 */
export function readLastCopied(projectId: string): LastCopied | null {
  try {
    const raw = window.localStorage.getItem(keyFor(projectId));
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return isLastCopied(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Returns the entry either way — a failed write still marks the card on screen. */
export function writeLastCopied(projectId: string, featureId: string): LastCopied {
  const entry: LastCopied = { featureId, copiedAt: new Date().toISOString() };

  try {
    window.localStorage.setItem(keyFor(projectId), JSON.stringify(entry));
  } catch {
    // The mark then lasts for this page view only, which is still the useful part.
  }

  return entry;
}

/**
 * Minutes matter here in a way they do not elsewhere in the portal, so this is
 * finer than `relativeDate` — the whole question is whether you copied this one
 * just now or hours ago.
 */
export function sinceCopied(copiedAt: string): string {
  const seconds = Math.floor((Date.now() - new Date(copiedAt).getTime()) / 1000);
  if (!Number.isFinite(seconds) || seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}
