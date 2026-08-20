import type { Infer, siteContentDraftShape } from '@wroom/shared';
import type { Types } from 'mongoose';

import { SiteContentModel, type SiteContentDocument } from '../models/SiteContent.js';
import { NotFoundError } from '../utils/errors.js';

type DraftInput = Infer<typeof siteContentDraftShape>;

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
 */

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
    },
    updatedByUserId,
  });

  await record.save();
  return record;
}

/**
 * Copies the draft onto the live site. A plain object is taken from the draft
 * so the two halves stay independent documents — editing the draft afterwards
 * must not quietly change what is published.
 */
export async function publishSiteContent(
  key: string,
  publishedByUserId: Types.ObjectId,
): Promise<SiteContentDocument> {
  const record = await getSiteContent(key);

  const draft = record.draft;

  record.set({
    published: {
      title: draft.title,
      body: draft.body,
      meta: { title: draft.meta.title, description: draft.meta.description },
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
