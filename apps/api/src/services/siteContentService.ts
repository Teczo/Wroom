import {
  PUBLISH_GATE_MESSAGES,
  checkSiteAssetGates,
  type Infer,
  type Visibility,
  type siteContentDraftShape,
} from '@wroom/shared';
import type { Types } from 'mongoose';

import { AssetModel } from '../models/Asset.js';
import { SiteContentModel, type SiteContentDocument } from '../models/SiteContent.js';
import { NotFoundError, UnprocessableError } from '../utils/errors.js';
import { copyToPublic, publicImageOf, removeFromPublic } from './assetService.js';
import { resolveMarks } from './mediaLibraryService.js';
import { deletePublicBlob, publicBlobNameFromUrl } from './uploadService.js';

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
 * Publishing does two things beyond the copy, and both exist because the
 * portfolio may read neither `mediaLibrary` nor `assets` (§6, §8):
 *
 * - it resolves the page's `mediaLibrary` keys into `published.data.marks`, the
 *   same `resolveMarks` call a project's tech stack goes through;
 * - it copies the page's portrait and its CV into the public container and
 *   writes the resulting URLs into `published.data.portrait` and
 *   `published.data.cv`, the same order a project publish uses — gate, copy,
 *   then write (docs/DATA_MODEL.md, "Publishing").
 *
 * Unpublishing reverses the copy before clearing the record, because deleting
 * the blob is what revokes access; removing the row only stops it being linked.
 */

/**
 * Every `mediaLibrary` key a page's `data` names, in the order it names them.
 *
 * Shape-led rather than key-led: it looks for the places a key can appear — a
 * social row, a skills group, the landing page's tech row and its stat band —
 * wherever they occur, so a page that grows a social row needs nothing added
 * here. `data` is a stored blob rather than a parsed one, so every step checks
 * what it has before reading through it.
 *
 * A field added to a page's schema that names a mark has to be added here too,
 * or it publishes with nothing in `marks` and the page draws a blank where the
 * icon was meant to be.
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

  // The landing page's tech row is a bare list of keys rather than rows.
  if (Array.isArray(data.techMarks)) for (const key of data.techMarks) push(key);

  for (const stat of rowsOf(data.stats)) push(stat.mediaKey);

  return [...new Set(keys)];
}

/**
 * A stored blob without the fields the publish action owns.
 *
 * `marks`, `portrait` and `cv` are written by publishing and by nothing else.
 * Stripping them on the way in is what makes that true: without this, a request
 * body could put arbitrary markup in a draft, or point a public page at a blob
 * no gate ever saw. The one thing standing between the library and a page that
 * renders markup — and between the private container and a public URL — is that
 * both always came from the publish action (§8).
 */
function withoutResolvedFields(data: Record<string, unknown>): Record<string, unknown> {
  const { marks: _marks, portrait: _portrait, cv: _cv, ...rest } = data;
  return rest;
}

/** The URL a stored `data.portrait` or `data.cv` points at, if it has one. */
function publicUrlAt(data: unknown, field: 'portrait' | 'cv'): string | null {
  const held = (data as Record<string, { url?: unknown } | undefined> | undefined)?.[field];
  return typeof held?.url === 'string' && held.url !== '' ? held.url : null;
}

/**
 * Copies a page's portrait into the public container and describes it.
 *
 * The gate is `checkSiteAssetGates` — a site asset has no project and no
 * product, so its own visibility is the whole of it, and that comparison lives
 * in `packages/shared/src/publish.ts` rather than here (§8). `copyToPublic`
 * checks it a second time on its own account; this call exists so the refusal
 * names the page and the fix rather than coming back as a bare 403.
 *
 * A portrait that cannot be published stops the publish. Copy is not worth
 * shipping with a silent hole where a picture was meant to be, and both causes
 * — the record is gone, or it is still private — are one edit away from fixed.
 */
async function resolvePortrait(assetId: unknown): Promise<Record<string, unknown> | null> {
  if (typeof assetId !== 'string' || assetId === '') return null;

  // Site assets only. A project's asset answers to three gates and belongs to
  // that project's page, so naming one here would be a way around them.
  const asset = await AssetModel.findOne({ _id: assetId, projectId: null });

  if (!asset) {
    throw new UnprocessableError(
      'The portrait this page points at is no longer in the library. Clear it on the page, or upload it again.',
      { portraitAssetId: 'No site asset with that id.' },
    );
  }

  const gate = checkSiteAssetGates({ assetVisibility: asset.visibility as Visibility });

  if (!gate.publishable) {
    throw new UnprocessableError('The portrait on this page cannot be published yet.', {
      reasons: gate.blockedBy.map((reason) => PUBLISH_GATE_MESSAGES[reason]),
    });
  }

  const copied = await copyToPublic(String(asset._id));
  const image = publicImageOf(copied);

  return image ? { ...image } : null;
}

/**
 * Copies a page's CV into the public container and describes it.
 *
 * The same shape as the portrait above — same gate, same copy, same refusal to
 * publish a page around a hole — with two differences.
 *
 * It has to be a document. Every mime type the uploader accepts that is not an
 * image is either this or a video, and a hero button that hands a visitor an
 * mp4 labelled "Download CV" is not a thing to let through quietly.
 *
 * It carries `filename` rather than `alt` and no variants: the public blob name
 * is content-addressed so it cannot be guessed (§8), which also makes it
 * meaningless as a saved filename. The name the visitor sees is the one on the
 * asset.
 */
