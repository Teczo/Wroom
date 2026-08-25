import {
  VARIANT_ASSET_KINDS,
  type PublishedGalleryItem,
  type PublishedImage,
} from '@wroom/shared';
import { useState } from 'react';

/**
 * The hero viewer: one large shot, and a strip of thumbnails that change it.
 *
 * Where the pictures come from is decided entirely in the portal and settled
 * at publish. The project's `heroAssetId` is the first shot; everything else
 * public on the project arrives in `gallery`, ordered by the asset's own
 * `sortOrder`. Nothing here chooses — it renders the order it was given.
 *
 * `gallery` carries every publishable asset that is not the hero, which
 * includes videos, documents and anything else uploaded to the project. Only
 * the kinds that have image variants belong in a picture strip, and
 * `VARIANT_ASSET_KINDS` is already the list of exactly those — reusing it
 * means this cannot drift from what the API actually generates variants for.
 *
 * Each slot gets the variant it is sized for (§10): `hero` for the large
 * image, `thumb` for the 110px strip. Serving the 1600px file into a thumbnail
 * is the single largest performance loss available on this page.
 */

type Shot = {
  /** The widest variant — this is the biggest image slot on the page. */
  full: string;
  thumb: string;
  alt: string;
  caption: string;
  device: string;
};

function shotsFor(hero: PublishedImage | null, gallery: PublishedGalleryItem[]): Shot[] {
  const shots: Shot[] = [];
  const seen = new Set<string>();

  const add = (
    url: string,
    variants: PublishedImage['variants'],
    alt: string,
    caption = '',
    device = '',
  ) => {
    // The hero is normally excluded from `gallery` at publish, but a snapshot
    // written before that rule cannot be re-ordered from here — so the same
    // picture twice is dropped rather than shown twice.
    if (!url || seen.has(url)) return;
    seen.add(url);
    shots.push({
      full: variants?.hero ?? url,
      thumb: variants?.thumb ?? variants?.card ?? url,
      alt,
      caption,
      device,
    });
  };

  if (hero) add(hero.url, hero.variants, hero.alt);

  for (const item of gallery) {
    if (!VARIANT_ASSET_KINDS.includes(item.kind as (typeof VARIANT_ASSET_KINDS)[number])) continue;
    add(item.url, item.variants, item.alt, item.caption, item.device);
  }

  return shots;
}

export function HeroViewer({
  hero,
  gallery,
  name,
}: {
  hero: PublishedImage | null;
  gallery: PublishedGalleryItem[];
  name: string;
}) {
  const shots = shotsFor(hero, gallery);
  const [index, setIndex] = useState(0);

  // No pictures at all: no viewer. A project page is readable without one, and
  // an empty frame says less than nothing (§7.4).
  const firstShot = shots[0];
  if (!firstShot) return null;

  // Falling back to the first shot rather than clamping: a snapshot republished
  // with fewer images while the page is open leaves the index past the end, and
  // showing the hero again is better than showing nothing.
  const active = shots[index] ?? firstShot;

  return (
    <div>
      {/*
       * Full-bleed on a phone, a lit panel from `sm` up (§7.7). The negative
       * margin is what takes it past the page's own padding; the border,
       * padding and radius arrive with the breakpoint.
       */}
      <div className="-mx-5 border-y border-border-strong bg-surface-deep shadow-[0_0_70px_var(--color-accent-glow)] sm:mx-0 sm:rounded-2xl sm:border sm:p-2.5">
        <img
          src={active.full}
          alt={active.alt || name}
          className="w-full object-cover sm:rounded-xl md:aspect-[16/10]"
        />

        {/*
         * A scroll-snap row (§7.5, §7.7). The scrolling is CSS and the finger;
         * the buttons only change which shot is large. One picture needs no
         * strip.
         */}
        {shots.length > 1 ? (
          <ul className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-2.5 pb-2.5 pt-2.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
            {shots.map((shot, position) => (
              <li key={shot.full} className="shrink-0 snap-start">
                <button
                  type="button"
                  onClick={() => setIndex(position)}
                  aria-pressed={position === index}
                  aria-label={
                    shot.caption || shot.alt || `Show image ${position + 1} of ${shots.length}`
                  }
                  className={`block h-16 w-28 overflow-hidden rounded-lg border transition-colors ${
                    position === index
                      ? 'border-accent'
                      : 'border-border opacity-70 hover:border-border-strong hover:opacity-100'
                  }`}
                >
                  <img src={shot.thumb} alt="" loading="lazy" className="size-full object-cover" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/*
       * The caption belongs to the shot on screen, not to the strip. It is
       * outside the frame so it does not sit on top of the picture, and it is
       * absent entirely when the asset has none.
       */}
      {active.caption ? (
        <p className="mt-3 px-1 text-xs text-muted">
          {active.caption}
          {active.device ? ` · ${active.device}` : ''}
        </p>
      ) : null}
    </div>
  );
}
