import { VISIBILITIES, type Project } from '@wroom/shared';
import { Link } from 'react-router-dom';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
import { ApiRequestError } from '../../lib/api';
import { humanise, shortDate } from '../../lib/format';
import { usePublishProject, useUnpublishProject, useUpdateProjectPortfolio } from './api';

/**
 * Publishing is an explicit action that writes the portfolio snapshot. Saving a
 * project never publishes it, and the visibility control below only changes one
 * of the three gates — the API still decides.
 */
export function PublishPanel({ project }: { project: Project }) {
  // The portfolio endpoint, not the project one — this writes a single key
  // under `portfolio` and must not disturb the rest of it. See the hook.
  const update = useUpdateProjectPortfolio(project._id);
  const publish = usePublishProject(project._id);
  const unpublish = useUnpublishProject(project._id);

  const blockedReasons =
    publish.error instanceof ApiRequestError && Array.isArray(publish.error.details?.reasons)
      ? (publish.error.details.reasons as string[])
      : [];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Portfolio</h3>
      <p className="mt-1 text-xs text-slate-500">
        {project.portfolio.publishedAt
          ? `Published ${shortDate(project.portfolio.publishedAt)}. Republish to push your latest changes.`
          : 'Not published. Nothing reaches the public site until you publish it here.'}
      </p>

      {/*
       * The way in to the portfolio editor. Everything the public page shows
       * beyond the name and the hero — the category, the tagline, the overview,
       * the capability cards, the modules, the video, the case studies, the
       * tech and platform marks — is written on that screen and nowhere else.
       * Its route existed with nothing linking to it, so the fields behind it
       * could only be reached by typing the URL.
       */}
      <Link
        to={`/projects/${project._id}/case-study`}
        className="mt-3 inline-block text-xs font-medium text-slate-900 underline"
      >
        Edit the portfolio page →
      </Link>

      <div className="mt-4 max-w-xs">
        <Field label="Visibility" htmlFor="portfolio-visibility">
          <select
            id="portfolio-visibility"
            className={inputClasses}
            value={project.portfolio.visibility}
            disabled={update.isPending}
            onChange={(event) => update.mutate({ visibility: event.target.value })}
          >
            {VISIBILITIES.map((value) => (
              <option key={value} value={value}>
                {humanise(value)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {blockedReasons.length > 0 ? (
        <ul className="mt-4 space-y-1 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          {blockedReasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}

      {publish.isError && blockedReasons.length === 0 ? (
        <p className="mt-4 text-xs text-red-600">
          {publish.error instanceof ApiRequestError
            ? publish.error.message
            : 'That could not be published.'}
        </p>
      ) : null}

      {unpublish.isError ? (
        <p className="mt-4 text-xs text-red-600">
          {unpublish.error instanceof ApiRequestError
            ? unpublish.error.message
            : 'That could not be unpublished.'}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => publish.mutate()} disabled={publish.isPending}>
          {publish.isPending
            ? 'Publishing…'
            : project.portfolio.publishedAt
              ? 'Republish'
              : 'Publish to portfolio'}
        </Button>

        {project.portfolio.publishedAt ? (
          <Button
            variant="secondary"
            onClick={() => unpublish.mutate()}
            disabled={unpublish.isPending}
          >
            {unpublish.isPending ? 'Removing…' : 'Unpublish'}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
