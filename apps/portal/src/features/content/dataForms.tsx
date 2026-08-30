import { useState } from 'react';

import {
  aboutDataSchema,
  contactDataSchema,
  landingDataSchema,
  skillsDataSchema,
  validate,
  type SiteContentKey,
  type Validator,
} from '@wroom/shared';

import { UPLOAD_LIMITS } from '@wroom/shared';

import { ApiRequestError } from '../../lib/api';
import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
import {
  useCreateSiteAsset,
  useDeleteSiteAsset,
  useRequestSiteUploadUrl,
  useSiteAssets,
  useUpdateSiteAsset,
} from '../assets/api';
import { useBlobUpload } from '../assets/upload';
import { MarkGlyph } from '../mediaLibrary/MarkPreview';
import { useMediaLibrary } from '../mediaLibrary/api';

/**
 * The structured half of a content record — `data` — one form per key.
 *
 * Four separate forms on purpose. A single form driven by a field list would
 * have to hold every field of every page and hide most of them, which is how a
 * skills group ends up rendered on the landing tab. The shapes have nothing in
 * common; the only thing they share is where they are stored.
 *
 * The field sets are not restated here — each form's type is read straight off
 * the schema in `packages/shared/src/schemas/siteContent/`, so a field added
 * there is a type error here until it is rendered.
 */

type Shape<V> = V extends Validator<infer T> ? T : never;

export type LandingData = Shape<typeof landingDataSchema>;
export type AboutData = Shape<typeof aboutDataSchema>;
export type SkillsData = Shape<typeof skillsDataSchema>;
export type ContactData = Shape<typeof contactDataSchema>;

/**
 * A stored `data` blob, filled out to the key's full shape.
 *
 * A freshly seeded record holds `{}`, so the form needs the defaults the schema
 * would apply. Running the schema is how those are obtained — the alternative
 * is writing every default a second time, in a second place, to drift from the
 * first.
 */
export function dataWithDefaults(schema: Validator<unknown>, stored: unknown): unknown {
  const result = validate(schema, stored ?? {});
  // A stored blob that fails its own schema is not something to render a form
  // over — fall back to the defaults so the page still opens, and let the save
  // surface whatever the API objects to.
  return result.ok ? result.value : (validate(schema, {}) as { value?: unknown }).value ?? {};
}

// --- small pieces used by more than one of the four ------------------------

function StringListEditor({
  values,
  onChange,
  idPrefix,
  label,
  hint,
  placeholder,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  idPrefix: string;
  label: string;
  hint: string;
  placeholder?: string;
}) {
  function move(from: number, to: number): void {
    if (to < 0 || to >= values.length) return;
    const next = [...values];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved as string);
    onChange(next);
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-slate-800">{label}</legend>
      <p className="text-xs text-slate-500">{hint}</p>

      {values.map((value, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            id={`${idPrefix}-${index}`}
            aria-label={`${label} ${index + 1}`}
            className={inputClasses}
            value={value}
            placeholder={placeholder}
            onChange={(event) =>
              onChange(values.map((entry, at) => (at === index ? event.target.value : entry)))
            }
          />
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              variant="ghost"
              className="min-h-9 px-2 text-xs"
              disabled={index === 0}
              aria-label={`Move ${label} ${index + 1} up`}
              onClick={() => move(index, index - 1)}
            >
              ↑
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-9 px-2 text-xs"
              disabled={index === values.length - 1}
              aria-label={`Move ${label} ${index + 1} down`}
              onClick={() => move(index, index + 1)}
            >
              ↓
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-9 px-2 text-xs text-red-600 hover:bg-red-50"
              aria-label={`Remove ${label} ${index + 1}`}
              onClick={() => onChange(values.filter((_, at) => at !== index))}
            >
              ✕
            </Button>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="secondary"
        className="min-h-9 text-xs"
        onClick={() => onChange([...values, ''])}
      >
        Add
      </Button>
    </fieldset>
  );
}

/** A `mediaLibrary` key chosen from a list, with the mark shown beside it. */
function MarkSelect({
  id,
  value,
  onChange,
  kinds,
  emptyLabel,
}: {
  id: string;
  value: string;
  onChange: (key: string) => void;
  kinds: readonly string[];
  emptyLabel: string;
}) {
  const library = useMediaLibrary();
  const marks = (library.data?.items ?? [])
    .filter((mark) => kinds.includes(mark.kind))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));

  const chosen = marks.find((mark) => mark.key === value);

  return (
    <div className="flex items-center gap-2">
      {/*
       * A select rather than the grid of buttons the portfolio editor uses:
       * these sit inside a repeater row, and a wall of icon buttons per row
       * would bury the label beside it.
       */}
      <span className="flex size-9 shrink-0 items-center justify-center rounded border border-slate-200 bg-white">
        {chosen?.svg ? (
          <MarkGlyph svg={chosen.svg} className="[&_svg]:max-h-5 [&_svg]:max-w-5" />
        ) : chosen?.blobUrl ? (
          <img src={chosen.blobUrl} alt="" className="max-h-5 max-w-5" />
        ) : (
          <span className="text-[9px] text-slate-400">—</span>
        )}
      </span>

      <select
        id={id}
        className={inputClasses}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{emptyLabel}</option>
        {marks.map((mark) => (
          <option key={mark._id} value={mark.key}>
            {mark.label || mark.key}
          </option>
        ))}
        {/* A key whose mark has since gone still has to be visible and keepable. */}
        {value !== '' && !chosen ? <option value={value}>{value} — not in the library</option> : null}
      </select>
    </div>
  );
}

type Social = { mediaKey: string; url: string };

