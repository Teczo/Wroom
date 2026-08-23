import type { Asset, CaseStudyMetric, PortfolioCaseStudy } from '@wroom/shared';
import { useState } from 'react';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
import { AssetPicker } from './pickers';

/**
 * The case studies on a project — many per project, each with its own slug.
 *
 * Collapsed by default with one open at a time. Three of these expanded is four
 * screens of textareas on a phone, and the list stops being a list.
 */

const PROSE_FIELDS = [
  { key: 'problem', label: 'The problem', hint: 'What was wrong, or what did not exist yet.' },
  { key: 'role', label: 'Your role', hint: 'What you personally did. "Built the API" beats "involved in delivery".' },
  { key: 'approach', label: 'The approach', hint: 'How you solved it, and the decision worth mentioning.' },
  { key: 'outcome', label: 'The outcome', hint: 'What changed as a result. Numbers if you have them.' },
] as const;

/**
 * Title to slug, matching the `slug()` rule the shared schema enforces:
 * lowercase, alphanumeric, single hyphens, none at either end.
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Whether the slug is still tracking the title, or has been edited by hand.
 *
 * Compared against the title as it was *before* this keystroke: while the two
 * agree, the slug is following along and keeps following. The moment someone
 * types their own, they diverge and it is left alone from then on.
 *
 * Derived rather than remembered on purpose — a "user edited this one" flag
 * would be keyed by position, and reordering the list would move it onto the
 * wrong case study.
 */
function slugFollowsTitle(study: PortfolioCaseStudy): boolean {
  return study.slug === '' || study.slug === slugify(study.title);
}

/** Every reason a case study cannot be saved, keyed by index. */
export function caseStudyProblems(studies: PortfolioCaseStudy[]): Map<number, string> {
  const problems = new Map<number, string>();
  const seen = new Map<string, number>();

  studies.forEach((study, index) => {
    const slug = study.slug.trim();

    if (slug === '') {
      problems.set(index, 'Needs a slug — it is how this case study is addressed.');
      return;
    }

    if (slug !== slugify(slug)) {
      problems.set(index, 'Lowercase letters, numbers and single hyphens only.');
      return;
    }

    const first = seen.get(slug);
    if (first !== undefined) {
      problems.set(
        index,
        `"${slug}" is already used by case study ${first + 1}. Slugs have to be unique within a project.`,
      );
      return;
    }

    seen.set(slug, index);
  });

  return problems;
}