async function resolveCv(assetId: unknown): Promise<Record<string, unknown> | null> {
  if (typeof assetId !== 'string' || assetId === '') return null;

  const asset = await AssetModel.findOne({ _id: assetId, projectId: null });

  if (!asset) {
    throw new UnprocessableError(
      'The CV this page points at is no longer in the library. Clear it on the page, or upload it again.',
      { cvAssetId: 'No site asset with that id.' },
    );
  }

  if (asset.mimeType !== 'application/pdf') {
    throw new UnprocessableError('The CV has to be a PDF.', {
      cvAssetId: `${asset.filename} is a ${asset.mimeType}, which is not something to hand a visitor as a CV.`,
    });
  }

  const gate = checkSiteAssetGates({ assetVisibility: asset.visibility as Visibility });

  if (!gate.publishable) {
    throw new UnprocessableError('The CV on this page cannot be published yet.', {
      reasons: gate.blockedBy.map((reason) => PUBLISH_GATE_MESSAGES[reason]),
    });
  }

  const copied = await copyToPublic(String(asset._id));

  return copied.publicBlobUrl
    ? { url: copied.publicBlobUrl, filename: copied.filename }
    : null;
}

/**
 * Takes a portrait's or a CV's public copies away, unless another live page
 * still shows the same one.
 *
 * One asset can be the portrait of more than one page — the landing hero and
 * the about page are the obvious pair — and deleting the blobs because one of
 * them stopped using it would break the other. The check is against what is
 * published rather than what is drafted: a draft shows nobody anything.
 *
 * It looks in both places a site file can be named, not just the one the caller
 * happens to be revoking. A URL still pointed at from anywhere published is a
 * URL whose bytes have to stay, and asking about one field would answer the
 * wrong question in the unsafe direction.
 *
 * The blobs go before the record is rewritten, and a URL with no asset behind
 * it is still deleted: the bytes are what is reachable, so the bytes are what
 * has to go (§8).
 */
async function revokeSiteFile(url: string | null, exceptKey: string): Promise<void> {
  if (!url) return;

  /*
   * Through the raw driver, like `mediaLibraryService` counts its references
   * and for the same reason: `config/db.ts` sets `strictQuery: true`, which
   * silently drops a condition on a path the schema does not declare, and
   * `published.data` is `Mixed`. A dropped condition here would count every
   * published page with any portrait, conclude the image is still in use, and
   * leave the blobs public — the failure would be silent and in the unsafe
   * direction.
   */
  const stillShown = await SiteContentModel.collection.countDocuments({
    key: { $ne: exceptKey },
    $or: [{ 'published.data.portrait.url': url }, { 'published.data.cv.url': url }],
  });

  if (stillShown > 0) return;

  const asset = await AssetModel.findOne({ publicBlobUrl: url, projectId: null });

  if (asset) {
    await removeFromPublic(String(asset._id));
    return;
  }

  const blobName = publicBlobNameFromUrl(url);
  if (blobName) await deletePublicBlob(blobName);
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
      data: withoutResolvedFields(input.data ?? record.draft.data ?? {}),
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
  const draftData = withoutResolvedFields(draft.data ?? {});

  // Dropped silently when the key has no record or its usage was never
  // approved, which is what `resolveMarks` already does for a project. A
  // withheld trademark costs the page one icon; it does not stop the publish
  // (docs/DATA_MODEL.md, §8).
  const marks = await resolveMarks(collectMediaKeys(draftData));

  // The copy happens before anything is written, so the record can only ever
  // name a URL that already resolves — and if the gate refuses, nothing has
  // changed anywhere.
  const portrait = await resolvePortrait(draftData.portraitAssetId);
  const cv = await resolveCv(draftData.cvAssetId);
  const previousPortrait = publicUrlAt(record.published?.data, 'portrait');
  const previousCv = publicUrlAt(record.published?.data, 'cv');

  record.set({
    published: {
      title: draft.title,
      body: draft.body,
      meta: { title: draft.meta.title, description: draft.meta.description },
      // Deep-copied so the two halves stay independent documents. A shared
      // reference would mean editing the draft afterwards silently changed what
      // is published, which is the one thing the split exists to prevent.
      data: { ...structuredClone(draftData), marks, portrait, cv },
    },
    publishedAt: new Date(),
    publishedByUserId,
  });

  await saveWithoutTouchingUpdatedAt(record);

  // Swapping either one leaves the old one public otherwise — a cacheable URL
  // for a file the site no longer shows anywhere (§8). Same asset republished
  // is the same URL, so this does nothing in the ordinary case.
  if (previousPortrait && previousPortrait !== publicUrlAt(record.published?.data, 'portrait')) {
    await revokeSiteFile(previousPortrait, record.key);
  }

  if (previousCv && previousCv !== publicUrlAt(record.published?.data, 'cv')) {
    await revokeSiteFile(previousCv, record.key);
  }

  return record;
}

/**
 * Takes the page off the live site, and takes its portrait and its CV out of
 * the public container on the way. The draft is left exactly as it is, so
 * unpublishing loses nothing and republishing needs no retyping.
 *
 * Doing this to a record that is already unpublished succeeds and changes
 * nothing, because "there is no published copy" is the state being asked for
 * and it is already the state.
 */
export async function unpublishSiteContent(key: string): Promise<SiteContentDocument> {
  const record = await getSiteContent(key);

  // Before the row goes, not after. A snapshot removed while its blobs remain
  // leaves a permanently cacheable public URL for a page nobody publishes any
  // more (§8).
  await revokeSiteFile(publicUrlAt(record.published?.data, 'portrait'), record.key);
  await revokeSiteFile(publicUrlAt(record.published?.data, 'cv'), record.key);

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