function SocialsEditor({
  socials,
  onChange,
  idPrefix,
}: {
  socials: Social[];
  onChange: (next: Social[]) => void;
  idPrefix: string;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-slate-800">Social links</legend>
      <p className="text-xs text-slate-500">
        The mark comes from the media library; the address is yours to type.
      </p>

      {socials.map((social, index) => (
        <div key={index} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
          <MarkSelect
            id={`${idPrefix}-social-${index}`}
            value={social.mediaKey}
            onChange={(mediaKey) =>
              onChange(socials.map((entry, at) => (at === index ? { ...entry, mediaKey } : entry)))
            }
            kinds={['social']}
            emptyLabel="Choose a mark…"
          />
          <div className="flex items-center gap-2">
            <input
              aria-label={`Social link ${index + 1} URL`}
              className={inputClasses}
              value={social.url}
              placeholder="https://…"
              onChange={(event) =>
                onChange(
                  socials.map((entry, at) =>
                    at === index ? { ...entry, url: event.target.value.trim() } : entry,
                  ),
                )
              }
            />
            <Button
              type="button"
              variant="ghost"
              className="min-h-9 shrink-0 px-2 text-xs text-red-600 hover:bg-red-50"
              aria-label={`Remove social link ${index + 1}`}
              onClick={() => onChange(socials.filter((_, at) => at !== index))}
            >
              ✕
            </Button>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="secondary"
        className="min-h-9 text-xs"
        onClick={() => onChange([...socials, { mediaKey: '', url: '' }])}
      >
        Add a social link
      </Button>
    </fieldset>
  );
}

/**
 * Deleting one of the site's files for good.
 *
 * Two steps, the same shape the media library's mark rows use: a Delete button
 * that opens a confirmation rather than acting, and a refusal panel when the
 * API says the file is still in use.
 *
 * The API refuses while any page names it — a saved draft as much as a
 * published one. So the way to delete the file a page is using is to clear it
 * on that page, save, and come back. The refusal says which page; this says
 * what to do about it.
 */
function DeleteFileButton({ assetId, filename }: { assetId: string; filename: string }) {
  const remove = useDeleteSiteAsset();
  const [confirming, setConfirming] = useState(false);

  const blocked =
    remove.error instanceof ApiRequestError && remove.error.status === 409 ? remove.error : null;
  const otherError =
    remove.error instanceof ApiRequestError && remove.error.status !== 409 ? remove.error : null;

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        className="min-h-9 px-2 text-xs text-red-600 hover:bg-red-50"
        onClick={() => setConfirming(true)}
      >
        Delete file
      </Button>
    );
  }

  return (
    <div className="w-full rounded-lg border border-red-200 bg-red-50 p-3">
      <p className="text-sm text-red-900">
        Delete {filename} for good? This removes the file itself, not just its place on
        this page.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="danger"
          disabled={remove.isPending}
          onClick={() => remove.mutate(assetId, { onSuccess: () => setConfirming(false) })}
        >
          {remove.isPending ? 'Deleting…' : 'Delete it'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setConfirming(false)}>
          Keep it
        </Button>
      </div>

      {blocked ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-900">Still in use</p>
          <p className="mt-1 text-sm text-amber-800">{blocked.message}</p>
          <p className="mt-2 text-xs text-amber-700">
            Clear it on that page and save. A page that has been published has to be
            published again before the file is free.
          </p>
        </div>
      ) : null}

      {otherError ? <p className="mt-3 text-sm text-red-700">{otherError.message}</p> : null}
    </div>
  );
}

/**
 * A file a page points at: pick one of the site's uploads, or add one.
 *
 * Two slots use it — the portrait on the landing and about pages, and the CV
 * behind the landing hero's second button. They differ in which files are worth
 * listing and what the slot is called; everything else about choosing one,
 * uploading one and getting it public is the same errand.
 *
 * No thumbnail. The private container allows no anonymous read, so a blob URL
 * in an `<img>` renders broken — the media panel makes the same call, and a
 * filename with its state beside it is honest where a broken image is not.
 *
 * Marking it public is part of the job rather than a separate errand: a file
 * that is still private stops the page publishing, and the button that fixes it
 * belongs where that is discovered.
 */
