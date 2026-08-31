import { Link } from 'react-router-dom';

import { Mark, findMark } from '../../components/Mark';
import { entering } from '../../lib/entrance';
import { useInView } from '../../lib/useInView';
import type { LandingData } from './landingData';

/**
 * The foot of the landing page: the social row and the site's one CTA.
 *
 * Both halves are the published `landing` record — `socials` and `ctaLabel` —
 * so the row that appears here and the words on the bar are an edit and a
 * publish (§2 rule 8). Either half missing and that half is not drawn; both
 * missing and the section does not exist (§7.4).
 *
 * Each link draws its mark from `data.marks`, which the publish action resolved
 * from the library. A key that resolved to nothing — no record, no markup, or a
 * mark whose usage was never approved — keeps its words instead of leaving a
 * blank square, and the row stays usable either way.
 *
 * At 390px the two halves stack and the bar goes full width (§7.7).
 *
 * The two halves arrive from opposite sides — the social row lifting, the bar
 * coming in from the right — which is the last piece of the page's motion
 * hierarchy: everything above has been leading here, and the CTA is the thing
 * that should look like it arrived last (§14, §20).
 */

/** Held between one social link and the next. */
const SOCIAL_STEP_MS = 60;

export function LandingBottom({ data }: { data: LandingData }) {
  const { ref, inView } = useInView<HTMLElement>();

  const socials = data.socials.filter((social) => social.mediaKey !== '' && social.url !== '');
  const hasCta = data.ctaLabel !== '';

  const ctaEnter = entering(inView, 'right', 180, 800);

  if (socials.length === 0 && !hasCta) return null;

  return (
    <section ref={ref} className="mx-auto max-w-6xl px-5 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {socials.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {socials.map((social, index) => {
              const mark = findMark(data.marks, social.mediaKey);
              const name = mark?.label || social.mediaKey;
              const enter = entering(inView, 'up', index * SOCIAL_STEP_MS, 550);

              return (
                <li key={social.mediaKey} style={enter.style} className={enter.className}>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    // The mark is `aria-hidden`, so the label on the link is
                    // what a screen reader announces — and with an icon in the
                    // tile it is the only thing that names the destination.
                    aria-label={mark ? name : undefined}
                    className="inline-flex h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-surface/60 px-3 font-heading text-xs font-medium capitalize text-muted [transition-property:color,border-color,box-shadow,transform] duration-300 ease-out-expo hover:-translate-y-0.5 hover:border-border-strong hover:text-accent hover:shadow-[0_8px_24px_var(--color-accent-glow)]"
                  >
                    {mark ? <Mark mark={mark} className="size-5" /> : name}
                  </a>
                </li>
              );
            })}
          </ul>
        ) : (
          // Holds the bar to the right of the row when there are no links, so
          // one authored half does not re-centre the other.
          <span aria-hidden />
        )}

        {hasCta ? (
          <Link
            to="/contact"
            style={ctaEnter.style}
            className={`group flex min-h-13 w-full items-center justify-between gap-6 rounded-xl border border-border bg-surface/60 py-3 pl-5 pr-4 [transition-property:opacity,transform,filter,border-color,box-shadow] ease-out-expo hover:border-border-strong hover:shadow-[0_14px_44px_var(--color-accent-glow)] sm:w-auto sm:min-w-80 ${ctaEnter.className}`}
          >
            <span className="text-sm text-fg">{data.ctaLabel}</span>
            {/*
             * The arrow leans towards where the link goes. Four pixels — it is
             * meant to be felt as the control answering, not watched.
             */}
            <span
              aria-hidden
              className="font-heading text-xl text-accent transition-transform duration-300 ease-out-expo group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        ) : null}
      </div>
    </section>
  );
}
