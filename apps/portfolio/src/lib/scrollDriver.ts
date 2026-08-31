/**
 * The site's one scroll listener.
 *
 * Every scroll-linked effect on the site — the hero's layered parallax, the
 * drift on the background grid, the header's compact state — reads from here
 * rather than attaching a listener of its own. Scroll fires far faster than the
 * screen refreshes, so one handler per effect is one layout read per effect per
 * event, and that is the shape of a scroll that stutters (§18).
 *
 * What this does instead: one passive listener, coalesced to a single
 * `requestAnimationFrame` callback, publishing the position to every subscriber
 * in the same frame. A subscriber that writes a CSS custom property therefore
 * writes it once per frame at most, whatever the input device is doing.
 *
 * The listener is attached on the first subscription and removed on the last,
 * so a page with nothing scroll-linked on it costs nothing at all.
 *
 * Nothing here asks about reduced motion — the subscribers do, and most of them
 * simply never subscribe. This module has no opinion about what the number is
 * for.
 */
type ScrollListener = (scrollY: number) => void;

const listeners = new Set<ScrollListener>();

let frame = 0;
let attached = false;

function publish() {
  frame = 0;
  const scrollY = window.scrollY;
  // Copied before iterating: a subscriber that unsubscribes itself from inside
  // its own callback would otherwise mutate the set mid-loop.
  for (const listener of [...listeners]) listener(scrollY);
}

function request() {
  if (frame) return;
  frame = requestAnimationFrame(publish);
}

export function subscribeScroll(listener: ScrollListener): () => void {
  listeners.add(listener);

  if (!attached) {
    window.addEventListener('scroll', request, { passive: true });
    // A resize changes every measurement a subscriber took, and an orientation
    // change on a phone is a resize. Cheap to republish, expensive to miss.
    window.addEventListener('resize', request, { passive: true });
    attached = true;
  }

  // Called once immediately, so a subscriber mounted half way down a restored
  // page starts from where the page actually is rather than from zero.
  listener(window.scrollY);

  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;

    window.removeEventListener('scroll', request);
    window.removeEventListener('resize', request);
    attached = false;

    if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };
}