function SiteAssetField({
  value,
  onChange,
  idPrefix,
  slot,
  legend,
  hint,
  accept,
  accepts,
}: {
  value: string | null;
  onChange: (assetId: string | null) => void;
  idPrefix: string;
  slot: string;
  legend: string;
  hint: string;
  accept: readonly string[];
  accepts: (mimeType: string) => boolean;
}) {
  const assets = useSiteAssets();
  const requestUrl = useRequestSiteUploadUrl();
  const createAsset = useCreateSiteAsset();
  const publish = useUpdateSiteAsset();

  const { phase, busy, upload } = useBlobUpload({
    requestUrl,
    createAsset,
    // Uploading one is choosing it. Anything else means picking from a list the
    // file was just added to, which is a step nobody wants.
    onCreated: (asset) => onChange(asset._id),
  });

  // The chosen one is looked up in the whole list rather than the filtered one,
  // so a slot still shows what it points at after the rule for this slot
  // changes — and the mismatch is visible instead of reading as "gone".
  const all = assets.data?.items ?? [];
  const items = all.filter((asset) => accepts(asset.mimeType));
  const chosen = all.find((asset) => asset._id === value) ?? null;

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-slate-800">{legend}</legend>
      <p className="text-xs text-slate-500">{hint}</p>

      {items.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((asset) => (
            <button
              key={asset._id}
              type="button"
              // Pressing the chosen one clears it — a portrait is optional.
              onClick={() => onChange(value === asset._id ? null : asset._id)}
              className={`min-h-11 rounded-lg border px-3 text-xs ${
                value === asset._id
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
              }`}
            >
              {asset.filename}
            </button>
          ))}
        </div>
      ) : null}

      {value !== null && !chosen && assets.isSuccess ? (
        <p className="text-xs text-amber-700">
          This page points at a file that is no longer here. Choose another, or clear it —
          publishing will refuse until you do.
        </p>
      ) : null}

      {chosen && !accepts(chosen.mimeType) ? (
        <p className="text-xs text-amber-700">
          {chosen.filename} is a {chosen.mimeType}, which is not something this slot can
          show. Choose another, or clear it — publishing will refuse until you do.
        </p>
      ) : null}

      {chosen && chosen.visibility !== 'public' ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2">
          <p className="text-xs text-amber-900">
            {chosen.filename} is private, so the page cannot publish it yet.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="min-h-9 text-xs"
            disabled={publish.isPending}
            onClick={() => publish.mutate({ id: chosen._id, visibility: 'public' })}
          >
            {publish.isPending ? 'Marking…' : 'Make it public'}
          </Button>
        </div>
      ) : null}

      {/*
       * Deleting is offered on the chosen file only. Every file in the list
       * belongs to some page or to none, and a row of delete buttons over a
       * picker is a mis-click waiting to happen — this way the file has been
       * selected deliberately before it can be removed.
       */}
      {chosen ? (
        <div className="flex flex-wrap items-center gap-2">
          <DeleteFileButton assetId={chosen._id} filename={chosen.filename} />
        </div>
      ) : null}

      <label className="inline-flex">
        <span className="sr-only">Choose a {slot} to upload</span>
        <input
          id={`${idPrefix}-${slot}-file`}
          type="file"
          accept={accept.join(',')}
          disabled={busy}
          className="block w-full text-xs text-slate-600 file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:text-sm file:font-medium file:text-white disabled:opacity-50"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void upload(file);
          }}
        />
      </label>

      {phase.at === 'requesting' || phase.at === 'saving' ? (
        <p className="text-xs text-slate-600">
          {phase.at === 'requesting' ? 'Checking the file…' : 'Saving…'} {phase.filename}
        </p>
      ) : null}

      {phase.at === 'uploading' ? (
        <p className="text-xs text-slate-600">
          Uploading {phase.filename} — {phase.percent}%
        </p>
      ) : null}

      {phase.at === 'rejected' || phase.at === 'failed' ? (
        <p className="text-xs text-red-700">{phase.message}</p>
      ) : null}
    </fieldset>
  );
}

/**
 * The two slots, as the pages ask for them.
 *
 * The mime lists come off `UPLOAD_LIMITS` rather than being typed again here,
 * so a type added to what the uploader accepts appears in the picker that wants
 * it without a second edit — and the CV's rule matches what the API enforces at
 * publish, rather than being a looser copy of it.
 */
const IMAGE_MIME_TYPES = UPLOAD_LIMITS.allowedMimeTypes.filter((type) =>
  type.startsWith('image/'),
);

const CV_MIME_TYPES = ['application/pdf'] as const;

function PortraitField(props: {
  value: string | null;
  onChange: (assetId: string | null) => void;
  idPrefix: string;
}) {
  return (
    <SiteAssetField
      {...props}
      slot="portrait"
      legend="Portrait"
      hint="Shown on the page once it is published. It has to be marked public first — nothing reaches the public site until it is."
      accept={IMAGE_MIME_TYPES}
      accepts={(mimeType) => mimeType.startsWith('image/')}
    />
  );
}

function CvField(props: {
  value: string | null;
  onChange: (assetId: string | null) => void;
  idPrefix: string;
}) {
  return (
    <SiteAssetField
      {...props}
      slot="cv"
      legend="CV"
      hint="The file the second hero button hands over. A PDF, marked public — the hero shows that button only once both are true."
      accept={CV_MIME_TYPES}
      accepts={(mimeType) => mimeType === 'application/pdf'}
    />
  );
}

type StatusRow = { label: string; value: string };

/**
 * The landing page's status readout: a label and a value, repeated.
 *
 * Both halves are typed. Nothing in Wroom measures a build, a machine or a
 * queue, and a public page is the wrong place to grow that — these rows say
 * what you write until you write something else.
 */
