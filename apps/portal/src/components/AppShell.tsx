import { useAuth0 } from '@auth0/auth0-react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

import { isAuthConfigured } from '../lib/config';

const navigation = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/projects', label: 'Projects', end: false },
  { to: '/products', label: 'Products', end: false },
  { to: '/accounts', label: 'Accounts', end: false },
  { to: '/credentials', label: 'Keys', end: false },
];

function SignOutButton() {
  const { logout, user } = useAuth0();

  return (
    <button
      onClick={() => void logout({ logoutParams: { returnTo: window.location.origin } })}
      className="text-sm text-slate-500 hover:text-slate-900"
    >
      Sign out{user?.email ? ` (${user.email})` : ''}
    </button>
  );
}

/**
 * Mobile-first chrome: the nav is a bottom bar on a phone and a top bar from
 * `sm` up, so every view is reachable one-handed at 390px.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <span className="text-base font-semibold tracking-tight text-slate-900">Wroom</span>

          <nav className="hidden gap-1 sm:flex">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {isAuthConfigured ? <SignOutButton /> : null}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:pb-12">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white sm:hidden">
        <div className="flex">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex-1 py-3 text-center text-xs font-medium ${
                  isActive ? 'text-slate-900' : 'text-slate-500'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
