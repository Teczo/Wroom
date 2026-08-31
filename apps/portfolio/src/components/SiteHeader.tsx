import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

import { usePublishedContent } from '../features/content/api';
import { readLandingData } from '../features/landing/landingData';
import { entering, useEntered } from '../lib/entrance';
import { subscribeScroll } from '../lib/scrollDriver';

/**
 * The public site's chrome.
 *
 * Below `md` the links collapse into a full-screen overlay (§7.7). It is a
 * boolean and a fixed panel — no drawer library, and none is needed: the panel
 * is `fixed inset-0`, which is the whole of the mechanism.
 *
 * The pill on the right is `headerCtaLabel` from the published `landing`
 * record, so the words on it are an edit and a publish like everything else
 * (§2 rule 8). Unwritten and there is no pill — the nav is the whole header,
 * which is what it was before this.
 *
 * Reading the landing record here means every page asks for it, not only the
 * landing page. That is one small cached read that the header genuinely needs,
 * deduplicated by TanStack Query against the landing page's own call and held
 * for the session, so a visit costs one request no matter where it starts.
 *
 * Below `md` the pill goes to the foot of the overlay rather than beside the
 * hamburger: two controls in a bar that has room for one is how a header stops
 * working at 390px (§7.7).
 *
 * ## What moves
 *
 * Three things, and none of them changes the size of the bar. The header is a
 * sticky element in normal flow, so its height is the page's height: a bar that
 * shrank on scroll would pull every section under it up by the difference,
 * which is a layout shift dressed up as a flourish (§18). So "compact on
 * scroll" is done with light rather than geometry — the panel frosts harder,
 * its background closes up, and a shadow appears under it to lift it off the
 * page it is now covering.
 *
 * The second is the entrance: the bar arrives from slightly above, once, on
 * load.
 *
 * The third is the active indicator. It used to be a dot drawn on whichever
 * link was current, which meant it vanished from one link and appeared under
 * another. There is now one dot for the whole nav, and it slides — because the
 * thing a moving indicator says is *this* became *that*, and two dots switching
 * on and off say nothing at all. It moves by `left` rather than a transform,
 * deliberately: reduced motion strips every transform on the site, and an
 * indicator positioned by one would end up under the wrong link for exactly the
 * visitors least able to tolerate it (§7.5). Animating `left` on an absolutely
 * positioned six-pixel dot lays out nothing else on the page.
 */
const links = [
  /*
   * `end` on the landing route only. Without it every path in the site starts
   * with `/` and React Router would light Home on all of them; with it on the
   * others, a case study would leave Work unlit.
   */
  { to: '/', label: 'Home', end: true },
  { to: '/work', label: 'Work' },
  { to: '/about', label: 'About' },
  { to: '/skills', label: 'Skills' },
  { to: '/contact', label: 'Contact' },
];

const linkBase = 'font-heading text-sm font-medium transition-colors duration-300 ease-out-soft';

/**
 * The active link is the accent, and the shared dot below slides to sit under
 * it. Colour alone is carrying less here than it looks: `aria-current="page"` is
 * what a screen reader announces, and `NavLink` sets it without being asked —
 * which is also what the indicator measures against, so the two cannot drift.
 */
function navLinkClass({ isActive }: { isActive: boolean }): string {
  return `relative py-1 ${linkBase} ${isActive ? 'text-accent' : 'text-muted hover:text-fg'}`;
}

/** Half the indicator dot, so it can be centred without a transform. */
const DOT_RADIUS_PX = 3;

/** How far the page must move before the bar closes up. */
const SCROLLED_PX = 12;

/**
 * The mark beside the wordmark.
 *
 * Drawn here rather than pulled from `mediaLibrary`, on the same grounds as the
 * menu icon below it: this is the site's own furniture, not a logo anybody
 * looks up, corrects or withholds approval for. Nothing in the library would
 * ever point at it (§7.3).
 */
