import {
  PUBLISH_GATE_MESSAGES,
  VISIBILITIES,
  type PortfolioFeatureCard,
  type PortfolioKeyModule,
  type PublishGateResult,
} from '@wroom/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/Pill';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { useAssets } from '../../features/assets/api';
import {
  DemoVideoEditor,
  FeatureCardsEditor,
  KeyModulesEditor,
  OptionalSection,
  SectionHeading,
  demoVideoProblem,
  type DemoVideoDraft,
} from '../../features/portfolio/sections';
import { AssetPicker, MarkMultiSelect } from '../../features/portfolio/pickers';
import { projectKeys, useProject } from '../../features/projects/api';
import { ApiRequestError, apiPatchWithMeta } from '../../lib/api';
import { humanise, shortDate } from '../../lib/format';

/**
 * The portfolio tab — everything the public project page renders, authored in
 * one form: the header, the optional body sections, the marks it shows, and the
 * case study narrative.
 *
 * A case study is still edited as the first of the list. WRM-082 brought the
 * many-case-studies model in; the screen for the rest is not built.
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
  const [ogAssetId, setOgAssetId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState('private');
  const [featured, setFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState('0');

  // --- the header ---
  const [category, setCategory] = useState('');
  const [tagline, setTagline] = useState('');
  const [overview, setOverview] = useState('');
  const [liveUrl, setLiveUrl] = useState('');

  // --- body sections, each of which hides entirely when empty ---
  const [featureCards, setFeatureCards] = useState<PortfolioFeatureCard[]>([]);
  const [keyModules, setKeyModules] = useState<PortfolioKeyModule[]>([]);
  const [hasMetric, setHasMetric] = useState(false);
  const [metricValue, setMetricValue] = useState('');
  const [metricLabel, setMetricLabel] = useState('');
  // Distinct from the case study's own testimonial below — a project may carry
  // one and a case study another, and they are different fields.
  const [hasProjectTestimonial, setHasProjectTestimonial] = useState(false);
  const [projectQuote, setProjectQuote] = useState('');
  const [projectAttribution, setProjectAttribution] = useState('');
  const [hasDemoVideo, setHasDemoVideo] = useState(false);
  const [demo, setDemo] = useState<DemoVideoDraft>({
    provider: 'blob',
    assetId: null,
    externalId: '',
    posterAssetId: null,
  });

  // --- reference data ---
  const [techStackKeys, setTechStackKeys] = useState<string[]>([]);
  const [platformKeys, setPlatformKeys] = useState<string[]>([]);
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
    setOgAssetId(portfolio.ogAssetId);
    setVisibility(portfolio.visibility);
    setFeatured(portfolio.featured);
    setSortOrder(String(portfolio.sortOrder ?? 0));

    setCategory(portfolio.category);
    setTagline(portfolio.tagline);
    setOverview(portfolio.overview);
    setLiveUrl(portfolio.liveUrl ?? '');

    setFeatureCards(portfolio.featureCards);
    setKeyModules(portfolio.keyModules);
    setHasMetric(Boolean(portfolio.headlineMetric));
    setMetricValue(portfolio.headlineMetric?.value ?? '');
    setMetricLabel(portfolio.headlineMetric?.label ?? '');
    setHasProjectTestimonial(Boolean(portfolio.testimonial));
    setProjectQuote(portfolio.testimonial?.quote ?? '');
    setProjectAttribution(portfolio.testimonial?.attribution ?? '');
    setHasDemoVideo(Boolean(portfolio.demoVideo));
    if (portfolio.demoVideo) {
      setDemo({
        provider: portfolio.demoVideo.provider,
        assetId: portfolio.demoVideo.assetId,
        externalId: portfolio.demoVideo.externalId ?? '',
        posterAssetId: portfolio.demoVideo.posterAssetId,
      });
    }

    setTechStackKeys(portfolio.techStackKeys);
    setPlatformKeys(portfolio.platformKeys);

    setLoaded(true);
  }

  if (project.isPending) {
    return (
      <>
        <PageHeader title="Portfolio" />
        <LoadingState label="Loading the project…" />
      </>
    );
  }

  if (project.isError) {
    return (
      <>
        <PageHeader title="Portfolio" />
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

  const videoProblem = hasDemoVideo ? demoVideoProblem(demo) : null;

  function submit(nextVisibility = visibility): void {
    setSaved(null);

    // Mirrors the shared schema rather than letting the server say no. The
    // poster rule is the one a person hits, and finding out after a round trip
    // means scrolling back up a long form to see why.
    if (videoProblem) return;

    save.mutate(
      {
        visibility: nextVisibility,
        featured,
        sortOrder: Number(sortOrder) || 0,
        heroAssetId,
        ogAssetId,

        category,
        tagline,
        overview,
        // An empty box means "no link", which is null — not an empty string the
        // public site would render as a dead button.
        liveUrl: liveUrl.trim() === '' ? null : liveUrl.trim(),

        featureCards,
        keyModules,
        // Every optional section clears to null, never to an object of empty
        // strings: the public site drops a section that is null and would
        // render an empty heading for one that is merely blank (§7.4).
        headlineMetric:
          hasMetric && metricValue.trim() !== ''
            ? { value: metricValue, label: metricLabel }
            : null,
        testimonial:
          hasProjectTestimonial && projectQuote.trim() !== ''
            ? { quote: projectQuote, attribution: projectAttribution }
            : null,
        demoVideo: hasDemoVideo
          ? {
              provider: demo.provider,
              // Only the half that matches the provider is sent; the other is
              // null rather than a stale value from before the switch.
              assetId: demo.provider === 'blob' ? demo.assetId : null,
              externalId: demo.provider === 'blob' ? null : demo.externalId.trim() || null,
              posterAssetId: demo.posterAssetId,
            }
          : null,

        techStackKeys,
        platformKeys,
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
        title={`${project.data.name} — portfolio`}
        subtitle="Everything the public project page shows. Nothing here publishes — that is a separate action."
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
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Header</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            The chip, title and paragraph at the top of the public project page.
          </p>
        </div>

        <Field
          label="Category"
          htmlFor="pf-category"
          error={errors.category}
          hint="The small chip above the title, e.g. “XR / Web Platform”."
        >
          <input
            id="pf-category"
            className={inputClasses}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          />
        </Field>

        <Field label="Tagline" htmlFor="pf-tagline" error={errors.tagline}>
          <input
            id="pf-tagline"
            className={inputClasses}
            value={tagline}
            onChange={(event) => setTagline(event.target.value)}
            placeholder="XR Digital Twin Platform for AECO & Energy"
          />
        </Field>

        <Field
          label="Overview"
          htmlFor="pf-overview"
          error={errors.overview}
          hint={`One paragraph under the tagline. ${overview.length} characters.`}
        >
          <textarea
            id="pf-overview"
            className={`${inputClasses} min-h-24`}
            value={overview}
            onChange={(event) => setOverview(event.target.value)}
          />
        </Field>

        <Field
          label="Live URL"
          htmlFor="pf-liveurl"
          error={errors.liveUrl}
          hint="Where “Visit Platform” goes. Typed here, not taken from an environment — the two are not always the same page. Leave empty for no button."
        >
          <input
            id="pf-liveurl"
            type="url"
            inputMode="url"
            className={inputClasses}
            value={liveUrl}
            // Trimmed as it is typed. `type="url"` means the browser's own
            // validation runs on submit, and a value of nothing but spaces is
            // invalid to it — which would block the whole form with no visible
            // cause. Empty is valid, so clearing the box stays a clear.
            onChange={(event) => setLiveUrl(event.target.value.trim())}
            placeholder="https://…"
          />
        </Field>

        <SectionHeading
          title="Feature cards"
          hint="“Built for Complex Projects”. Leave empty and the section does not appear at all."
        />
        <FeatureCardsEditor cards={featureCards} onChange={setFeatureCards} />

        <SectionHeading
          title="Key modules"
          hint="“Key Modules”. Same again — no modules, no section."
        />
        <KeyModulesEditor modules={keyModules} onChange={setKeyModules} />

        <SectionHeading title="Headline metric" hint="One big number, or nothing." />
        <OptionalSection
          enabled={hasMetric}
          onToggle={setHasMetric}
          label="Show a headline metric"
          offHint="Off, so the public page shows no metric."
        >
          <Field label="Value" htmlFor="pf-metric-value" required error={errors['headlineMetric.value']}>
            <input
              id="pf-metric-value"
              className={inputClasses}
              value={metricValue}
              onChange={(event) => setMetricValue(event.target.value)}
              placeholder="40%"
            />
          </Field>
          <Field label="Label" htmlFor="pf-metric-label" error={errors['headlineMetric.label']}>
            <input
              id="pf-metric-label"
              className={inputClasses}
              value={metricLabel}
              onChange={(event) => setMetricLabel(event.target.value)}
              placeholder="Faster Decision Making"
            />
          </Field>
        </OptionalSection>

        <SectionHeading
          title="Testimonial"
          hint="A quote about the project as a whole. The case study below can carry its own, separately."
        />
        <OptionalSection
          enabled={hasProjectTestimonial}
          onToggle={setHasProjectTestimonial}
          label="Show a testimonial"
          offHint="Off, so the public page shows no quote for the project."
        >
          <Field label="Quote" htmlFor="pf-quote" required error={errors['testimonial.quote']}>
            <textarea
              id="pf-quote"
              className={`${inputClasses} min-h-20`}
              value={projectQuote}
              onChange={(event) => setProjectQuote(event.target.value)}
            />
          </Field>
          <Field label="Attribution" htmlFor="pf-attr" error={errors['testimonial.attribution']}>
            <input
              id="pf-attr"
              className={inputClasses}
              value={projectAttribution}
              onChange={(event) => setProjectAttribution(event.target.value)}
              placeholder="Operations lead, Acme"
            />
          </Field>
        </OptionalSection>

        <SectionHeading title="Demo video" hint="One video, with a poster image." />
        <OptionalSection
          enabled={hasDemoVideo}
          onToggle={setHasDemoVideo}
          label="Show a demo video"
          offHint="Off, so the public page shows no video."
        >
          <DemoVideoEditor
            draft={demo}
            onChange={setDemo}
            videoAssets={allAssets.filter((asset) => asset.kind === 'video')}
            posterAssets={allAssets.filter((asset) => asset.kind !== 'video' && asset.kind !== 'document')}
          />
        </OptionalSection>

        <SectionHeading
          title="Tech and platforms"
          hint="Picked from the media library, so one edit to a mark updates every project that uses it."
        />
        <Field label="Tech stack" htmlFor="pf-tech" error={errors.techStackKeys}>
          <MarkMultiSelect value={techStackKeys} onChange={setTechStackKeys} kinds={['tech']} />
        </Field>
        <Field label="Platforms" htmlFor="pf-platforms" error={errors.platformKeys}>
          <MarkMultiSelect value={platformKeys} onChange={setPlatformKeys} kinds={['platform']} />
        </Field>

        <SectionHeading
          title="Share image"
          hint="Used when a link to this project is posted somewhere. Falls back to the hero if empty."
        />
        <Field label="Open Graph image" htmlFor="pf-og" error={errors.ogAssetId}>
          <AssetPicker
            id="pf-og"
            value={ogAssetId}
            onChange={setOgAssetId}
            assets={heroCandidates}
            emptyLabel="Use the hero image"
          />
        </Field>

        <Field
          label="Sort order"
          htmlFor="pf-sort"
          error={errors.sortOrder}
          hint="Lower comes first in the public work index."
        >
          <input
            id="pf-sort"
            type="number"
            inputMode="numeric"
            className={inputClasses}
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
          />
        </Field>

        <SectionHeading
          title="Case study"
          hint="The narrative a client or an employer reads."
        />

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
          {save.isPending ? 'Saving…' : 'Save portfolio'}
        </Button>
      </form>
    </>
  );
}
