import { ASSET_VARIANT_NAMES, ASSET_VARIANT_WIDTHS, type AssetVariantName } from '@wroom/shared';
import sharp from 'sharp';

/**
 * Turns a validated original into the three resized copies.
 *
 * Every number here comes from the bytes or from `ASSET_VARIANT_WIDTHS`. The
 * client's declared `width`, `height` and `mimeType` are not consulted at all —
 * a request that claims a 40px image is still measured and resized on what
 * actually arrived (CLAUDE.md §8).
 */

/** WebP quality. High enough that a screenshot's text stays crisp at 1:1. */
const WEBP_QUALITY = 82;

/**
 * The Open Graph card size every unfurler expects. LinkedIn, Slack and iMessage
 * all crop to roughly this ratio; giving them the exact pixels means they crop
 * nothing and the card looks composed rather than sliced.
 */
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

export type GeneratedVariant = {
  name: AssetVariantName;
  /** What came out, which is never larger than the original. */
  width: number;
  buffer: Buffer;
  contentType: string;
};

export type OriginalMeasurements = { width: number; height: number };

/** Anything sharp cannot decode is not an image, whatever the upload claimed. */
export class NotAnImageError extends Error {
  constructor(cause: string) {
    super(`The uploaded file could not be read as an image (${cause}).`);
    this.name = 'NotAnImageError';
  }
}

/**
 * The dimensions the image will actually display at.
 *
 * `metadata()` reports what is *stored*, and a photo or phone screenshot is
 * often stored a quarter turn from how it is shown, with an EXIF tag saying so.
 * The resize below honours that tag, so the two have to be read the same way
 * here — otherwise a portrait screenshot is measured as landscape, and every
 * variant width clamps against the wrong number.
 *
 * Orientations 5 to 8 are the quarter-turn cases; 1 to 4 are upright or
 * mirrored, and keep their stored dimensions.
 */
export async function measureOriginal(original: Buffer): Promise<OriginalMeasurements> {
  try {
    const { width, height, orientation } = await sharp(original, { failOn: 'error' }).metadata();

    if (!width || !height) throw new Error('no dimensions');

    const quarterTurned = typeof orientation === 'number' && orientation >= 5 && orientation <= 8;

    return quarterTurned ? { width: height, height: width } : { width, height };
  } catch (error: unknown) {
    throw new NotAnImageError(error instanceof Error ? error.message : String(error));
  }
}

/**
 * The three variants, smallest first.
 *
 * A target wider than the original is clamped to the original rather than
 * enlarged, so a 500px logo yields a 400px thumb and 500px card and hero. All
 * three keys are always present, which keeps every consumer's lookup total —
 * they cost a little storage in exchange for never needing a fallback path.
 *
 * EXIF is dropped on the way through. It is of no use on a public image and a
 * screenshot can carry a location in it.
 */
export async function generateVariants(original: Buffer): Promise<GeneratedVariant[]> {
  const { width: originalWidth } = await measureOriginal(original);

  const variants: GeneratedVariant[] = [];

  for (const name of ASSET_VARIANT_NAMES) {
    const target = Math.min(ASSET_VARIANT_WIDTHS[name], originalWidth);

    const buffer = await sharp(original, { failOn: 'error' })
      .autoOrient()
      .resize({ width: target, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    variants.push({ name, width: target, buffer, contentType: 'image/webp' });
  }

  return variants;
}

/**
 * A 1200x630 Open Graph card cropped from an image.
 *
 * Used at publish time when a project has no `ogAssetId` of its own: the hero is
 * cropped rather than letterboxed, because an unfurled card with bars down the
 * sides reads as a broken image in a LinkedIn feed. `cover` fills the frame and
 * `attention` picks the crop window by where the detail is, which on a product
 * screenshot is the interface rather than the empty chrome around it.
 */
export async function generateOgCrop(original: Buffer): Promise<GeneratedVariant> {
  // Measuring first turns a non-image into NotAnImageError here rather than a
  // raw sharp failure in the middle of a publish.
  await measureOriginal(original);

  const buffer = await sharp(original, { failOn: 'error' })
    .autoOrient()
    .resize({
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
      fit: 'cover',
      position: sharp.strategy.attention,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  return { name: 'hero', width: OG_IMAGE_WIDTH, buffer, contentType: 'image/webp' };
}
