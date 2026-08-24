import { FeaturedProjects } from '../features/landing/FeaturedProjects';
import { Hero } from '../features/landing/Hero';
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
 */
export function LandingPage() {
  const content = usePublishedContent('landing');
  const data = readLandingData(content.data?.data);

  useDocumentMeta(
    content.data?.meta.title || content.data?.title || '',
    content.data?.meta.description ?? '',
  );

  return (
    <>
      {data ? <Hero data={data} /> : null}
      <FeaturedProjects
        limit={data?.featuredLimit ?? FALLBACK_FEATURED_LIMIT}
        enabled={!content.isPending}
      />
    </>
  );
}
