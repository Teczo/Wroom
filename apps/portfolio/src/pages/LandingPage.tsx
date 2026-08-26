import { FeaturedProjects } from '../features/landing/FeaturedProjects';
import { Hero } from '../features/landing/Hero';
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
 * The bar at the foot of the page is the site's one CTA, and the social row
 * beside it is from the same record — the design puts both under the work
 * rather than in the hero.
 *
 * The hero is told how many projects to expect and when to ask, because the
 * phone on it is built from the same list as the row below: one query, asked
 * once, drawn twice.
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
        <Hero data={data} featuredLimit={featuredLimit} featuredEnabled={featuredEnabled} />
      ) : null}
      <FeaturedProjects
        limit={featuredLimit}
        intro={data?.featuredIntro ?? ''}
        enabled={featuredEnabled}
      />
      {data ? <LandingBottom data={data} /> : null}
    </>
  );
}
