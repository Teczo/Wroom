import { type ReactNode } from 'react';

/**
 * The card surface the whole public site is built from.
 *
 * A hairline border, a gradient lit from the top-left corner, and a wide soft
 * shadow underneath. The gradient is what separates a card from the canvas
 * without needing a heavier border — on a near-black page a bright edge reads
 * as a box drawn around the content rather than as the content sitting above it.
 *
 * The class is exported as well as the component because the same surface has
 * to land on an `<article>`, an `<li>` and a `<figure>`, and a wrapper `<div>`
 * around each of those would break the grid or the list semantics it sits in.
 * Every colour in it is a token — there is no hex here (§7.1).
 */
export const panelClass =
  'rounded-2xl border border-border ' +
  'bg-[linear-gradient(145deg,var(--color-surface),var(--color-surface-deep))] ' +
  'shadow-[0_20px_80px_var(--color-shadow)]';

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`${panelClass} ${className}`}>{children}</div>;
}
