import {
  aboutDataSchema,
  contactDataSchema,
  landingDataSchema,
  skillsDataSchema,
  validate,
  type SiteContentKey,
  type Validator,
} from '@wroom/shared';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
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

      <StringListEditor
        label="Terminal lines"
        hint="Decorative, and hidden on a phone. One line each."
        idPrefix="ld-terminal"
        values={data.terminalLines}
        onChange={(terminalLines) => onChange({ ...data, terminalLines })}
        placeholder="developer@teczo:~$ whoami"
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

      <SocialsEditor
        socials={data.socials}
        onChange={(socials) => onChange({ ...data, socials })}
        idPrefix="ld"
      />

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
        hint="The narrative itself is the body below — this is just the line above it."
      >
        <input
          id="ab-headline"
          className={inputClasses}
          value={data.headline}
          onChange={(event) => onChange({ ...data, headline: event.target.value })}
        />
      </Field>

      <Field
        label="Portrait asset id"
        htmlFor="ab-portrait"
        error={errors['data.portraitAssetId']}
        hint="An asset id, typed in. There is no endpoint that lists files across projects yet, so there is nothing to build a picker from — see the report."
      >
        <input
          id="ab-portrait"
          className={`${inputClasses} font-mono`}
          value={data.portraitAssetId ?? ''}
          placeholder="none"
          onChange={(event) =>
            onChange({
              ...data,
              portraitAssetId: event.target.value.trim() === '' ? null : event.target.value.trim(),
            })
          }
        />
      </Field>
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
