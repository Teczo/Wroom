import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

import { usePublishedContent } from '../features/content/api';
import { readLandingData } from '../features/landing/landingData';

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

const linkBase =
  'font-heading text-sm font-medium transition-colors';

/**
 * The active link is the accent plus a lit dot centred beneath it. Colour alone
 * is carrying less here than it looks: `aria-current="page"` is what a screen
 * reader announces, and `NavLink` sets it without being asked.
 */
function navLinkClass({ isActive }: { isActive: boolean }): string {
  return `relative py-1 ${linkBase} ${
    isActive
      ? 'text-accent after:absolute after:-bottom-2 after:left-1/2 after:size-1.5 after:-translate-x-1/2 after:rounded-full after:bg-accent after:shadow-[0_0_10px_var(--color-accent)]'
      : 'text-muted hover:text-fg'
  }`;
}

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

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const content = usePublishedContent('landing');
  const ctaLabel = readLandingData(content.data?.data)?.headerCtaLabel ?? '';

  // Navigating away closes it. Without this, following a link leaves the panel
  // covering the page it just went to.
  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return;

    // The page behind a full-screen panel must not scroll under it, and Escape
    // has to close it — a panel you can only leave by finding the small cross
    // is a trap on a phone.
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

  return (
    /*
     * A floating pill rather than a full-width bar: sticky, translucent and
     * inset from the top, so the grid and the glow behind it stay visible as
     * the page moves under it. `z-30` clears the page content but stays under
     * the mobile overlay's `z-50`.
     *
     * The gap above it is padding on the sticky element, not a transform —
     * `index.css` strips every transform under reduced motion, so a transform
     * may never be what holds something in position (§7.5).
     */
    <header className="sticky top-0 z-30 px-5 pt-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-xl border border-border bg-canvas/80 px-5 py-3 backdrop-blur-xl">
        <Link to="/" className="text-fg transition-colors hover:text-accent">
          <Wordmark />
        </Link>

        {/* From md up, the links sit in the bar. */}
        <nav className="hidden items-center gap-6 md:flex" aria-label="Main">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={navLinkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        {ctaLabel ? (
          <Link
            to="/contact"
            className="hidden min-h-11 items-center gap-2 rounded-full border border-accent px-5 font-heading text-sm font-medium text-accent transition-colors hover:bg-accent hover:text-on-accent md:inline-flex"
          >
            {ctaLabel}
            <span aria-hidden>↗</span>
          </Link>
        ) : null}

        <button
          type="button"
          className="-mr-2 inline-flex size-11 items-center justify-center rounded-lg text-fg transition-colors hover:bg-surface md:hidden"
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
      {open ? (
        <div
          id="site-menu"
          className="fixed inset-0 z-50 flex flex-col bg-canvas md:hidden"
        >
          <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
            <span className="text-fg">
              <Wordmark />
            </span>
            <button
              type="button"
              className="-mr-2 inline-flex size-11 items-center justify-center rounded-lg text-fg transition-colors hover:bg-surface"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            >
              <MenuIcon open />
            </button>
          </div>

          <nav className="flex flex-col px-5 py-2" aria-label="Main">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `border-b border-border py-4 font-heading text-lg font-medium transition-colors ${
                    isActive ? 'text-accent' : 'text-fg hover:text-accent'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {ctaLabel ? (
            <div className="px-5 py-6">
              <Link
                to="/contact"
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-accent bg-accent px-5 font-heading text-sm font-semibold text-on-accent"
              >
                {ctaLabel}
                <span aria-hidden>↗</span>
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
