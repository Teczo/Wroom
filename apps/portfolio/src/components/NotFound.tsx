import { Link } from 'react-router-dom';

/**
 * Shown for a route that does not exist, and for a page whose content has not
 * been published — from outside, those are the same thing, and saying so is
 * better than a blank shell.
 */
export function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-24 text-center">
      <p className="text-base font-medium text-slate-900">Page not found</p>
      <Link to="/work" className="mt-4 inline-block text-sm font-medium text-slate-900 underline">
        See the work
      </Link>
    </div>
  );
}
