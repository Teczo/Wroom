import type { PublishedDemoVideo } from '@wroom/shared';
import { useState } from 'react';

/**
 * The demo video on a project page, and the reason it is not an embed.
 *
 * A YouTube iframe dropped straight into the page costs roughly half a
 * megabyte of third-party JavaScript, several requests and a cookie, on every
 * visit — including the overwhelming majority where nobody presses play. So
 * the embed providers get a facade: the poster image and a play button, which
 * is HTML and one image. The iframe is created on click and not a moment
 * before, which is the point at which the visitor has asked for it.
 *
 * A `blob` video is one of our own uploads on our own storage, so there is no
 * third party to keep out. It is a real `<video>` element with the poster
 * painted immediately and `preload="metadata"` — enough for the browser to
 * know the duration and draw the scrubber, without pulling the file down for a
 * visitor who never plays it.
 */

/**
 * The embed URL for a provider that has one.
 *
 * `externalId` is authored in the portal and validated only as a non-empty
 * string, so it is encoded rather than trusted: the host is fixed here and the
 * id can only ever land in the path segment. YouTube is embedded from
 * `youtube-nocookie.com`, which is the same player without the tracking cookie
 * — a facade that then loads the cookie-bearing host would be half a job.
 */
function embedUrl(video: PublishedDemoVideo): string | null {
  const id = video.externalId?.trim();
  if (!id) return null;

  switch (video.provider) {
    case 'youtube':
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
    case 'vimeo':
      return `https://player.vimeo.com/video/${encodeURIComponent(id)}?autoplay=1`;
    default:
      return null;
  }
}

/** Chrome, drawn inline — not a mark from the library (§7.3). */
function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-7 translate-x-0.5" fill="currentColor">
      <path d="M8 5.5v13a1 1 0 0 0 1.53.85l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}

const frameClass =
  'relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-surface';

export function DemoVideo({ video, title }: { video: PublishedDemoVideo; title: string }) {
  const [playing, setPlaying] = useState(false);

  // The hero variant: this is the widest image slot on the page (§10).
  const poster = video.poster ? (video.poster.variants?.hero ?? video.poster.url) : null;

  if (video.provider === 'blob') {
    // No video file in the snapshot means the upload never reached the public
    // container. There is nothing to play, so there is no section (§7.4).
    if (!video.url) return null;

    return (
      <div className={frameClass}>
        <video
          src={video.url}
          poster={poster ?? undefined}
          controls
          preload="metadata"
          playsInline
          className="size-full"
        />
      </div>
    );
  }

  const src = embedUrl(video);
  if (!src) return null;

  if (playing) {
    return (
      <div className={frameClass}>
        <iframe
          src={src}
          title={`${title} demo video`}
          // `fullscreen` is in `allow`, which is the modern spelling and takes
          // precedence — adding `allowFullScreen` as well only earns a console
          // warning about the two disagreeing.
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          className="absolute inset-0 size-full border-0"
        />
      </div>
    );
  }

  return (
    <div className={frameClass}>
      <button
        type="button"
        onClick={() => setPlaying(true)}
        aria-label={`Play the ${title} demo video`}
        className="group absolute inset-0 size-full cursor-pointer"
      >
        {poster ? (
          /*
           * Decorative here, deliberately. The button carries the accessible
           * name; repeating the poster's alt text inside it would have a
           * screen reader announce the same picture twice.
           */
          <img src={poster} alt="" className="size-full object-cover" />
        ) : null}

        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-accent text-on-accent transition-colors group-hover:bg-accent-hover">
            <PlayGlyph />
          </span>
        </span>
      </button>
    </div>
  );
}
