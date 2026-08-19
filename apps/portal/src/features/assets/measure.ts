import type { AssetKind } from '@wroom/shared';

/**
 * What the browser can tell us about a file before it goes up.
 *
 * Only what it can read for free: an image's dimensions, a video's dimensions
 * and length. Anything it cannot read stays null — nothing is inspected
 * server-side, so a PDF's page size and a photo's capture date are simply not
 * recorded.
 */

export type Measurements = {
  width: number | null;
  height: number | null;
  durationSec: number | null;
};

const NOTHING: Measurements = { width: null, height: null, durationSec: null };

export function kindFor(mimeType: string): AssetKind {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'application/pdf') return 'document';
  if (mimeType === 'image/svg+xml') return 'diagram';
  return 'screenshot';
}

function measureImage(url: string): Promise<Measurements> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () =>
      resolve({ width: image.naturalWidth, height: image.naturalHeight, durationSec: null });
    image.onerror = () => resolve(NOTHING);
    image.src = url;
  });
}

function measureVideo(url: string): Promise<Measurements> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () =>
      resolve({
        width: video.videoWidth || null,
        height: video.videoHeight || null,
        durationSec: Number.isFinite(video.duration) ? Math.round(video.duration) : null,
      });
    video.onerror = () => resolve(NOTHING);
    video.src = url;
  });
}

export async function measure(file: File): Promise<Measurements> {
  const url = URL.createObjectURL(file);

  try {
    if (file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
      return await measureImage(url);
    }
    if (file.type.startsWith('video/')) return await measureVideo(url);
    return NOTHING;
  } finally {
    URL.revokeObjectURL(url);
  }
}
