import {
  SITE_CONTENT_KEYS,
  siteContentDiffers,
  type SiteContent,
  type SiteContentKey,
} from '@wroom/shared';
import { useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/Pill';
import { ErrorState, LoadingState } from '../../components/StateViews';
import {
  usePublishContent,
  useSaveDraft,
  useSiteContentRecord,
  useUnpublishContent,
} from '../../features/content/api';
import { MarkdownPreview } from '../../features/content/MarkdownPreview';
import {
  AboutDataForm,
  ContactDataForm,
  DATA_SCHEMAS,
  LandingDataForm,
  SkillsDataForm,
  dataWithDefaults,
  type AboutData,
  type ContactData,
  type LandingData,
  type SkillsData,
} from '../../features/content/dataForms';
import { ApiRequestError } from '../../lib/api';
import { humanise, shortDate } from '../../lib/format';

/**
 * One page's words, with the draft/published split made visible.
 *
 * Saving writes the draft and changes nothing anyone outside can see.
 * Publishing is a separate, confirmed action that names the page it is about to
 * change and says what it will do to it — you should not be able to change the
 * public site by accident from here.
 */

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiRequestError ? error.message : fallback;
}

/** What the live site is doing right now, in one badge and one line. */
function LiveStatus({ record, pageName }: { record: SiteContent; pageName: string }) {
  const ahead = siteContentDiffers(record.draft, record.published);

  if (!record.published) {
    return (
      <div>
        <Pill label="Nothing published" tone="amber" />
        <p className="mt-2 text-sm text-slate-600">
          The {pageName.toLowerCase()} page has never been published, so the public site has
          nothing to show for it. Your draft is saved here and stays private until you publish it.
        </p>
      </div>
    );
  }

  return (
    <div>
      {ahead ? (
        <Pill label="Draft ahead of the live page" tone="blue" />
      ) : (
        <Pill label="Live page matches your draft" tone="green" />
      )}
      <p className="mt-2 text-sm text-slate-600">
        {ahead
          ? 'Your draft says something different from what the public site is serving. Publish to make them match.'
          : 'What is in the boxes below is exactly what the public site is serving.'}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Published {record.publishedAt ? shortDate(record.publishedAt) : 'at an unrecorded time'}
      </p>
    </div>
  );
}

/**
 * The four pages as tabs.
 *
 * Each is its own route, so a tab is a link rather than local state — the URL
 * stays the thing that says which page you are editing, and a reload or a
 * shared link lands where you left off.
 */
function KeyTabs({ current }: { current: string }) {
  return (
    <nav aria-label="Content pages" className="-mx-1 mb-4 flex gap-1 overflow-x-auto pb-1">
      {SITE_CONTENT_KEYS.map((key) => (
        <NavLink
          key={key}
          to={`/content/${key}`}
          className={`min-h-11 shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            key === current
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
          }`}
        >
          {humanise(key)}
        </NavLink>
      ))}
    </nav>
  );
}

/**
 * The structured half, dispatched on the key.
 *
 * A switch and four components, not one form with every field on it: the four
 * shapes have nothing in common but where they are stored, and a single
 * field-driven form would put a skills group on the landing tab.
 */
function DataForm({
  contentKey,
  data,
  onChange,
  errors,
}: {
  contentKey: SiteContentKey;
  data: unknown;
  onChange: (next: unknown) => void;
  errors: Record<string, string>;
}) {
  switch (contentKey) {
    case 'landing':
      return <LandingDataForm data={data as LandingData} onChange={onChange} errors={errors} />;
    case 'about':
      return <AboutDataForm data={data as AboutData} onChange={onChange} errors={errors} />;
    case 'skills':
      return <SkillsDataForm data={data as SkillsData} onChange={onChange} errors={errors} />;
    case 'contact':
      return <ContactDataForm data={data as ContactData} onChange={onChange} errors={errors} />;
  }
}

