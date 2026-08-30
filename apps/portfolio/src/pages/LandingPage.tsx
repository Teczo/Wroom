import { FeaturedProjects } from '../features/landing/FeaturedProjects';
import { Hero } from '../features/landing/Hero';
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
      {data ? (
        <Hero data={data} />
      ) : null}

      {data ? <StatsBand stats={data.stats} marks={data.marks} /> : null}

      <FeaturedProjects
        limit={featuredLimit}
        intro={data?.featuredIntro ?? ''}
        enabled={featuredEnabled}
      />

      {data ? <LandingBottom data={data} /> : null}
    </>
  );
}
