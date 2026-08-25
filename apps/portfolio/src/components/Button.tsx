/**
 * The site's two button shapes, as a class string rather than a component.
 *
 * They have to land on an `<a>` for an external link, a `<Link>` for an
 * internal one and a `<button>` for an action, so a component here would need
 * to be polymorphic over all three to save nothing. `apps/portal` exports
 * `inputClasses` from `components/Field.tsx` for the same reason.
 *
 * The hover state lifts two pixels and drops a soft green glow underneath.
 * `index.css` strips every transform under `prefers-reduced-motion` (§7.5), so
 * the lift disappears there on its own and the colour change is what is left —
 * which is why the lift is decoration and never the only signal.
 */

const base =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border px-5 ' +
  'font-heading text-sm font-semibold transition duration-200 ' +
  'hover:-translate-y-0.5 hover:shadow-[0_8px_30px_var(--color-accent-glow)]';

const variants = {
  primary: 'border-accent bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'border-border bg-surface/40 text-fg hover:border-accent hover:text-accent',
} as const;

export type ButtonVariant = keyof typeof variants;

export function buttonClasses(variant: ButtonVariant = 'primary', className = ''): string {
  return `${base} ${variants[variant]} ${className}`;
}