function ContentEditor({ record }: { record: SiteContent }) {
  const pageName = humanise(record.key);

  const save = useSaveDraft(record.key);
  const publish = usePublishContent(record.key);
  const unpublish = useUnpublishContent(record.key);

  const [title, setTitle] = useState(record.draft.title);
  const [body, setBody] = useState(record.draft.body);
  const [metaTitle, setMetaTitle] = useState(record.draft.meta.title);
  const [metaDescription, setMetaDescription] = useState(record.draft.meta.description);
  const [confirming, setConfirming] = useState<'publish' | 'unpublish' | null>(null);
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const contentKey = record.key as SiteContentKey;
  // Filled out to the key's full shape: a freshly seeded record holds `{}`, and
  // the schema is where the defaults for the missing fields live.
  const [data, setData] = useState<unknown>(() =>
    dataWithDefaults(DATA_SCHEMAS[contentKey], record.draft.data),
  );
  const storedData = dataWithDefaults(DATA_SCHEMAS[contentKey], record.draft.data);

  const errors = save.error instanceof ApiRequestError ? save.error.fieldErrors : {};

  const unsaved =
    title !== record.draft.title ||
    body !== record.draft.body ||
    metaTitle !== record.draft.meta.title ||
    metaDescription !== record.draft.meta.description ||
    JSON.stringify(data) !== JSON.stringify(storedData);

  /** Every box clears the "saved" note, so it can only describe the current text. */
  function edit(apply: () => void): void {
    apply();
    setSaved(false);
  }

  return (
    <div className="space-y-6">
      <KeyTabs current={record.key} />

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <LiveStatus record={record} pageName={pageName} />
      </section>

      <form
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(false);
          save.mutate(
            { title, body, meta: { title: metaTitle, description: metaDescription }, data },
            { onSuccess: () => setSaved(true) },
          );
        }}
      >
        <Field label="Page title" htmlFor="content-title" error={errors.title}>
          <input
            id="content-title"
            className={inputClasses}
            value={title}
            onChange={(event) => edit(() => setTitle(event.target.value))}
          />
        </Field>

        <Field
          label="Body"
          htmlFor="content-body"
          hint="Markdown. The preview below renders it the same way the public page will."
          error={errors.body}
        >
          <textarea
            id="content-body"
            rows={14}
            className={`${inputClasses} font-mono text-xs leading-relaxed`}
            value={body}
            onChange={(event) => edit(() => setBody(event.target.value))}
          />
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-800">Preview</p>
            <Button
              type="button"
              variant="ghost"
              className="min-h-9 px-2 text-xs"
              aria-expanded={showPreview}
              onClick={() => setShowPreview((current) => !current)}
            >
              {showPreview ? 'Hide' : 'Show'}
            </Button>
          </div>
          {showPreview ? <MarkdownPreview body={body} /> : null}
        </div>

        <div className="border-t border-slate-200 pt-4">
          <h2 className="text-sm font-semibold text-slate-900">{pageName} details</h2>
          <p className="mb-3 mt-0.5 text-xs text-slate-500">
            The parts of this page markdown cannot express. Different on every page — these are
            the {pageName.toLowerCase()} page&rsquo;s.
          </p>
          <DataForm
            contentKey={contentKey}
            data={data}
            onChange={(next) => edit(() => setData(next))}
            errors={errors}
          />
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Search and sharing
          </p>
          <p className="mt-1 text-xs text-slate-500">
            What a search result or a shared link shows. Not seen on the page itself.
          </p>

          <div className="mt-3 space-y-4">
            <Field
              label="Meta title"
              htmlFor="content-meta-title"
              hint="Around 60 characters before it gets cut off."
              error={errors['meta.title']}
            >
              <input
                id="content-meta-title"
                className={inputClasses}
                value={metaTitle}
                onChange={(event) => edit(() => setMetaTitle(event.target.value))}
              />
            </Field>

            <Field
              label="Meta description"
              htmlFor="content-meta-description"
              hint="Around 155 characters. One sentence on what the page is for."
              error={errors['meta.description']}
            >
              <textarea
                id="content-meta-description"
                rows={3}
                className={inputClasses}
                value={metaDescription}
                onChange={(event) => edit(() => setMetaDescription(event.target.value))}
              />
            </Field>
          </div>
        </div>

        {save.isError ? (
          <p className="text-sm text-red-600">
            {errorMessage(save.error, 'That could not be saved.')}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <Button type="submit" disabled={save.isPending || !unsaved}>
            {save.isPending ? 'Saving…' : 'Save draft'}
          </Button>
          {unsaved ? (
            <span className="text-xs text-amber-700">Unsaved changes</span>
          ) : saved ? (
            <span className="text-xs text-slate-500">
              Draft saved. The public site is unchanged.
            </span>
          ) : null}
        </div>
      </form>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">The live site</h2>
        <p className="mt-1 text-sm text-slate-500">
          Publishing is the only thing here that changes what the public can see.
        </p>

        {unsaved ? (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
            Publishing sends the saved draft, not what is in the boxes above. Save first, so you
            publish what you are looking at.
          </p>
        ) : null}

        {publish.isError ? (
          <p className="mt-3 text-sm text-red-600">
            {errorMessage(publish.error, 'That could not be published.')}
          </p>
        ) : null}

        {unpublish.isError ? (
          <p className="mt-3 text-sm text-red-600">
            {errorMessage(unpublish.error, 'That could not be taken down.')}
          </p>
        ) : null}

        {confirming === 'publish' ? (
          <div className="mt-4 rounded-lg border border-slate-300 bg-slate-50 p-3">
            <p className="text-sm font-medium text-slate-900">Publish the {pageName} page?</p>
            <p className="mt-1 text-sm text-slate-600">
              {record.published
                ? `The ${pageName} page on the public site will be replaced with this draft. Anyone visiting it sees the new words straight away.`
                : `The ${pageName} page will start being served on the public site, where it currently shows nothing at all.`}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                className="min-h-9 text-xs"
                disabled={publish.isPending}
                onClick={() => publish.mutate(undefined, { onSuccess: () => setConfirming(null) })}
              >
                {publish.isPending ? 'Publishing…' : 'Yes, publish it'}
              </Button>
              <Button
                variant="ghost"
                className="min-h-9 text-xs"
                onClick={() => setConfirming(null)}
              >
                Not yet
              </Button>
            </div>
          </div>
        ) : null}

        {confirming === 'unpublish' ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm font-medium text-red-900">Take the {pageName} page down?</p>
            <p className="mt-1 text-sm text-red-800">
              The {pageName} page stops being served, and the public site will have nothing to show
              in its place. Your draft stays here untouched, so you can publish it again whenever
              you want.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="danger"
                className="min-h-9 text-xs"
                disabled={unpublish.isPending}
                onClick={() =>
                  unpublish.mutate(undefined, { onSuccess: () => setConfirming(null) })
                }
              >
                {unpublish.isPending ? 'Taking it down…' : 'Yes, take it down'}
              </Button>
              <Button
                variant="ghost"
                className="min-h-9 text-xs"
                onClick={() => setConfirming(null)}
              >
                Keep it live
              </Button>
            </div>
          </div>
        ) : null}

        {confirming === null ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled={unsaved} onClick={() => setConfirming('publish')}>
              {record.published ? 'Publish changes' : 'Publish page'}
            </Button>
            {record.published ? (
              <Button variant="secondary" onClick={() => setConfirming('unpublish')}>
                Unpublish
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}

export function ContentEditorPage() {
  const { key = '' } = useParams();
  const record = useSiteContentRecord(key);

  const backLink = (
    <Link to="/content" className="text-sm text-slate-500 hover:text-slate-900">
      Back to content
    </Link>
  );

  if (record.isPending) {
    return (
      <>
        <PageHeader title={humanise(key)} actions={backLink} />
        <LoadingState label="Loading this page's words…" />
      </>
    );
  }

  if (record.isError) {
    return (
      <>
        <PageHeader title={humanise(key)} actions={backLink} />
        <ErrorState error={record.error} onRetry={() => void record.refetch()} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`${humanise(record.data.key)} page`}
        subtitle="Saving writes a draft. The public site changes only when you publish."
        actions={backLink}
      />
      {/* Remounts per record, so the boxes start from the record actually loaded. */}
      <ContentEditor key={record.data.key} record={record.data} />
    </>
  );
}
