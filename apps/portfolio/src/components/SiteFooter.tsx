import { Link } from 'react-router-dom';

/**
 * The foot of every page.
 *
 * Chrome only. The CTA footer the design calls for — heading, line, button —
 * is page content and belongs to the ticket that builds it; this is the rule,
 * the name and the year underneath it.
 */
const links = [
  { to: '/work', label: 'Work' },
  { to: '/about', label: 'About' },
  { to: '/skills', label: 'Skills' },
  { to: '/contact', label: 'Contact' },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-canvas">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-heading text-base font-bold tracking-tight text-fg">Teczo</p>
          <p className="mt-1 text-sm text-muted">
            © {new Date().getFullYear()} Teczo. Built and run in-house.
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="font-heading text-sm font-medium text-muted transition-colors hover:text-accent"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
