import type { Infer, MediaKind, mediaLibraryCreateShape } from '@wroom/shared';

import { MediaLibraryModel, type MediaLibraryDocument } from '../models/MediaLibrary.js';
import { ProductModel } from '../models/Product.js';
import { ProjectModel } from '../models/Project.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';
import { sanitiseSvg } from './svgSanitiser.js';

type MediaLibraryInput = Infer<typeof mediaLibraryCreateShape>;

/**
 * The library of reusable marks. Two things happen here and nowhere else:
 * `svg` is sanitised on the way in, and a key in use cannot be deleted.
 */

export type MediaLibraryListFilters = { kind?: MediaKind };

export async function listMediaLibrary(
  filters: MediaLibraryListFilters = {},
): Promise<MediaLibraryDocument[]> {
  const query: Record<string, unknown> = {};
  if (filters.kind) query.kind = filters.kind;

  return MediaLibraryModel.find(query).sort({ kind: 1, sortOrder: 1, label: 1 });
}

export async function getMediaItem(id: string): Promise<MediaLibraryDocument> {
  const item = await MediaLibraryModel.findById(id);
  if (!item) throw new NotFoundError('That mark');
  return item;
}

export async function createMediaItem(
  input: MediaLibraryInput,
): Promise<MediaLibraryDocument> {
  const clash = await MediaLibraryModel.findOne({ key: input.key }).select('_id');
  if (clash) {
    throw new ConflictError(`A mark with the key '${input.key}' already exists.`);
  }

  return MediaLibraryModel.create({ ...input, svg: sanitiseSvg(input.svg) });
}

export async function updateMediaItem(
  id: string,
  input: Partial<MediaLibraryInput>,
): Promise<MediaLibraryDocument> {
  const item = await getMediaItem(id);

  // Projects and siteContent point at a mark by its key, and neither is
  // rewritten when it changes. Renaming would orphan every reference silently,
  // so the key is fixed once the record exists — the same rule project types
  // live under, for the same reason.
  if (input.key !== undefined && input.key !== item.key) {
    throw new ValidationError('A mark key cannot be changed once it exists.', {
      key: `This mark is '${item.key}'. Projects and site content reference it by that key, so it cannot be renamed.`,
    });
  }

  // Sanitising on update as well as create is the whole point of a write-time
  // gate: a PATCH is just as much a way to get markup onto the public site.
  item.set(input.svg === undefined ? input : { ...input, svg: sanitiseSvg(input.svg) });
  await item.save();
  return item;
}

/**
 * Where a single key is referenced from, counted per place so the refusal can
 * say which one to go and fix.
 *
 * These three paths are `docs/DATA_MODEL.md`'s, and they are read through the
 * raw driver rather than through Mongoose on purpose: `config/db.ts` sets
 * `strictQuery: true`, which silently *drops* a condition on a path the schema
 * does not declare. None of these three are declared yet — the `portfolio`
 * sub-document and `products` are still at the v0.1 shape in code — so a
 * Mongoose query here would quietly become "count every project", and every
 * delete would be refused. Going through the collection keeps the condition
 * intact, and keeps this correct without waiting on the portfolio redesign.
 */
async function countReferences(key: string): Promise<{
  techStack: number;
  platforms: number;
  clientLogo: number;
  total: number;
}> {
  const [techStack, platforms, clientLogo] = await Promise.all([
    ProjectModel.collection.countDocuments({ 'portfolio.techStackKeys': key }),
    ProjectModel.collection.countDocuments({ 'portfolio.platformKeys': key }),
    ProductModel.collection.countDocuments({ clientMediaKey: key }),
  ]);

  return {
    techStack,
    platforms,
    clientLogo,
    total: techStack + platforms + clientLogo,
  };
}

/**
 * Refused while anything still points at the key.
 *
 * Deleting a referenced mark does not break a query — it leaves a project
 * naming an icon that no longer exists, which shows up as a gap on the public
 * site rather than an error anywhere. Refusing is how that stays impossible.
 */
export async function deleteMediaItem(id: string): Promise<void> {
  const item = await getMediaItem(id);
  const references = await countReferences(item.key);

  if (references.total > 0) {
    const places: string[] = [];
    if (references.techStack > 0) {
      places.push(`the tech stack of ${references.techStack} project(s)`);
    }
    if (references.platforms > 0) {
      places.push(`the platforms of ${references.platforms} project(s)`);
    }
    if (references.clientLogo > 0) {
      places.push(`${references.clientLogo} product(s) as the client logo`);
    }

    throw new ConflictError(
      `'${item.key}' is still used by ${places.join(', and ')}. Remove it there first, or set the mark to not approved to drop it from published pages while keeping the record.`,
      references,
    );
  }

  await item.deleteOne();
}

/** A mark as the public site receives it: no ids, no record, just what renders. */
export type ResolvedMark = { key: string; label: string; svg: string };

/**
 * Turns `mediaLibrary` keys into the marks a snapshot carries.
 *
 * Anything with `usageApproved: false` is dropped, and so is a key with no
 * record behind it. Dropping rather than failing is deliberate: the publish
 * action must not refuse because a trademark was withheld or a key was mistyped
 * — the section renders with one fewer icon and everything else still goes out
 * (docs/DATA_MODEL.md, CLAUDE.md §8).
 *
 * The caller's order is preserved, because a tech grid is arranged by hand.
 */
export async function resolveMarks(keys: readonly string[]): Promise<ResolvedMark[]> {
  if (keys.length === 0) return [];

  const records = await MediaLibraryModel.find({
    key: { $in: [...keys] },
    usageApproved: true,
  })
    .select('key label svg')
    .lean();

  const byKey = new Map(records.map((record) => [record.key, record]));

  return keys.flatMap((key) => {
    const record = byKey.get(key);
    return record ? [{ key: record.key, label: record.label, svg: record.svg ?? '' }] : [];
  });
}

/**
 * The one mark a client logo resolves to, or null.
 *
 * Null covers all three of: no key set, no such record, and a mark whose usage
 * was never approved. The public site shows no logo in every one of those cases,
 * which is the safe reading of all three.
 */
export async function resolveClientMark(
  key: string | null | undefined,
): Promise<{ label: string; svg: string } | null> {
  if (!key) return null;

  const [mark] = await resolveMarks([key]);
  return mark ? { label: mark.label, svg: mark.svg } : null;
}
