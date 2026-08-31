import { Link } from 'react-router-dom';

import { Mark, findMark } from '../../components/Mark';
import { buttonClasses } from '../../components/Button';
import { panelClass } from '../../components/Panel';
import { Reveal } from '../../components/Reveal';
import type { AboutData } from '../content/pageData';

/**
 * The bar across the foot of the page: the closing line, the button and the
 * social row.
 *
 * All of it is the published `about` record. The button's words are `ctaLabel`
 * but its destination is not authored — it goes to the contact page, fixed
 * here, because an href written in the portal is a link on a public page that
 * nobody reviews. That is the same rule the landing hero's buttons follow.
 *
 * Each half disappears on its own and the panel disappears with both (§7.4). At
 * 390px the halves stack and the button is full width (§7.7).
 */
export function AboutBottom({ data }: { data: AboutData }) {
  const { ctaHeadline, ctaBody, ctaLabel } = data;

  // A row with no address is not a link. The mark alone would be a tile that
  // does nothing, so the row is dropped rather than drawn dead.
  const socials = data.socials.filter((social) => social.mediaKey !== '' && social.url !== '');

  const hasWords = ctaHeadline !== '' || ctaBody !== '';
  const hasButton = ctaLabel !== '';

  if (!hasWords && !hasButton && socials.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-5 pb-20">
      <Reveal>
        <div
          className={`${panelClass} flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between`}
        >
          {hasWords ? (
            <div>
              {ctaHeadline ? (
                <h2 className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">
                  {ctaHeadline}
                </h2>
              ) : null}

              {ctaBody ? (
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{ctaBody}</p>
              ) : null}
            </div>
          ) : null}

          {hasButton || socials.length > 0 ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:shrink-0">
              {hasButton ? (
                <Link to="/contact" className={buttonClasses('primary', 'w-full sm:w-auto')}>
                  {ctaLabel}
                  <span aria-hidden>→</span>
                </Link>
              ) : null}

              {socials.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {socials.map((social) => {
                    const mark = findMark(data.marks, social.mediaKey);
                    const name = mark?.label || social.mediaKey;

                    return (
                      <li key={social.mediaKey}>
                        <a
                          href={social.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          // `Mark` is `aria-hidden`, so with an icon in the tile
                          // this label is the only thing naming the destination.
                          aria-label={mark ? name : undefined}
                          className="inline-flex h-12 min-w-12 items-center justify-center rounded-lg border border-border bg-surface/60 px-3 font-heading text-xs font-medium capitalize text-muted transition-colors hover:border-border-strong hover:text-accent"
                        >
                          {mark ? <Mark mark={mark} className="size-5" /> : name}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </Reveal>
    </section>
  );
}