function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className="font-mono text-sm font-bold text-accent">
        &lt;/&gt;
      </span>
      <span className="font-heading text-base font-bold tracking-tight">Teczo</span>
    </span>
  );
}

/** Three bars, or a cross. Drawn inline because it is chrome, not a mark (§7.3). */
function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      {open ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </>
      ) : (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      )}
    </svg>
  );
}

/**
 * Whether the page has left the top.
 *
 * Reads from the shared scroll driver rather than its own listener, and holds a
 * boolean rather than a position, so the header re-renders twice in a visit
 * instead of once a frame (§18). Not gated on reduced motion: this is a change
 * of state, not a piece of animation — what the preference switches off is the
 * transition between the two, which `index.css` does.
 */
function useScrolled(): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(
    () => subscribeScroll((scrollY) => setScrolled(scrollY > SCROLLED_PX)),
    [],
  );

  return scrolled;
}

/**
 * The full-screen panel below `md`.
 *
 * Its own component so the entrance runs when it opens rather than when the
 * header mounts — `useEntered` is false for one frame after *this* mounts, and
 * this only mounts when the menu is opened.
 */
function MobileMenu({ ctaLabel, onClose }: { ctaLabel: string; onClose: () => void }) {
  const entered = useEntered();
  const panel = entering(entered, 'fade', 0, 260);
  // The pill at the foot follows the last link.
  const cta = entering(entered, 'up', 60 + links.length * 40, 420);

  return (
    <div
      id="site-menu"
      style={panel.style}
      className={`fixed inset-0 z-50 flex flex-col bg-canvas md:hidden ${panel.className}`}
    >
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
        <span className="text-fg">
          <Wordmark />
        </span>
        <button
          type="button"
          className="-mr-2 inline-flex size-11 items-center justify-center rounded-lg text-fg transition-colors hover:bg-surface"
          aria-label="Close menu"
          onClick={onClose}
        >
          <MenuIcon open />
        </button>
      </div>

      <nav className="flex flex-col px-5 py-2" aria-label="Main">
        {links.map((link, index) => {
          // The rows come down the panel in order. Forty milliseconds apart is
          // enough to read as a sequence and short enough that the last row is
          // in place before a thumb could reach it.
          const row = entering(entered, 'up', 60 + index * 40, 420);

          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              style={row.style}
              className={({ isActive }) =>
                `border-b border-border py-4 font-heading text-lg font-medium transition-colors ${
                  isActive ? 'text-accent' : 'text-fg hover:text-accent'
                } ${row.className}`
              }
            >
              {link.label}
            </NavLink>
          );
        })}
      </nav>

      {ctaLabel ? (
        <div className="px-5 py-6">
          <Link
            to="/contact"
            style={cta.style}
            className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-accent bg-accent px-5 font-heading text-sm font-semibold text-on-accent ${cta.className}`}
          >
            {ctaLabel}
            <span aria-hidden>↗</span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const content = usePublishedContent('landing');
  const ctaLabel = readLandingData(content.data?.data)?.headerCtaLabel ?? '';

  const entered = useEntered();
  const scrolled = useScrolled();

  const navRef = useRef<HTMLElement | null>(null);
  const [indicator, setIndicator] = useState({ left: 0, show: false });

  // Navigating away closes it. Without this, following a link leaves the panel
  // covering the page it just went to.
  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return;

    // The page behind a full-screen panel must not scroll under it, and Escape
    // has to close it — a panel you can only leave by finding the small cross
    // is a trap on a phone.
    //
    // `useSmoothScroll` reads this exact flag to know there is nothing to
    // scroll, so it stays the mechanism rather than becoming a class.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  /*
   * Where the dot goes. Measured off whichever link React Router marked as the
   * current page, in layout rather than in an effect — the first measurement
   * decides whether the dot is drawn at all, and taking it after the paint
   * would show it at the left edge of the nav for a frame.
   *
   * Re-measured when the fonts arrive, because a nav set in the fallback stack
   * and a nav set in Space Grotesk are different widths, and the dot would
   * otherwise stay where the fallback put it.
   */
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const measure = () => {
      const active = nav.querySelector('[aria-current="page"]');
      if (!(active instanceof HTMLElement)) {
        setIndicator((current) => ({ ...current, show: false }));
        return;
      }

      const navBox = nav.getBoundingClientRect();
      const linkBox = active.getBoundingClientRect();
      setIndicator({
        left: linkBox.left - navBox.left + linkBox.width / 2 - DOT_RADIUS_PX,
        show: true,
      });
    };

    measure();
    window.addEventListener('resize', measure);
    if ('fonts' in document) void document.fonts.ready.then(measure).catch(() => {});

    return () => window.removeEventListener('resize', measure);
  }, [location.pathname]);

  const headerEnter = entering(entered, 'up', 0, 700);

  return (
    /*
     * A floating pill rather than a full-width bar: sticky, translucent and
     * inset from the top, so the grid and the glow behind it stay visible as
     * the page moves under it. `z-30` clears the page content but stays under
     * the mobile overlay's `z-50`.
     *
     * The gap above it is padding on the sticky element, not a transform —
     * `index.css` strips every transform under reduced motion, so a transform
     * may never be what holds something in position (§7.5). That is also why
     * the entrance below lands on the pill inside rather than on the header
     * itself: the header is what does the sticking.
     */
    <header className="sticky top-0 z-30 px-5 pt-4">
      <div
        style={headerEnter.style}
        className={`mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-xl border px-5 py-3 [transition-property:opacity,transform,filter,background-color,border-color,box-shadow,backdrop-filter] ${
          scrolled
            ? 'border-border-strong/50 bg-canvas/95 shadow-[0_16px_50px_var(--color-shadow)] backdrop-blur-2xl'
            : 'border-border bg-canvas/80 backdrop-blur-xl'
        } ${headerEnter.className}`}
      >
        <Link to="/" className="text-fg transition-colors duration-300 hover:text-accent">
          <Wordmark />
        </Link>

        {/* From md up, the links sit in the bar. `relative` is what the shared
            indicator below is positioned against. */}
        <nav ref={navRef} className="relative hidden items-center gap-6 md:flex" aria-label="Main">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={navLinkClass}>
              {link.label}
            </NavLink>
          ))}

          <span
            aria-hidden
            style={{ left: `${indicator.left}px`, opacity: indicator.show ? 1 : 0 }}
            className="pointer-events-none absolute -bottom-2 size-1.5 rounded-full bg-accent shadow-[0_0_10px_var(--color-accent)] [transition-property:left,opacity] duration-500 ease-out-expo"
          />
        </nav>

        {ctaLabel ? (
          <Link
            to="/contact"
            className="group hidden min-h-11 items-center gap-2 rounded-full border border-accent px-5 font-heading text-sm font-medium text-accent [transition-property:color,background-color,box-shadow,transform] duration-300 ease-out-expo hover:-translate-y-0.5 hover:bg-accent hover:text-on-accent hover:shadow-[0_8px_28px_var(--color-accent-halo)] md:inline-flex"
          >
            {ctaLabel}
            <span
              aria-hidden
              className="transition-transform duration-300 ease-out-expo group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            >
              ↗
            </span>
          </Link>
        ) : null}

        <button
          type="button"
          className="-mr-2 inline-flex size-11 items-center justify-center rounded-lg text-fg transition-colors md:hidden hover:bg-surface"
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((current) => !current)}
        >
          <MenuIcon open={open} />
        </button>
      </div>

      {/*
       * The overlay. Rendered only when open, and only reachable below md — the
       * `md:hidden` matters as much as the boolean, or a desktop resize while
       * open would leave a full-screen panel over a page that has a nav bar.
       */}
      {open ? <MobileMenu ctaLabel={ctaLabel} onClose={() => setOpen(false)} /> : null}
    </header>
  );
}
