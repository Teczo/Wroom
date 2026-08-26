import type { Infer, siteContentDraftShape } from '@wroom/shared';
import type { Types } from 'mongoose';

import { SiteContentModel, type SiteContentDocument } from '../models/SiteContent.js';
import { NotFoundError } from '../utils/errors.js';
import { resolveMarks } from './mediaLibraryService.js';

type DraftInput = Infer<typeof siteContentDraftShape> & { data: Record<string, unknown> };

/**
 * Portfolio page copy, with the same draft/published split as projects.
 *
 * Saving writes `draft` and changes nothing the public site can see.
 * Publishing copies `draft` into `published`. Those are the only two writers,
 * and keeping them apart here is what lets the editor be used on a half-written
 * page without that page appearing anywhere.
 *
 * `key` is not creatable: the seeded records are the whole set, so there is no
 * path in this module that inserts one.
 *
 * Publishing does one thing beyond the copy: it resolves the page's
 * `mediaLibrary` keys into `published.data.marks`. The portfolio may never read
 * `mediaLibrary` (§6, §8), so a social row or a skills grid has icons only if
 * the publish action put them there — the same reasoning, and the same
 * `resolveMarks` call, as a project's tech stack.
 */

/**
 * Every `mediaLibrary` key a page's `data` names, in the order it names them.
 *
 * Shape-led rather than key-led: it looks for the two places a key can appear —
 * a social row and a skills group — wherever they occur, so a page that grows a
 * social row needs nothing added here. `data` is a stored blob rather than a
 * parsed one, so every step checks what it has before reading through it.
 *
 * Deduplicated, because a mark named twice is one lookup and one entry.
 */
function collectMediaKeys(data: Record<string, unknown>): string[] {
  const keys: string[] = [];

  const push = (value: unknown) => {
    if (typeof value === 'string' && value !== '') keys.push(value);
  };

  const rowsOf = (value: unknown): Record<string, unknown>[] =>
    Array.isArray(value)
      ? value.filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null)
      : [];

  for (const social of rowsOf(data.socials)) push(social.mediaKey);

  for (const group of rowsOf(data.groups)) {
    for (const item of rowsOf(group.items)) push(item.mediaKey);
  }

  return [...new Set(keys)];
}

/**
 * A stored blob without the fields the publish action owns.
 *
 * `marks` is written by publishing and by nothing else. Stripping it on the way
 * in is what makes that true: without this, a request body could put arbitrary
 * markup in a draft, and the one thing standing between `mediaLibrary` and a
 * page that renders markup is that the markup always came from `mediaLibrary`
 * (§8).
 */
function withoutResolvedMarks(data: Record<string, unknown>): Record<string, unknown> {
  const { marks: _resolved, ...rest } = data;
  return rest;
}

export type SiteContentSummaryRow = {
  _id: Types.ObjectId;
  key: string;
  isPublished: boolean;
  updatedAt: Date;
};

export async function listSiteContent(): Promise<SiteContentSummaryRow[]> {
  const records = await SiteContentModel.find()
    .select({ key: 1, published: 1, updatedAt: 1 })
    .sort({ key: 1 })
    .lean();

  // `published` is read to answer "is it live" and goes no further — the list
  // carries which page, whether it is live, and when it was last edited.
  return records.map((record) => ({
    _id: record._id,
    key: record.key,
    isPublished: record.published !== null,
    updatedAt: record.updatedAt,
  }));
}

export async function getSiteContent(key: string): Promise<SiteContentDocument> {
  const record = await SiteContentModel.findOne({ key });
  if (!record) throw new NotFoundError('That content record');
  return record;
}

/**
 * Writes the draft. Every field is optional, and an empty string is a real
 * value — clearing a meta description has to be possible.
 */
export async function updateDraft(
  key: string,
  input: Partial<DraftInput>,
  updatedByUserId: Types.ObjectId,
): Promise<SiteContentDocument> {
  const record = await getSiteContent(key);

  record.set({
    draft: {
      title: input.title ?? record.draft.title,
      body: input.body ?? record.draft.body,
      meta: input.meta ?? {
        title: record.draft.meta.title,
        description: record.draft.meta.description,
      },
      // Replaced whole, never merged. `data` is one page's structured content
      // and is edited as a unit, so a partial merge would leave a half-old
      // half-new object that matches no version anyone reviewed.
      data: withoutResolvedMarks(input.data ?? record.draft.data ?? {}),
    },
    updatedByUserId,
  });

  await record.save();
  return record;
}

/**
 * Copies the draft onto the live site, resolving its marks on the way.
 *
 * A plain object is taken from the draft so the two halves stay independent
 * documents — editing the draft afterwards must not quietly change what is
 * published.
 *
 * `marks` is rebuilt from the library on every publish and never carried over
 * from what was there before. A mark whose approval was withdrawn therefore
 * leaves the live page at the next publish, rather than surviving because it
 * was already written down.
 */
export async function publishSiteContent(
  key: string,
  publishedByUserId: Types.ObjectId,
): Promise<SiteContentDocument> {
  const record = await getSiteContent(key);

  const draft = record.draft;
  const draftData = withoutResolvedMarks(draft.data ?? {});

  // Dropped silently when the key has no record or its usage was never
  // approved, which is what `resolveMarks` already does for a project. A
  // withheld trademark costs the page one icon; it does not stop the publish
  // (docs/DATA_MODEL.md, §8).
  const marks = await resolveMarks(collectMediaKeys(draftData));

  record.set({
    published: {
      title: draft.title,
      body: draft.body,
      meta: { title: draft.meta.title, description: draft.meta.description },
      // Deep-copied so the two halves stay independent documents. A shared
      // reference would mean editing the draft afterwards silently changed what
      // is published, which is the one thing the split exists to prevent.
      data: { ...structuredClone(draftData), marks },
    },
    publishedAt: new Date(),
    publishedByUserId,
  });

  await saveWithoutTouchingUpdatedAt(record);
  return record;
}

/**
 * Takes the page off the live site. The draft is left exactly as it is, so
 * unpublishing loses nothing and republishing needs no retyping.
 *
 * Doing this to a record that is already unpublished succeeds and changes
 * nothing, because "there is no published copy" is the state being asked for
 * and it is already the state.
 */
export async function unpublishSiteContent(key: string): Promise<SiteContentDocument> {
  const record = await getSiteContent(key);

  record.set({ published: null, publishedAt: null, publishedByUserId: null });

  await saveWithoutTouchingUpdatedAt(record);
  return record;
}

/**
 * `updatedAt` means "last edited", and the portal shows it under that name.
 * Publishing is not an edit — it changes no words — so it leaves the timestamp
 * alone and records its own moment in `publishedAt` instead.
 */
async function saveWithoutTouchingUpdatedAt(record: SiteContentDocument): Promise<void> {
  await record.save({ timestamps: false });
}
