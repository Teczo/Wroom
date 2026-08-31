import { Link } from 'react-router-dom';

import { entering } from '../lib/entrance';
import { useInView } from '../lib/useInView';

/**
 * The foot of every page.
 *
 * Chrome only. The CTA footer the design calls for — heading, line, button —
 * is page content and belongs to the ticket that builds it; this is the rule,
 * the name and the year underneath it.
 *
 * It reveals as it is scrolled to, quietly: the brand lifts, the links follow
 * one at a time. This is the end of the page and the least important motion on
 * it, so it is also the smallest — anything more here would compete with the
 * CTA above it, which is the thing the whole page is pointed at (§20).
 */
const links = [
  { to: '/work', label: 'Work' },
  { to: '/about', label: 'About' },
  { to: '/skills', label: 'Skills' },
  { to: '/contact', label: 'Contact' },
];

/** Held between one footer link and the next. */
const LINK_STEP_MS = 50;

export function SiteFooter() {
  const { ref, inView } = useInView<HTMLElement>();
  const brand = entering(inView, 'up', 0, 600);

  return (
    <footer ref={ref} className="mt-16 border-t border-border bg-canvas">
      {/* Same container width as the header, so the brand at the top of the
          page and the brand at the foot of it sit on the same line. */}
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div style={brand.style} className={brand.className}>
          <p className="font-heading text-base font-bold tracking-tight text-fg">Teczo</p>
          <p className="mt-1 text-sm text-muted">
            © {new Date().getFullYear()} Teczo. Built and run in-house.
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer">
          {links.map((link, index) => {
            const enter = entering(inView, 'up', 120 + index * LINK_STEP_MS, 520);

            return (
              <Link
                key={link.to}
                to={link.to}
                style={enter.style}
                className={`font-heading text-sm font-medium text-muted [transition-property:opacity,transform,filter,color] ease-out-expo hover:text-accent ${enter.className}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </footer>
  );
}
