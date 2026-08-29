/**
 * The site's two button shapes, as a class string rather than a component.
 *
 * They have to land on an `<a>` for an external link, a `<Link>` for an
 * internal one and a `<button>` for an action, so a component here would need
 * to be polymorphic over all three to save nothing. `apps/portal` exports
 * `inputClasses` from `components/Field.tsx` for the same reason.
 *
 * The hover state lifts two pixels and brightens the glow underneath.
 * `index.css` strips every transform under `prefers-reduced-motion` (§7.5), so
 * the lift disappears there on its own and the colour change is what is left —
 * which is why the lift is decoration and never the only signal.
 *
 * The primary button carries its halo at rest rather than only on hover, as the
 * design draws it. It is a painted shadow, not an animation, so it is complete
 * on first paint and there is nothing in it for reduced motion to turn off —
 * which matters, because this button is above the fold (§7.5).
 *
 * The shadows live on the variants rather than on `base`: a resting glow on the
 * secondary button would make two primary buttons of them.
 */

const base =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border px-5 ' +
  'font-heading text-sm font-semibold transition duration-200 hover:-translate-y-0.5';

const variants = {
  primary:
    'border-accent bg-accent text-on-accent shadow-[0_6px_28px_var(--color-accent-halo)] ' +
    'hover:bg-accent-hover hover:shadow-[0_10px_38px_var(--color-accent-halo)]',
  secondary:
    'border-border bg-surface/40 text-fg hover:border-accent hover:text-accent ' +
    'hover:shadow-[0_8px_30px_var(--color-accent-glow)]',
} as const;

export type ButtonVariant = keyof typeof variants;

export function buttonClasses(variant: ButtonVariant = 'primary', className = ''): string {
  return `${base} ${variants[variant]} ${className}`;
}
