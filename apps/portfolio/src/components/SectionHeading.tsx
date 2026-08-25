import { type ReactNode } from 'react';

/**
 * The small pill above a section, and the section heading it belongs to.
 *
 * Space Grotesk, uppercased and letterspaced, rather than the monospace of the
 * design reference: §7.2 allows two families and adding a third self-hosted
 * face is a decision above a session.
 */
export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-border bg-accent-soft px-3 py-1.5 font-heading text-xs font-medium uppercase tracking-[0.12em] text-accent ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * A section's label.
 *
 * `title` is optional and most sections do not pass one. The design reference
 * heads each section with a written line — "Real Projects. Real Applications.",
 * "See FusionSite 360XR in Action" — and there is no field behind any of them.
 * Inventing that copy to match a picture is what §2 rule 8 forbids, so a
 * section carries the structural label it has always had and nothing more.
 * "Built for Complex Projects" is the exception, and only because
 * `docs/DATA_MODEL.md` names it as the heading for `featureCards`.
 */
export function SectionHeading({
  eyebrow,
  title,
  className = '',
}: {
  eyebrow: string;
  title?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Eyebrow>{eyebrow}</Eyebrow>
      {title ? (
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{title}</h2>
      ) : null}
    </div>
  );
}
