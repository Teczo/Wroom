import { useAuth0 } from '@auth0/auth0-react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

import { useNewEnquiryCount } from '../features/enquiries/api';
import { isAuthConfigured } from '../lib/config';

const navigation = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/projects', label: 'Projects', end: false },
  { to: '/products', label: 'Products', end: false },
  { to: '/accounts', label: 'Accounts', end: false },
  { to: '/credentials', label: 'Keys', end: false },
  { to: '/content', label: 'Content', end: false },
  { to: '/enquiries', label: 'Inbox', end: false },
  { to: '/settings/project-types', label: 'Types', end: false },
  { to: '/settings/integrations', label: 'Sync', end: false },
];

/**
 * How many enquiries nobody has looked at yet. Shown wherever you are in the
 * app, because an unread enquiry is the one thing here that is someone else
 * waiting on you.
 */
function UnreadBadge() {
  const count = useNewEnquiryCount();

  if (!count.data) return null;

  return (
    <span
      className="ml-1 inline-flex min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold text-white"
      aria-label={`${count.data} unread`}
    >
      {count.data > 99 ? '99+' : count.data}
    </span>
  );
}

function SignOutButton({ className = '' }: { className?: string }) {
  const { logout, user } = useAuth0();

  return (
    <button
      onClick={() => void logout({ logoutParams: { returnTo: window.location.origin } })}
      className={`text-sm text-slate-500 hover:text-slate-900 ${className}`}
    >
      Sign out{user?.email ? ` (${user.email})` : ''}
    </button>
  );
}

/**
 * Mobile-first chrome: the nav is a bottom bar on a phone and a left sidebar
 * from `sm` up, so every view is reachable one-handed at 390px and one click
 * away on a wider screen.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-50">
      {/* On a phone the sidebar would eat the screen, so the top of the page
          carries the name and sign out only and the nav sits at the bottom. */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur sm:hidden">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <span className="text-base font-semibold tracking-tight text-slate-900">Wroom</span>
          {isAuthConfigured ? <SignOutButton className="shrink-0 truncate" /> : null}
        </div>
      </header>

      <aside className="fixed inset-y-0 left-0 z-10 hidden w-52 flex-col border-r border-slate-200 bg-white sm:flex lg:w-60">
        <span className="px-4 py-4 text-base font-semibold tracking-tight text-slate-900">
          Wroom
        </span>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <span className="truncate">{item.label}</span>
              {item.to === '/enquiries' ? <UnreadBadge /> : null}
            </NavLink>
          ))}
        </nav>

        {isAuthConfigured ? (
          <div className="border-t border-slate-200 px-4 py-3">
            <SignOutButton className="block w-full truncate text-left" />
          </div>
        ) : null}
      </aside>

      <div className="sm:pl-52 lg:pl-60">
        <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:pb-12">{children}</main>
      </div>

      {/*
       * The bar scrolls sideways rather than dividing 390px between every
       * item. Splitting it evenly broke the longer labels across two lines
       * once there were nine of them; keeping each label whole and letting the
       * few that do not fit sit just off the edge reads better on a phone.
       */}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white sm:hidden">
        <div className="flex overflow-x-auto">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `shrink-0 whitespace-nowrap px-4 py-3 text-center text-xs font-medium ${
                  isActive ? 'text-slate-900' : 'text-slate-500'
                }`
              }
            >
              {item.label}
              {item.to === '/enquiries' ? <UnreadBadge /> : null}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
