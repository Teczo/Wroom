import { Mark, findMark } from '../../components/Mark';
import { Markdown } from '../../components/Markdown';
import { panelClass } from '../../components/Panel';
import { Terminal } from '../../components/Terminal';
import type { AboutData } from '../content/pageData';

/**
 * The top of the about page: who you are, the four tiles, and the screen.
 *
 * Every word is the published `about` record — the headline, the line under it,
 * the narrative in `body` and the tiles (§2 rule 8). A field left empty is a
 * piece that does not render rather than an empty heading (§7.4).
 *
 * Two columns at `lg`: the words with the tiles under them, and the screen with
 * the portrait standing in front of it. The reference sets a third column of
 * panels beside these; at this page's width three columns leave the terminal
 * too narrow to read, so those panels are the row underneath instead.
 *
 * Below `lg` the terminal goes — it is decoration, and a phone gets the words
 * instead — and the portrait keeps its place, because on this page of all pages
 * the picture is content rather than ornament.
 *
 * Nothing here animates. This is the top of the page, so it is painted rather
 * than arriving (§7.5).
 */
export function AboutIntro({
  data,
  headline,
  body,
}: {
  data: AboutData;
  headline: string;
  body: string;
}) {
  const { subtitle, terminalLines, terminalTitle } = data;

  // A tile added in the portal and not yet typed is not a tile. Nothing here
  // demands both halves — a value with no label still says something — but a
  // row with neither is a draft in progress, not content (§7.4).
  const infoCards = data.infoCards.filter((card) => card.label !== '' || card.value !== '');
  const portrait = data.portrait;

  const hasTerminal = terminalLines.length > 0;
  const hasCentre = hasTerminal || portrait !== null;
  const hasWords = headline !== '' || subtitle !== '' || body !== '' || infoCards.length > 0;

  if (!hasWords && !hasCentre) return null;

  return (
    <section className="mx-auto max-w-6xl px-5 py-10 sm:py-12">
      <div
        className={`grid items-center gap-10 ${
          hasCentre ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]' : ''
        }`}
      >
        {hasWords ? (
          <div>
            {headline ? (
              <h1 className="text-4xl font-bold leading-[0.95] tracking-[-0.05em] text-fg sm:text-5xl lg:text-6xl">
                {headline}
              </h1>
            ) : null}

            {subtitle ? (
              <p className="mt-5 text-lg leading-snug text-fg sm:text-xl">{subtitle}</p>
            ) : null}

            {/*
             * The narrative. `Markdown`'s first paragraph carries its own top
             * margin, so this needs none of its own.
             */}
            {body ? (
              <div className="mt-2 max-w-prose text-muted [&_p]:text-base [&_p]:text-muted">
                <Markdown>{body}</Markdown>
              </div>
            ) : null}

            {/*
             * The tiles. A glyph the library never resolved leaves the tile its
             * words rather than a blank square beside them (§7.4), and the
             * definition list is what tells a screen reader that "Experience"
             * labels "6+ Years" rather than being a heading over it.
             */}
            {infoCards.length > 0 ? (
              <dl className="mt-8 grid gap-3 sm:grid-cols-2">
                {infoCards.map((card, index) => {
                  const mark = findMark(data.marks, card.mediaKey);

                  return (
                    <div
                      key={index}
                      className={`${panelClass} flex items-center gap-3.5 px-4 py-3`}
                    >
                      {mark ? (
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border-strong text-accent">
                          <Mark mark={mark} className="size-5" />
                        </span>
                      ) : null}

                      <div className="min-w-0">
                        {card.label ? (
                          <dt className="font-heading text-[0.625rem] font-medium uppercase tracking-[0.16em] text-muted">
                            {card.label}
                          </dt>
                        ) : null}
                        {card.value ? (
                          <dd className="mt-1 text-sm leading-snug text-fg">{card.value}</dd>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </dl>
            ) : null}
          </div>
        ) : null}

        {/*
         * The screen, with the portrait standing in front of it.
         *
         * At `lg` the picture is positioned over the foot of the terminal, the
         * way the reference composes them. It is placed with insets and `mx-auto`
         * rather than a centring translate on purpose: `index.css` strips every
         * transform under reduced motion, and a translated portrait would jump
         * out of the frame for exactly the people least likely to forgive it
         * (§7.5).
         *
         * With no terminal the picture is simply the column, at every width.
         */}
        {hasCentre ? (
          <div className="relative">
            {hasTerminal ? (
              <Terminal
                lines={terminalLines}
                title={terminalTitle}
                // The extra height is the room the portrait stands in. With no
                // portrait there is nothing to make room for, and reserving it
                // anyway leaves a panel with a foot of empty screen in it.
                className={`hidden lg:block ${portrait ? 'lg:min-h-[30rem]' : ''}`}
              />
            ) : null}

            {portrait ? (
              <img
                src={portrait.variants?.hero ?? portrait.url}
                alt={portrait.alt}
                className={`mx-auto w-auto max-w-full object-contain [-webkit-mask-image:linear-gradient(to_bottom,black_80%,transparent)] [mask-image:linear-gradient(to_bottom,black_80%,transparent)] ${
                  hasTerminal
                    ? 'max-h-80 lg:absolute lg:inset-x-0 lg:bottom-0 lg:max-h-[27rem]'
                    : 'max-h-[27rem]'
                }`}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