function MetricsEditor({
  metrics,
  onChange,
  idPrefix,
}: {
  metrics: CaseStudyMetric[];
  onChange: (next: CaseStudyMetric[]) => void;
  idPrefix: string;
}) {
  function move(from: number, to: number): void {
    if (to < 0 || to >= metrics.length) return;
    const next = [...metrics];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved as CaseStudyMetric);
    onChange(next);
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-medium text-slate-700">Metrics</legend>
      <p className="text-xs text-slate-500">
        The numbers worth leading with — “Load time”, “1.2s”. Shown in order.
      </p>

      {metrics.map((metric, index) => (
        <div key={index} className="flex flex-wrap items-end gap-2">
          <div className="min-w-24 flex-1">
            <Field label="Label" htmlFor={`${idPrefix}-ml-${index}`}>
              <input
                id={`${idPrefix}-ml-${index}`}
                className={inputClasses}
                value={metric.label}
                onChange={(event) =>
                  onChange(
                    metrics.map((entry, at) =>
                      at === index ? { ...entry, label: event.target.value } : entry,
                    ),
                  )
                }
              />
            </Field>
          </div>
          <div className="min-w-24 flex-1">
            <Field label="Value" htmlFor={`${idPrefix}-mv-${index}`}>
              <input
                id={`${idPrefix}-mv-${index}`}
                className={inputClasses}
                value={metric.value}
                onChange={(event) =>
                  onChange(
                    metrics.map((entry, at) =>
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
              aria-label={`Move metric ${index + 1} up`}
              onClick={() => move(index, index - 1)}
            >
              ↑
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-9 px-2 text-xs"
              disabled={index === metrics.length - 1}
              aria-label={`Move metric ${index + 1} down`}
              onClick={() => move(index, index + 1)}
            >
              ↓
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-9 px-2 text-xs text-red-600 hover:bg-red-50"
              aria-label={`Remove metric ${index + 1}`}
              onClick={() => onChange(metrics.filter((_, at) => at !== index))}
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
        onClick={() => onChange([...metrics, { label: '', value: '' }])}
      >
        Add metric
      </Button>
    </fieldset>
  );
}

export function CaseStudiesEditor({
  studies,
  onChange,
  heroCandidates,
  errors,
}: {
  studies: PortfolioCaseStudy[];
  onChange: (next: PortfolioCaseStudy[]) => void;
  heroCandidates: Asset[];
  errors: Record<string, string>;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const problems = caseStudyProblems(studies);

  function update(index: number, next: PortfolioCaseStudy): void {
    onChange(studies.map((study, at) => (at === index ? next : study)));
  }

  function move(from: number, to: number): void {
    if (to < 0 || to >= studies.length) return;

    const next = [...studies];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved as PortfolioCaseStudy);
    onChange(next);

    // Follow the one that moved, so the open panel does not jump to a
    // different case study underneath you.
    setOpenIndex((current) => (current === from ? to : current === to ? from : current));
  }

  function remove(index: number): void {
    onChange(studies.filter((_, at) => at !== index));
    setOpenIndex((current) => {
      if (current === index) return null;
      return current !== null && current > index ? current - 1 : current;
    });
  }

  function add(): void {
    onChange([
      ...studies,
      {
        slug: '',
        sector: '',
        title: '',
        summary: '',
        heroAssetId: null,
        problem: '',
        role: '',
        approach: '',
        outcome: '',
        metrics: [],
        testimonial: null,
        sortOrder: studies.length,
      },
    ]);
    // Open the new one — nobody adds a case study to leave it collapsed.
    setOpenIndex(studies.length);
  }

  return (
    <div className="space-y-2">
      {studies.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
          No case studies. The carousel is left off the public page entirely.
        </p>
      ) : null}

      {studies.map((study, index) => {
        const open = openIndex === index;
        const problem = problems.get(index);
        const idPrefix = `cs-${index}`;

        return (
          <div
            key={index}
            className={`rounded-lg border bg-white ${problem ? 'border-red-300' : 'border-slate-200'}`}
          >
            <div className="flex items-start gap-2 p-3">
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : index)}
                aria-expanded={open}
                className="min-w-0 flex-1 text-left"
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden className="text-xs text-slate-400">
                    {open ? '▾' : '▸'}
                  </span>
                  <span className="min-w-0 truncate text-sm font-medium text-slate-900">
                    {study.title.trim() || `Case study ${index + 1}`}
                  </span>
                </span>
                <span className="mt-0.5 block truncate pl-5 font-mono text-xs text-slate-500">
                  {study.slug.trim() || 'no slug yet'}
                  {study.sector.trim() ? ` · ${study.sector}` : ''}
                </span>
              </button>

              {/*
                * Reorder only. Removing lives inside the panel: at 390px a
                * third button here squeezes the title and slug into ellipses,
                * and a destructive action one thumb-width from the arrows is
                * the wrong thing to make easy.
                */}
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-9 px-2 text-xs"
                  disabled={index === 0}
                  aria-label={`Move case study ${index + 1} up`}
                  onClick={() => move(index, index - 1)}
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-9 px-2 text-xs"
                  disabled={index === studies.length - 1}
                  aria-label={`Move case study ${index + 1} down`}
                  onClick={() => move(index, index + 1)}
                >
                  ↓
                </Button>
              </div>
            </div>

            {/* Shown collapsed too — a slug clash is the reason a save is being
                refused, and you should not have to open each one to find it. */}
            {problem ? (
              <p className="px-3 pb-3 text-xs text-red-600" role="alert">
                {problem}
              </p>
            ) : null}

            {open ? (
              <div className="space-y-3 border-t border-slate-100 p-3">
                <Field
                  label="Title"
                  htmlFor={`${idPrefix}-title`}
                  required
                  error={errors[`caseStudies[${index}].title`]}
                >
                  <input
                    id={`${idPrefix}-title`}
                    className={inputClasses}
                    value={study.title}
                    onChange={(event) => {
                      const title = event.target.value;
                      update(index, {
                        ...study,
                        title,
                        // Keep the slug in step until someone types their own.
                        slug: slugFollowsTitle(study) ? slugify(title) : study.slug,
                      });
                    }}
                    placeholder="Offshore Platform Project"
                  />
                </Field>

                <Field
                  label="Slug"
                  htmlFor={`${idPrefix}-slug`}
                  required
                  error={problem ?? errors[`caseStudies[${index}].slug`]}
                  hint="Suggested from the title, and yours to change. Unique within this project."
                >
                  <input
                    id={`${idPrefix}-slug`}
                    className={`${inputClasses} font-mono`}
                    value={study.slug}
                    onChange={(event) => update(index, { ...study, slug: event.target.value })}
                    placeholder="offshore-platform"
                  />
                </Field>

                <Field label="Sector" htmlFor={`${idPrefix}-sector`}>
                  <input
                    id={`${idPrefix}-sector`}
                    className={inputClasses}
                    value={study.sector}
                    onChange={(event) => update(index, { ...study, sector: event.target.value })}
                    placeholder="Oil & Gas"
                  />
                </Field>

                <Field
                  label="Summary"
                  htmlFor={`${idPrefix}-summary`}
                  hint="The blurb on the carousel card."
                >
                  <textarea
                    id={`${idPrefix}-summary`}
                    className={`${inputClasses} min-h-20`}
                    value={study.summary}
                    onChange={(event) => update(index, { ...study, summary: event.target.value })}
                  />
                </Field>

                <Field label="Hero image" htmlFor={`${idPrefix}-hero`}>
                  <AssetPicker
                    id={`${idPrefix}-hero`}
                    value={study.heroAssetId}
                    onChange={(heroAssetId) => update(index, { ...study, heroAssetId })}
                    assets={heroCandidates}
                    emptyLabel="No image for this case study"
                  />
                </Field>

                {PROSE_FIELDS.map((field) => (
                  <Field
                    key={field.key}
                    label={field.label}
                    htmlFor={`${idPrefix}-${field.key}`}
                    hint={`${field.hint} ${study[field.key].length} characters.`}
                    error={errors[`caseStudies[${index}].${field.key}`]}
                  >
                    <textarea
                      id={`${idPrefix}-${field.key}`}
                      rows={4}
                      className={inputClasses}
                      value={study[field.key]}
                      onChange={(event) =>
                        update(index, { ...study, [field.key]: event.target.value })
                      }
                    />
                  </Field>
                ))}

                <MetricsEditor
                  metrics={study.metrics}
                  onChange={(metrics) => update(index, { ...study, metrics })}
                  idPrefix={idPrefix}
                />

                <fieldset className="space-y-2">
                  <legend className="text-xs font-medium text-slate-700">Testimonial</legend>

                  {study.testimonial ? (
                    <>
                      <Field
                        label="Quote"
                        htmlFor={`${idPrefix}-quote`}
                        error={errors[`caseStudies[${index}].testimonial.quote`]}
                      >
                        <textarea
                          id={`${idPrefix}-quote`}
                          rows={3}
                          className={inputClasses}
                          value={study.testimonial.quote}
                          onChange={(event) =>
                            update(index, {
                              ...study,
                              testimonial: {
                                quote: event.target.value,
                                attribution: study.testimonial?.attribution ?? '',
                              },
                            })
                          }
                        />
                      </Field>
                      <Field
                        label="Who said it"
                        htmlFor={`${idPrefix}-attr`}
                        error={errors[`caseStudies[${index}].testimonial.attribution`]}
                      >
                        <input
                          id={`${idPrefix}-attr`}
                          className={inputClasses}
                          value={study.testimonial.attribution}
                          onChange={(event) =>
                            update(index, {
                              ...study,
                              testimonial: {
                                quote: study.testimonial?.quote ?? '',
                                attribution: event.target.value,
                              },
                            })
                          }
                        />
                      </Field>
                      <Button
                        type="button"
                        variant="ghost"
                        className="min-h-9 text-xs text-red-600 hover:bg-red-50"
                        // Cleared means null, not an object of empty strings —
                        // the public site drops the block entirely (§7.4).
                        onClick={() => update(index, { ...study, testimonial: null })}
                      >
                        Remove the testimonial
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-9 text-xs"
                      onClick={() =>
                        update(index, { ...study, testimonial: { quote: '', attribution: '' } })
                      }
                    >
                      Add a testimonial
                    </Button>
                  )}
                </fieldset>

                <div className="border-t border-slate-100 pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-9 text-xs text-red-600 hover:bg-red-50"
                    aria-label={`Remove case study ${index + 1}`}
                    onClick={() => remove(index)}
                  >
                    Remove this case study
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}

      <Button type="button" variant="secondary" onClick={add}>
        Add a case study
      </Button>
    </div>
  );
}
