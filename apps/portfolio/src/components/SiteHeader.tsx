import { Link, NavLink } from 'react-router-dom';

/**
 * The public site's chrome. Deliberately thin — the work is what the page is
 * for, so this is a name and three links and nothing else.
 */
const links = [
  { to: '/work', label: 'Work' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-3">
        <Link
          to="/work"
          className="text-sm font-semibold tracking-tight text-slate-900 hover:text-slate-600"
        >
          Teczo
        </Link>

        <nav className="flex items-center">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `inline-flex min-h-11 items-center px-3 text-sm ${
                  isActive ? 'font-medium text-slate-900' : 'text-slate-500 hover:text-slate-900'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
