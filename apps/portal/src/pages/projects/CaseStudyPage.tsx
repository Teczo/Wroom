import { PUBLISH_GATE_MESSAGES, VISIBILITIES, type PublishGateResult } from '@wroom/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/Pill';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { useAssets } from '../../features/assets/api';
import { projectKeys, useProject } from '../../features/projects/api';
import { ApiRequestError, apiPatchWithMeta } from '../../lib/api';
import { humanise, shortDate } from '../../lib/format';

/**
 * The case study — the part a client or an employer actually reads.
 *
 * Nothing here publishes. Making a project public marks it eligible; the
 * portfolio only changes when someone runs the publish action.
 */

type Metric = { label: string; value: string };

const PROSE_FIELDS = [
  { key: 'problem', label: 'The problem', hint: 'What was wrong, or what did not exist yet. Two or three sentences.' },
  { key: 'role', label: 'Your role', hint: 'What you personally did. Be specific — "built the API" beats "involved in delivery".' },
  { key: 'approach', label: 'The approach', hint: 'How you solved it, and the decision worth mentioning.' },
  { key: 'outcome', label: 'The outcome', hint: 'What changed as a result. Numbers if you have them.' },
] as const;

export function CaseStudyPage() {
  const { id = '' } = useParams();
  const client = useQueryClient();
  const project = useProject(id);
  const assets = useAssets(id);

  const [saved, setSaved] = useState<{
    publishState: PublishGateResult;
    blockingProductName: string | null;
  } | null>(null);

  const save = useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      apiPatchWithMeta<
        unknown,
        { publishState: PublishGateResult; blockingProductName: string | null }
      >(`/api/projects/${id}/portfolio`, input),
    onSuccess: async (result) => {
      // The verdict comes from the shared gate function on the server; this
      // screen renders it and works nothing out for itself.
      setSaved(result.meta);
      await client.invalidateQueries({ queryKey: projectKeys.detail(id) });
    },
  });

  const portfolio = project.data?.portfolio;

  const [problem, setProblem] = useState('');
  const [role, setRole] = useState('');
  const [approach, setApproach] = useState('');
  const [outcome, setOutcome] = useState('');
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [quote, setQuote] = useState('');
  const [attribution, setAttribution] = useState('');
  const [hasTestimonial, setHasTestimonial] = useState(false);
  const [heroAssetId, setHeroAssetId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState('private');
  const [featured, setFeatured] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [confirmingPublic, setConfirmingPublic] = useState<string | null>(null);

  // Seed the form once the project arrives, then leave it to the user.
  if (portfolio && !loaded) {
    // A project now holds many case studies. This editor still writes the
    // first one — the multi-case-study UI is not built yet (WRM-082 covered
    // the data model only), and reading [0] is what the single object used
    // to be. A project with none yet edits into a new first entry.
    const study = portfolio.caseStudies[0];
    setProblem(study?.problem ?? '');
    setRole(study?.role ?? '');
    setApproach(study?.approach ?? '');
    setOutcome(study?.outcome ?? '');
    setMetrics(study?.metrics ?? []);
    setQuote(study?.testimonial?.quote ?? '');
    setAttribution(study?.testimonial?.attribution ?? '');
    setHasTestimonial(Boolean(study?.testimonial));
    setHeroAssetId(portfolio.heroAssetId);
    setVisibility(portfolio.visibility);
    setFeatured(portfolio.featured);
    setLoaded(true);
  }

  if (project.isPending) {
    return (
      <>
        <PageHeader title="Case study" />
        <LoadingState label="Loading the project…" />
      </>
    );
  }

  if (project.isError) {
    return (
      <>
        <PageHeader title="Case study" />
        <ErrorState error={project.error} onRetry={() => void project.refetch()} />
      </>
    );
  }

  const errors = save.error instanceof ApiRequestError ? save.error.fieldErrors : {};
  const allAssets = assets.data?.items ?? [];
  // Only a public asset can be a hero — a private one would be a hole in the
  // portfolio where an image should be.
  const heroCandidates = allAssets.filter((asset) => asset.visibility === 'public');
  const privateCount = allAssets.length - heroCandidates.length;

  const publishedAt = project.data.portfolio.publishedAt;
  const staleSincePublish =
    publishedAt !== null && new Date(project.data.updatedAt) > new Date(publishedAt);

  /**
   * The first case study, or the shell of one for a project that has none yet.
   * Read out here, where the project is known to have loaded.
   */
  const existingCaseStudy = portfolio?.caseStudies[0] ?? {
    slug: project.data.slug,
    sector: '',
    title: project.data.name,
    summary: '',
    heroAssetId: null,
    sortOrder: 0,
  };

  function submit(nextVisibility = visibility): void {
    setSaved(null);

    save.mutate(
      {
        visibility: nextVisibility,
        featured,
        heroAssetId,
        // Keeps whatever the first entry already had — its slug above all,
        // which is what a case study is addressed by — and replaces only the
        // fields this form owns.
        caseStudies: [
          {
            ...existingCaseStudy,
            problem,
            role,
            approach,
            outcome,
            metrics,
            // Cleared means null, not an object of empty strings.
            testimonial: hasTestimonial && quote.trim() ? { quote, attribution } : null,
          },
        ],
      },
      {
        onSuccess: (_data, _vars, _ctx) => {
          setVisibility(nextVisibility);
          setConfirmingPublic(null);
        },
      },
    );
  }

  return (
    <>
      <PageHeader
        title={`${project.data.name} — case study`}
        subtitle="What it was for, what you did, and what changed. This is what gets published."
        actions={
          <Link to={`/projects/${id}`} className="text-sm text-slate-500 hover:text-slate-900">
            Back to project
          </Link>
        }
      />

      {publishedAt === null ? (
        <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          Not published yet. Saving here only stores the content — publishing is a separate action
          on the project page.
        </p>
      ) : staleSincePublish ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Edited since it was last published on {shortDate(publishedAt)}. The portfolio still shows
          the older version until you publish again from the project page.
        </p>
      ) : null}

      {saved ? (
        <div
          className={`mb-4 rounded-lg border p-3 ${
            saved.publishState.publishable
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          <p className="text-sm font-medium text-slate-900">Saved.</p>
          {saved.publishState.publishable ? (
            <p className="mt-0.5 text-xs text-emerald-800">
              This project is eligible for the portfolio. Nothing is live until you publish it.
            </p>
          ) : (
            <ul className="mt-1 list-disc pl-4 text-xs text-amber-800">
              {saved.publishState.blockedBy
                .filter((reason) => reason !== 'asset-not-public')
                .map((reason) => (
                  <li key={reason}>
                    {reason === 'product-nda-restricted' && saved.blockingProductName
                      ? `${saved.blockingProductName} is NDA restricted, so nothing under it can be published.`
                      : PUBLISH_GATE_MESSAGES[reason]}
                  </li>
                ))}
            </ul>
          )}
        </div>
      ) : null}

      <form
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {PROSE_FIELDS.map((field) => {
          const value = { problem, role, approach, outcome }[field.key];
          const setter = { problem: setProblem, role: setRole, approach: setApproach, outcome: setOutcome }[
            field.key
          ];

          return (
            <Field
              key={field.key}
              label={field.label}
              htmlFor={`cs-${field.key}`}
              hint={`${field.hint} ${value.length} characters.`}
              error={errors[`caseStudies[0].${field.key}`]}
            >
              <textarea
                id={`cs-${field.key}`}
                rows={4}
                className={inputClasses}
                value={value}
                onChange={(event) => setter(event.target.value)}
              />
            </Field>
          );
        })}

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-slate-900">Metrics</legend>
          <p className="text-xs text-slate-500">
            The numbers worth leading with — “Load time”, “1.2s”. Shown in order.
          </p>

          {metrics.map((metric, index) => (
            <div key={index} className="flex flex-wrap items-end gap-2">
              <div className="min-w-0 flex-1">
                <Field label="Label" htmlFor={`metric-label-${index}`}>
                  <input
                    id={`metric-label-${index}`}
                    className={inputClasses}
                    value={metric.label}
                    onChange={(event) =>
                      setMetrics((current) =>
                        current.map((entry, at) =>
                          at === index ? { ...entry, label: event.target.value } : entry,
                        ),
                      )
                    }
                  />
                </Field>
              </div>
              <div className="min-w-0 flex-1">
                <Field label="Value" htmlFor={`metric-value-${index}`}>
                  <input
                    id={`metric-value-${index}`}
                    className={inputClasses}
                    value={metric.value}
                    onChange={(event) =>
                      setMetrics((current) =>
                        current.map((entry, at) =>
                          at === index ? { ...entry, value: event.target.value } : entry,
                        ),
                      )
                    }
                  />
                </Field>
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-9 px-2 text-xs"
                  disabled={index === 0}
                  onClick={() =>
                    setMetrics((current) => {
                      const next = [...current];
                      [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
                      return next;
                    })
                  }
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-9 px-2 text-xs"
                  disabled={index === metrics.length - 1}
                  onClick={() =>
                    setMetrics((current) => {
                      const next = [...current];
                      [next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
                      return next;
                    })
                  }
                >
                  ↓
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-9 px-2 text-xs text-red-600 hover:bg-red-50"
                  onClick={() => setMetrics((current) => current.filter((_, at) => at !== index))}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="secondary"
            className="min-h-9 text-xs"
            onClick={() => setMetrics((current) => [...current, { label: '', value: '' }])}
          >
            Add metric
          </Button>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-slate-900">Testimonial</legend>

          {hasTestimonial ? (
            <>
              <Field label="Quote" htmlFor="cs-quote" error={errors['caseStudies[0].testimonial.quote']}>
                <textarea
                  id="cs-quote"
                  rows={3}
                  className={inputClasses}
                  value={quote}
                  onChange={(event) => setQuote(event.target.value)}
                />
              </Field>
              <Field
                label="Who said it"
                htmlFor="cs-attribution"
                error={errors['caseStudies[0].testimonial.attribution']}
              >
                <input
                  id="cs-attribution"
                  className={inputClasses}
                  value={attribution}
                  onChange={(event) => setAttribution(event.target.value)}
                />
              </Field>
              <Button
                type="button"
                variant="ghost"
                className="min-h-9 text-xs text-red-600 hover:bg-red-50"
                onClick={() => {
                  setHasTestimonial(false);
                  setQuote('');
                  setAttribution('');
                }}
              >
                Remove the testimonial
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="secondary"
              className="min-h-9 text-xs"
              onClick={() => setHasTestimonial(true)}
            >
              Add a testimonial
            </Button>
          )}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-slate-900">Hero image</legend>

          {heroCandidates.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 p-4 text-xs text-slate-500">
              {allAssets.length === 0
                ? 'This project has no media yet. Upload something on the project page first.'
                : `${privateCount} file${privateCount === 1 ? '' : 's'} on this project, none of them public. A hero image appears on the public portfolio, so it has to be marked public in the media library first.`}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {heroCandidates.map((asset) => (
                  <button
                    key={asset._id}
                    type="button"
                    aria-pressed={heroAssetId === asset._id}
                    onClick={() => setHeroAssetId(heroAssetId === asset._id ? null : asset._id)}
                    className={`min-h-11 rounded-lg px-3 text-sm font-medium ${
                      heroAssetId === asset._id
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {asset.title || asset.filename}
                  </button>
                ))}
              </div>
              {privateCount > 0 ? (
                <p className="text-xs text-slate-500">
                  {privateCount} other file{privateCount === 1 ? ' is' : 's are'} not public, so
                  {privateCount === 1 ? ' it is' : ' they are'} not offered here.
                </p>
              ) : null}
            </>
          )}
          {errors.heroAssetId ? (
            <p className="text-xs text-red-600">{errors.heroAssetId}</p>
          ) : null}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-slate-900">Visibility</legend>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">Currently</span>
            <Pill
              label={humanise(visibility)}
              tone={visibility === 'public' ? 'red' : visibility === 'private' ? 'neutral' : 'blue'}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {VISIBILITIES.map((value) => (
              <Button
                key={value}
                type="button"
                variant={value === visibility ? 'primary' : 'secondary'}
                className="min-h-9 text-xs"
                disabled={value === visibility || save.isPending}
                onClick={() => {
                  if (value === 'public') setConfirmingPublic(value);
                  else submit(value);
                }}
              >
                {humanise(value)}
              </Button>
            ))}
          </div>

          {confirmingPublic ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-900">Make this project public?</p>
              <p className="mt-1 text-xs text-red-800">
                This makes it eligible for the public portfolio. It does not publish it — the
                portfolio only changes when you run the publish action on the project page.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="danger"
                  className="min-h-9 text-xs"
                  disabled={save.isPending}
                  onClick={() => submit('public')}
                >
                  {save.isPending ? 'Saving…' : 'Yes, mark it public'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-9 text-xs"
                  onClick={() => setConfirmingPublic(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="size-4 rounded border-slate-300"
              checked={featured}
              onChange={(event) => setFeatured(event.target.checked)}
            />
            Feature this near the top of the portfolio
          </label>
        </fieldset>

        {save.isError ? (
          <p className="text-sm text-red-600">
            {save.error instanceof ApiRequestError ? save.error.message : 'That could not be saved.'}
          </p>
        ) : null}

        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save case study'}
        </Button>
      </form>
    </>
  );
}
