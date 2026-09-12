import { Achievements } from '../features/landing/Achievements';
import { FeaturedProjects } from '../features/landing/FeaturedProjects';
import { Hero } from '../features/landing/Hero';
import { HeroBackdrop } from '../features/landing/HeroBackdrop';
import { StatsBand } from '../components/StatsBand';
import { LandingBottom } from '../features/landing/LandingBottom';
import { FALLBACK_FEATURED_LIMIT, readLandingData } from '../features/landing/landingData';
import { usePublishedContent } from '../features/content/api';
import { useDocumentMeta } from '../lib/useDocumentMeta';

/**
 * The front door.
 *
 * Two things build it: the published `landing` record and the published
 * projects. Nothing on it is written in this repo — changing the greeting is an
 * edit and a publish, not a deploy (§13.6).
 *
 * A record that is missing, unpublished or still in flight is not an error
 * state here. The hero simply has nothing to say and does not render, and the
 * work below carries the page — which is also what a half-written landing
 * record looks like, one section at a time (§7.4).
 *
 * The projects wait for the content record because it says how many of them to
 * ask for. That wait is the row's loading state, not a blank page.
 *
 * The band of counts sits between the hero and the work, which is where the
 * design puts it: the last thing read before the projects themselves. It is
 * from the same record and disappears entirely when nothing is written in it.
 *
 * The bar at the foot of the page is the site's one CTA, and the social row
 * beside it is from the same record — the design puts both under the work
 * rather than in the hero.
 *
 * The hero asks for nothing of its own. It is the record and the portrait, so
 * the only query on this page is the row's.
 */
export function LandingPage() {
  const content = usePublishedContent('landing');
  const data = readLandingData(content.data?.data);

  const featuredLimit = data?.featuredLimit ?? FALLBACK_FEATURED_LIMIT;
  const featuredEnabled = !content.isPending;

  useDocumentMeta(
    content.data?.meta.title || content.data?.title || '',
    content.data?.meta.description ?? '',
  );

  return (
    <>
      {/*
       * The hero and the counts share one box, because from `lg` up they share
       * one picture: the published backdrop sits behind both and reaches up
       * past the top of the hero to pass behind the header pill as well. That
       * is why the plate is mounted here rather than inside the hero — the hero
       * is not the only thing standing on it.
       *
       * `relative` is what the plate is positioned against. Below `lg` there is
       * no plate and this box is two sections in a row, exactly as before.
       */
      data ? (
        <div
          /*
           * The floor under the hero while the record is still in flight.
           *
           * `readLandingData` parses `undefined` into a fully defaulted record
           * rather than a failure, so `data` is truthy from the very first
           * render and this box is always mounted — it is simply empty until
           * the request lands, because every section inside it decides it has
           * nothing to show (§7.4). Empty means zero height.
           *
           * The shell is `min-h-dvh` with `main` taking up the slack, so a page
           * whose middle is zero high lays the footer neatly against the bottom
           * of the viewport. Two hundred milliseconds later the record arrives,
           * this box goes from nothing to the better part of a thousand pixels,
           * and the footer is yanked off the bottom of the screen. It measures
           * as a 0.31 layout shift and it reads as the page flinching.
           *
           * Holding the hero's own floor while the query is pending is enough
           * to stop it: the footer starts below the fold, which is where it
           * ends up, so it never travels anywhere a visitor can see. The height
           * does not have to be exact — only tall enough to put the footer off
           * screen — so it is the `lg:min-h-[34rem]` the hero gives itself when
           * it has a backdrop, applied at every width and only while waiting.
           *
           * It is released the moment the request settles. A record with no
           * hero in it still renders nothing at all, rather than reserving a
           * screen of emptiness for content that is never coming.
           */
          /*
           * The padding at the foot is the backdrop's room to end in. The plate
           * is `bottom-0` against this box, so this is what carries it on past
           * the band of counts and gives the mask something to fade over —
           * `--hero-backdrop-fade` is the same value the mask uses, named once
           * in `index.css`.
           *
           * `lg` only, because the backdrop is `lg` only. Below that there is
           * no plate, nothing to seam, and §7.7 has already said what the foot
           * of the hero does on a phone.
           */
          className={`relative ${content.isPending ? 'min-h-[34rem]' : ''} lg:pb-[var(--hero-backdrop-fade)]`}
        >
          <HeroBackdrop background={data.heroBackground} />
          <Hero data={data} />
          {/* Over the plate, not under it. */}
          <div className="relative z-10">
            <StatsBand
              stats={data.stats}
              marks={data.marks}
              /*
               * Translucent from `lg`, where the backdrop is behind it and the
               * reference shows the room through the panel. Below `lg` there is
               * no backdrop, so it stays the opaque band the about page has.
               */
              panelClassName="bg-surface-deep lg:bg-surface-deep/80 lg:backdrop-blur-xl"
            />
          </div>
        </div>
      ) : null}

      {/*
       * Between the hero and the work, which is where the page argues for
       * itself before it starts showing evidence. It decides for itself whether
       * it has anything to say (§7.4), so there is no condition here.
       */}
      {data ? <Achievements title={data.achievementsTitle} items={data.achievementItems} /> : null}

      <FeaturedProjects
        limit={featuredLimit}
        intro={data?.featuredIntro ?? ''}
        enabled={featuredEnabled}
      />

      {data ? <LandingBottom data={data} /> : null}
    </>
  );
}