function StatusRowsEditor({
  rows,
  onChange,
}: {
  rows: StatusRow[];
  onChange: (next: StatusRow[]) => void;
}) {
  const update = (index: number, patch: Partial<StatusRow>) =>
    onChange(rows.map((row, at) => (at === index ? { ...row, ...patch } : row)));

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-slate-800">Status readout</legend>
      <p className="text-xs text-slate-500">
        The small panel under the code pane. Decorative, hidden on a phone, and
        nothing here is measured — you write both halves.
      </p>

      {rows.map((row, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            aria-label={`Status row ${index + 1} label`}
            className={inputClasses}
            value={row.label}
            placeholder="BUILD"
            onChange={(event) => update(index, { label: event.target.value })}
          />
          <input
            aria-label={`Status row ${index + 1} value`}
            className={inputClasses}
            value={row.value}
            placeholder="READY"
            onChange={(event) => update(index, { value: event.target.value })}
          />
          <Button
            type="button"
            variant="ghost"
            className="min-h-9 shrink-0 px-2 text-xs text-red-600 hover:bg-red-50"
            aria-label={`Remove status row ${index + 1}`}
            onClick={() => onChange(rows.filter((_, at) => at !== index))}
          >
            ✕
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="secondary"
        className="min-h-9 text-xs"
        onClick={() => onChange([...rows, { label: '', value: '' }])}
      >
        Add a row
      </Button>
    </fieldset>
  );
}

/**
 * A repeater of rows, each optionally led by a mark from the library.
 *
 * Four of the fields on these pages are the same errand — a glyph, one or two
 * pieces of text, and the order they appear in — so they are one editor rather
 * than four that drift apart. What differs between them is the words: the
 * legend, the hint, what a row is called and what its fields are.
 *
 * The move buttons are not decoration. A timeline renders in the order it is
 * written, so being able to slot a year into the middle of one is the
 * difference between editing it and retyping it.
 */
type RowField<T> = {
  key: keyof T & string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
};

function RowsEditor<T extends Record<string, string>>({
  rows,
  onChange,
  idPrefix,
  legend,
  hint,
  addLabel,
  itemNoun,
  fields,
  blank,
  glyph,
}: {
  rows: T[];
  onChange: (next: T[]) => void;
  idPrefix: string;
  legend: string;
  hint: string;
  addLabel: string;
  itemNoun: string;
  fields: readonly RowField<T>[];
  blank: T;
  glyph?: { kinds: readonly string[]; emptyLabel: string };
}) {
  const update = (index: number, patch: Partial<T>) =>
    onChange(rows.map((row, at) => (at === index ? { ...row, ...patch } : row)));

  function move(from: number, to: number): void {
    if (to < 0 || to >= rows.length) return;
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved as T);
    onChange(next);
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-slate-800">{legend}</legend>
      <p className="text-xs text-slate-500">{hint}</p>

      {rows.map((row, index) => (
        <div key={index} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
          {glyph ? (
            <MarkSelect
              id={`${idPrefix}-glyph-${index}`}
              value={row.mediaKey ?? ''}
              onChange={(mediaKey) => update(index, { mediaKey } as unknown as Partial<T>)}
              kinds={glyph.kinds}
              emptyLabel={glyph.emptyLabel}
            />
          ) : null}

          {fields.map((field) =>
            field.multiline ? (
              <textarea
                key={field.key}
                aria-label={`${itemNoun} ${index + 1} ${field.label}`}
                className={`${inputClasses} min-h-20`}
                value={row[field.key] ?? ''}
                placeholder={field.placeholder}
                onChange={(event) =>
                  update(index, { [field.key]: event.target.value } as unknown as Partial<T>)
                }
              />
            ) : (
              <input
                key={field.key}
                aria-label={`${itemNoun} ${index + 1} ${field.label}`}
                className={inputClasses}
                value={row[field.key] ?? ''}
                placeholder={field.placeholder}
                onChange={(event) =>
                  update(index, { [field.key]: event.target.value } as unknown as Partial<T>)
                }
              />
            ),
          )}

          <div className="flex justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              className="min-h-9 px-2 text-xs"
              disabled={index === 0}
              aria-label={`Move ${itemNoun} ${index + 1} up`}
              onClick={() => move(index, index - 1)}
            >
              ↑
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-9 px-2 text-xs"
              disabled={index === rows.length - 1}
              aria-label={`Move ${itemNoun} ${index + 1} down`}
              onClick={() => move(index, index + 1)}
            >
              ↓
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-9 px-2 text-xs text-red-600 hover:bg-red-50"
              aria-label={`Remove ${itemNoun} ${index + 1}`}
              onClick={() => onChange(rows.filter((_, at) => at !== index))}
            >
              ✕
            </Button>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="secondary"
        className="min-h-9 text-xs"
        onClick={() => onChange([...rows, { ...blank }])}
      >
        {addLabel}
      </Button>
    </fieldset>
  );
}

type Stat = { mediaKey: string; value: string; label: string };

/**
 * The band of counts under the hero: a glyph, a number and what it counts.
 *
 * Written, not measured. Wroom counts no clients and times no career, and the
 * public site is the wrong place for it to start — these say what you type
 * until you type something else, the same as the status readout above.
 *
 * The glyph is optional. A row can be written before its mark is drawn, and
 * until it is, that count appears without an icon rather than not at all.
 */
function StatsEditor({
  stats,
  onChange,
  idPrefix,
}: {
  stats: Stat[];
  onChange: (next: Stat[]) => void;
  idPrefix: string;
}) {
  return (
    <RowsEditor
      rows={stats}
      onChange={onChange}
      idPrefix={`${idPrefix}-stat`}
      legend="Stats"
      hint="The row of counts. Nothing here is measured — you write both halves, and the glyph comes from the media library."
      addLabel="Add a stat"
      itemNoun="Stat"
      glyph={{ kinds: ['stat'], emptyLabel: 'No glyph' }}
      fields={[
        { key: 'value', label: 'value', placeholder: '10+' },
        { key: 'label', label: 'label', placeholder: 'Happy clients' },
      ]}
      blank={{ mediaKey: '', value: '', label: '' }}
    />
  );
}

/**
 * The row of marks under the hero buttons.
 *
 * Keys and nothing else: what is drawn and what it is called both live on the
 * `mediaLibrary` record, so a logo is corrected in one place rather than
 * everywhere it appears.
 */
function TechMarksEditor({
  keys,
  onChange,
  idPrefix,
}: {
  keys: string[];
  onChange: (next: string[]) => void;
  idPrefix: string;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-slate-800">Tech row</legend>
      <p className="text-xs text-slate-500">
        The marks under the hero buttons, in the order you set here.
      </p>

      {keys.map((key, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="grow">
            <MarkSelect
              id={`${idPrefix}-tech-${index}`}
              value={key}
              onChange={(next) => onChange(keys.map((entry, at) => (at === index ? next : entry)))}
              kinds={['tech']}
              emptyLabel="Choose a mark…"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            className="min-h-9 shrink-0 px-2 text-xs text-red-600 hover:bg-red-50"
            aria-label={`Remove tech mark ${index + 1}`}
            onClick={() => onChange(keys.filter((_, at) => at !== index))}
          >
            ✕
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="secondary"
        className="min-h-9 text-xs"
        onClick={() => onChange([...keys, ''])}
      >
        Add a mark
      </Button>
    </fieldset>
  );
}

// --- the four forms --------------------------------------------------------

export function LandingDataForm({
  data,
  onChange,
  errors,
}: {
  data: LandingData;
  onChange: (next: LandingData) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      <Field
        label="Role"
        htmlFor="ld-role"
        error={errors['data.role']}
        hint="The pill above the headline — what you are, where the disciplines are what you do."
      >
        <input
          id="ld-role"
          className={inputClasses}
          value={data.role}
          onChange={(event) => onChange({ ...data, role: event.target.value })}
          placeholder="Full stack developer"
        />
      </Field>

      <Field label="Greeting" htmlFor="ld-greeting" error={errors['data.greeting']}>
        <input
          id="ld-greeting"
          className={inputClasses}
          value={data.greeting}
          onChange={(event) => onChange({ ...data, greeting: event.target.value })}
          placeholder="Hi, I'm"
        />
      </Field>

      <Field
        label="Name"
        htmlFor="ld-name"
        error={errors['data.name']}
        hint="Shown in the accent colour after the greeting."
      >
        <input
          id="ld-name"
          className={inputClasses}
          value={data.name}
          onChange={(event) => onChange({ ...data, name: event.target.value })}
        />
      </Field>

      <Field label="Statement" htmlFor="ld-statement" error={errors['data.statement']}>
        <textarea
          id="ld-statement"
          className={`${inputClasses} min-h-20`}
          value={data.statement}
          onChange={(event) => onChange({ ...data, statement: event.target.value })}
          placeholder="I build apps that solve real-world problems"
        />
      </Field>

      <StringListEditor
        label="Disciplines"
        hint="The short list under the statement — Mobile, Web, XR, AI."
        idPrefix="ld-discipline"
        values={data.disciplines}
        onChange={(disciplines) => onChange({ ...data, disciplines })}
        placeholder="XR"
      />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-800">Hero buttons</legend>
        <p className="text-xs text-slate-500">
          Labels only. The first goes to the work index and the second downloads the CV
          below — leave either empty and that button is not drawn.
        </p>
        <Field
          label="First button"
          htmlFor="ld-hero-primary"
          error={errors['data.heroPrimaryLabel']}
        >
          <input
            id="ld-hero-primary"
            className={inputClasses}
            value={data.heroPrimaryLabel}
            onChange={(event) => onChange({ ...data, heroPrimaryLabel: event.target.value })}
            placeholder="View my work"
          />
        </Field>
        <Field
          label="Second button"
          htmlFor="ld-hero-secondary"
          error={errors['data.heroSecondaryLabel']}
        >
          <input
            id="ld-hero-secondary"
            className={inputClasses}
            value={data.heroSecondaryLabel}
            onChange={(event) => onChange({ ...data, heroSecondaryLabel: event.target.value })}
            placeholder="Download CV"
          />
        </Field>
      </fieldset>

      <CvField
        idPrefix="ld"
        value={data.cvAssetId}
        onChange={(cvAssetId) => onChange({ ...data, cvAssetId })}
      />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-800">Badge</legend>
        <Field label="Title" htmlFor="ld-badge-title" error={errors['data.badge.title']}>
          <input
            id="ld-badge-title"
            className={inputClasses}
            value={data.badge.title}
            onChange={(event) =>
              onChange({ ...data, badge: { ...data.badge, title: event.target.value } })
            }
            placeholder="CODE. BUILD. SOLVE."
          />
        </Field>
        <Field label="Body" htmlFor="ld-badge-body" error={errors['data.badge.body']}>
          <input
            id="ld-badge-body"
            className={inputClasses}
            value={data.badge.body}
            onChange={(event) =>
              onChange({ ...data, badge: { ...data.badge, body: event.target.value } })
            }
          />
        </Field>
      </fieldset>

      <Field
        label="Terminal title"
        htmlFor="ld-terminal-title"
        error={errors['data.terminalTitle']}
        hint="The caption in the terminal's window bar. Decorative, and hidden on a phone."
      >
        <input
          id="ld-terminal-title"
          className={inputClasses}
          value={data.terminalTitle}
          onChange={(event) => onChange({ ...data, terminalTitle: event.target.value })}
          placeholder="developer@teczo ~"
        />
      </Field>

      <StringListEditor
        label="Terminal lines"
        hint="Decorative, and hidden on a phone. One line each."
        idPrefix="ld-terminal"
        values={data.terminalLines}
        onChange={(terminalLines) => onChange({ ...data, terminalLines })}
        placeholder="developer@teczo:~$ whoami"
      />

      <PortraitField
        idPrefix="ld"
        value={data.portraitAssetId}
        onChange={(portraitAssetId) => onChange({ ...data, portraitAssetId })}
      />

      <StringListEditor
        label="Code pane tabs"
        hint="The file names along the top of the pane beside the terminal."
        idPrefix="ld-code-tab"
        values={data.codePanel.tabs}
        onChange={(tabs) => onChange({ ...data, codePanel: { ...data.codePanel, tabs } })}
        placeholder="App.jsx"
      />

      <Field
        label="Code pane"
        htmlFor="ld-code"
        error={errors['data.codePanel.code']}
        hint="Shown as plain text, exactly as typed. Decorative, and hidden on a phone."
      >
        <textarea
          id="ld-code"
          className={`${inputClasses} min-h-40 font-mono text-xs`}
          value={data.codePanel.code}
          onChange={(event) =>
            onChange({ ...data, codePanel: { ...data.codePanel, code: event.target.value } })
          }
        />
      </Field>

      <StatusRowsEditor
        rows={data.statusRows}
        onChange={(statusRows) => onChange({ ...data, statusRows })}
      />

      <Field
        label="Tech row label"
        htmlFor="ld-tech-label"
        error={errors['data.techLabel']}
        hint="The small line above the marks. Empty and the row is drawn without it."
      >
        <input
          id="ld-tech-label"
          className={inputClasses}
          value={data.techLabel}
          onChange={(event) => onChange({ ...data, techLabel: event.target.value })}
          placeholder="Tech I work with"
        />
      </Field>

      <TechMarksEditor
        idPrefix="ld"
        keys={data.techMarks}
        onChange={(techMarks) => onChange({ ...data, techMarks })}
      />

      <StatsEditor
        idPrefix="ld"
        stats={data.stats}
        onChange={(stats) => onChange({ ...data, stats })}
      />

      <SocialsEditor
        socials={data.socials}
        onChange={(socials) => onChange({ ...data, socials })}
        idPrefix="ld"
      />

      <Field
        label="Header button"
        htmlFor="ld-header-cta"
        error={errors['data.headerCtaLabel']}
        hint="The pill on the right of the site header. It goes to the contact page."
      >
        <input
          id="ld-header-cta"
          className={inputClasses}
          value={data.headerCtaLabel}
          onChange={(event) => onChange({ ...data, headerCtaLabel: event.target.value })}
          placeholder="Let's connect"
        />
      </Field>

      <Field label="Call to action" htmlFor="ld-cta" error={errors['data.ctaLabel']}>
        <input
          id="ld-cta"
          className={inputClasses}
          value={data.ctaLabel}
          onChange={(event) => onChange({ ...data, ctaLabel: event.target.value })}
          placeholder="Let's build something great"
        />
      </Field>

      <Field
        label="Featured work intro"
        htmlFor="ld-featured-intro"
        error={errors['data.featuredIntro']}
        hint="One line under the Featured Projects heading."
      >
        <input
          id="ld-featured-intro"
          className={inputClasses}
          value={data.featuredIntro}
          onChange={(event) => onChange({ ...data, featuredIntro: event.target.value })}
          placeholder="Selected products and platforms I've built."
        />
      </Field>

      <Field
        label="Featured projects shown"
        htmlFor="ld-featured"
        error={errors['data.featuredLimit']}
        hint="How many published projects the landing page lists."
      >
        <input
          id="ld-featured"
          type="number"
          inputMode="numeric"
          min={1}
          max={24}
          className={inputClasses}
          value={String(data.featuredLimit)}
          onChange={(event) =>
            onChange({ ...data, featuredLimit: Number(event.target.value) || 1 })
          }
        />
      </Field>
    </div>
  );
}

/**
 * The about page's structured half.
 *
 * Long, because the page is: every heading, tile, glyph, count and timeline
 * entry on it is written here rather than in the portfolio's source, which is
 * what stops a sentence on a public page needing a deploy to change (§13.6).
 *
 * The narrative itself is not here — it is the body below, where prose belongs.
 */
export function AboutDataForm({
  data,
  onChange,
  errors,
}: {
  data: AboutData;
  onChange: (next: AboutData) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      <Field
        label="Headline"
        htmlFor="ab-headline"
        error={errors['data.headline']}
        hint="The line at the top of the page."
      >
        <input
          id="ab-headline"
          className={inputClasses}
          value={data.headline}
          onChange={(event) => onChange({ ...data, headline: event.target.value })}
          placeholder="About Me"
        />
      </Field>

      <Field
        label="Subtitle"
        htmlFor="ab-subtitle"
        error={errors['data.subtitle']}
        hint="The line under the headline. The paragraph after it is the body below."
      >
        <input
          id="ab-subtitle"
          className={inputClasses}
          value={data.subtitle}
          onChange={(event) => onChange({ ...data, subtitle: event.target.value })}
          placeholder="Developer. Builder. Problem Solver."
        />
      </Field>

      <RowsEditor
        rows={data.infoCards}
        onChange={(infoCards) => onChange({ ...data, infoCards })}
        idPrefix="ab-info"
        legend="Info tiles"
        hint="The small boxes under the intro — experience, location, role, focus. The glyph is optional."
        addLabel="Add a tile"
        itemNoun="Info tile"
        glyph={{ kinds: ['stat'], emptyLabel: 'No glyph' }}
        fields={[
          { key: 'label', label: 'label', placeholder: 'Experience' },
          { key: 'value', label: 'value', placeholder: '6+ Years' },
        ]}
        blank={{ mediaKey: '', label: '', value: '' }}
      />

      <StringListEditor
        label="Terminal lines"
        hint="The screen beside the intro. Decoration — it is hidden on a phone and on a tablet."
        idPrefix="ab-terminal"
        values={data.terminalLines}
        onChange={(terminalLines) => onChange({ ...data, terminalLines })}
        placeholder="developer@teczo:~$ whoami"
      />

      <Field
        label="Terminal title"
        htmlFor="ab-terminal-title"
        error={errors['data.terminalTitle']}
        hint="The caption in its window bar. Empty leaves the bar with just the lights."
      >
        <input
          id="ab-terminal-title"
          className={inputClasses}
          value={data.terminalTitle}
          onChange={(event) => onChange({ ...data, terminalTitle: event.target.value })}
          placeholder="developer@teczo ~"
        />
      </Field>

      <Field
        label="Philosophy heading"
        htmlFor="ab-philosophy-label"
        error={errors['data.philosophy.label']}
        hint="Left empty, the panel shows its words without a heading."
      >
        <input
          id="ab-philosophy-label"
          className={inputClasses}
          value={data.philosophy.label}
          onChange={(event) =>
            onChange({ ...data, philosophy: { ...data.philosophy, label: event.target.value } })
          }
          placeholder="My Philosophy"
        />
      </Field>

      <Field label="Philosophy" htmlFor="ab-philosophy-body" error={errors['data.philosophy.body']}>
        <textarea
          id="ab-philosophy-body"
          className={`${inputClasses} min-h-24`}
          value={data.philosophy.body}
          onChange={(event) =>
            onChange({ ...data, philosophy: { ...data.philosophy, body: event.target.value } })
          }
        />
      </Field>

      <Field
        label="Tech heading"
        htmlFor="ab-tech-label"
        error={errors['data.techLabel']}
        hint="The line above the row of marks."
      >
        <input
          id="ab-tech-label"
          className={inputClasses}
          value={data.techLabel}
          onChange={(event) => onChange({ ...data, techLabel: event.target.value })}
          placeholder="Tech I Love"
        />
      </Field>

      <TechMarksEditor
        keys={data.techMarks}
        onChange={(techMarks) => onChange({ ...data, techMarks })}
        idPrefix="ab"
      />

      <Field
        label="Exploring heading"
        htmlFor="ab-exploring-label"
        error={errors['data.exploring.label']}
      >
        <input
          id="ab-exploring-label"
          className={inputClasses}
          value={data.exploring.label}
          onChange={(event) =>
            onChange({ ...data, exploring: { ...data.exploring, label: event.target.value } })
          }
          placeholder="Currently Exploring"
        />
      </Field>

      <StringListEditor
        label="Exploring"
        hint="What you are learning at the moment, one line each."
        idPrefix="ab-exploring"
        values={data.exploring.items}
        onChange={(items) => onChange({ ...data, exploring: { ...data.exploring, items } })}
        placeholder="Agentic development workflows"
      />

      <StatsEditor
        stats={data.stats}
        onChange={(stats) => onChange({ ...data, stats })}
        idPrefix="ab"
      />

      <Field
        label="Drivers heading"
        htmlFor="ab-drivers-label"
        error={errors['data.driversLabel']}
      >
        <input
          id="ab-drivers-label"
          className={inputClasses}
          value={data.driversLabel}
          onChange={(event) => onChange({ ...data, driversLabel: event.target.value })}
          placeholder="What Drives Me"
        />
      </Field>

      <RowsEditor
        rows={data.drivers}
        onChange={(drivers) => onChange({ ...data, drivers })}
        idPrefix="ab-driver"
        legend="Drivers"
        hint="The cards under the counts. The glyph is optional; a card without one keeps its words."
        addLabel="Add a driver"
        itemNoun="Driver"
        glyph={{ kinds: ['stat'], emptyLabel: 'No glyph' }}
        fields={[
          { key: 'title', label: 'title', placeholder: 'Shipping' },
          { key: 'body', label: 'body', placeholder: 'Software only counts when real people use it.', multiline: true },
        ]}
        blank={{ mediaKey: '', title: '', body: '' }}
      />

      <Field
        label="Journey heading"
        htmlFor="ab-journey-label"
        error={errors['data.journeyLabel']}
      >
        <input
          id="ab-journey-label"
          className={inputClasses}
          value={data.journeyLabel}
          onChange={(event) => onChange({ ...data, journeyLabel: event.target.value })}
          placeholder="My Journey"
        />
      </Field>

      <RowsEditor
        rows={data.journey}
        onChange={(journey) => onChange({ ...data, journey })}
        idPrefix="ab-journey"
        legend="Journey"
        hint="The timeline, in the order you set here — nothing sorts it by year."
        addLabel="Add an entry"
        itemNoun="Journey entry"
        fields={[
          { key: 'year', label: 'year', placeholder: '2019' },
          { key: 'event', label: 'event', placeholder: 'Graduated in Mechanical Engineering', multiline: true },
        ]}
        blank={{ year: '', event: '' }}
      />

      <Field
        label="Closing headline"
        htmlFor="ab-cta-headline"
        error={errors['data.ctaHeadline']}
        hint="The bar across the foot of the page."
      >
        <input
          id="ab-cta-headline"
          className={inputClasses}
          value={data.ctaHeadline}
          onChange={(event) => onChange({ ...data, ctaHeadline: event.target.value })}
          placeholder="Let's build something that ships."
        />
      </Field>

      <Field label="Closing paragraph" htmlFor="ab-cta-body" error={errors['data.ctaBody']}>
        <textarea
          id="ab-cta-body"
          className={`${inputClasses} min-h-20`}
          value={data.ctaBody}
          onChange={(event) => onChange({ ...data, ctaBody: event.target.value })}
        />
      </Field>

      <Field
        label="Closing button"
        htmlFor="ab-cta-label"
        error={errors['data.ctaLabel']}
        hint="Its words only — the button goes to the contact page."
      >
        <input
          id="ab-cta-label"
          className={inputClasses}
          value={data.ctaLabel}
          onChange={(event) => onChange({ ...data, ctaLabel: event.target.value })}
          placeholder="Get In Touch"
        />
      </Field>

      <SocialsEditor
        socials={data.socials}
        onChange={(socials) => onChange({ ...data, socials })}
        idPrefix="ab"
      />

      <PortraitField
        idPrefix="ab"
        value={data.portraitAssetId}
        onChange={(portraitAssetId) => onChange({ ...data, portraitAssetId })}
      />
    </div>
  );
}

export function SkillsDataForm({
  data,
  onChange,
  errors,
}: {
  data: SkillsData;
  onChange: (next: SkillsData) => void;
  errors: Record<string, string>;
}) {
  type Group = SkillsData['groups'][number];

  function updateGroup(index: number, next: Group): void {
    onChange({ ...data, groups: data.groups.map((group, at) => (at === index ? next : group)) });
  }

  function moveGroup(from: number, to: number): void {
    if (to < 0 || to >= data.groups.length) return;
    const groups = [...data.groups];
    const [moved] = groups.splice(from, 1);
    groups.splice(to, 0, moved as Group);
    onChange({ ...data, groups });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Icon and label, grouped. No proficiency levels or years — a self-assessed “expert” badge
        tells a visitor nothing they will believe.
      </p>

      {data.groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
          No groups yet. The skills page shows nothing until there is at least one.
        </p>
      ) : null}

      {data.groups.map((group, index) => (
        <div key={index} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Field
                label="Group"
                htmlFor={`sk-group-${index}`}
                required
                error={errors[`data.groups[${index}].label`]}
              >
                <input
                  id={`sk-group-${index}`}
                  className={inputClasses}
                  value={group.label}
                  onChange={(event) => updateGroup(index, { ...group, label: event.target.value })}
                  placeholder="Frontend"
                />
              </Field>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                variant="ghost"
                className="min-h-9 px-2 text-xs"
                disabled={index === 0}
                aria-label={`Move group ${index + 1} up`}
                onClick={() => moveGroup(index, index - 1)}
              >
                ↑
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="min-h-9 px-2 text-xs"
                disabled={index === data.groups.length - 1}
                aria-label={`Move group ${index + 1} down`}
                onClick={() => moveGroup(index, index + 1)}
              >
                ↓
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="min-h-9 px-2 text-xs text-red-600 hover:bg-red-50"
                aria-label={`Remove group ${index + 1}`}
                onClick={() =>
                  onChange({ ...data, groups: data.groups.filter((_, at) => at !== index) })
                }
              >
                Remove
              </Button>
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-slate-700">Items</legend>

            {group.items.map((item, itemIndex) => (
              <div key={itemIndex} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <MarkSelect
                    id={`sk-${index}-item-${itemIndex}`}
                    value={item.mediaKey}
                    onChange={(mediaKey) =>
                      updateGroup(index, {
                        ...group,
                        items: group.items.map((entry, at) =>
                          at === itemIndex ? { ...entry, mediaKey } : entry,
                        ),
                      })
                    }
                    kinds={['tech', 'platform']}
                    emptyLabel="Choose a mark…"
                  />
                </div>
                <input
                  aria-label={`Item ${itemIndex + 1} label`}
                  className={`${inputClasses} min-w-0 flex-1`}
                  value={item.label}
                  placeholder="React"
                  onChange={(event) =>
                    updateGroup(index, {
                      ...group,
                      items: group.items.map((entry, at) =>
                        at === itemIndex ? { ...entry, label: event.target.value } : entry,
                      ),
                    })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-9 shrink-0 px-2 text-xs text-red-600 hover:bg-red-50"
                  aria-label={`Remove item ${itemIndex + 1} from group ${index + 1}`}
                  onClick={() =>
                    updateGroup(index, {
                      ...group,
                      items: group.items.filter((_, at) => at !== itemIndex),
                    })
                  }
                >
                  ✕
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="secondary"
              className="min-h-9 text-xs"
              onClick={() =>
                updateGroup(index, { ...group, items: [...group.items, { mediaKey: '', label: '' }] })
              }
            >
              Add an item
            </Button>
          </fieldset>
        </div>
      ))}

      <Button
        type="button"
        variant="secondary"
        onClick={() => onChange({ ...data, groups: [...data.groups, { label: '', items: [] }] })}
      >
        Add a group
      </Button>
    </div>
  );
}

export function ContactDataForm({
  data,
  onChange,
  errors,
}: {
  data: ContactData;
  onChange: (next: ContactData) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      <Field label="Headline" htmlFor="ct-headline" error={errors['data.headline']}>
        <input
          id="ct-headline"
          className={inputClasses}
          value={data.headline}
          onChange={(event) => onChange({ ...data, headline: event.target.value })}
        />
      </Field>

      <Field label="Intro" htmlFor="ct-intro" error={errors['data.intro']}>
        <textarea
          id="ct-intro"
          className={`${inputClasses} min-h-20`}
          value={data.intro}
          onChange={(event) => onChange({ ...data, intro: event.target.value })}
        />
      </Field>

      <Field
        label="Email"
        htmlFor="ct-email"
        error={errors['data.email']}
        hint="Shown on the page. The enquiry form posts elsewhere and does not use this."
      >
        <input
          id="ct-email"
          className={inputClasses}
          value={data.email}
          onChange={(event) => onChange({ ...data, email: event.target.value.trim() })}
          placeholder="you@example.com"
        />
      </Field>

      <SocialsEditor
        socials={data.socials}
        onChange={(socials) => onChange({ ...data, socials })}
        idPrefix="ct"
      />
    </div>
  );
}

/** The schema each key's `data` is filled out against. */
export const DATA_SCHEMAS: Record<SiteContentKey, Validator<unknown>> = {
  landing: landingDataSchema,
  about: aboutDataSchema,
  skills: skillsDataSchema,
  contact: contactDataSchema,
};
