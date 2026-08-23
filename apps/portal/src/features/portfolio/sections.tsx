import type {
  Asset,
  DemoVideo,
  PortfolioFeatureCard,
  PortfolioKeyModule,
} from '@wroom/shared';
import type { ReactNode } from 'react';

import { Field, inputClasses } from '../../components/Field';
import { ListEditor } from './ListEditor';
import { AssetPicker, MarkPicker } from './pickers';

/**
 * The optional body sections of a portfolio entry.
 *
 * Every one of these hides entirely on the public site when it is empty
 * (CLAUDE.md §7.4), so "clear it" has to mean null or an empty array — never an
 * object of empty strings, which would render as an empty heading. That is why
 * each optional block here is a toggle that produces null rather than a set of
 * fields you blank out by hand.
 */

export function SectionHeading({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="border-t border-slate-200 pt-6">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

/**
 * A section you can switch off entirely.
 *
 * Unticking is what produces the null. The fields stay mounted but hidden while
 * off, so switching back on does not lose what was typed before saving.
 */
export function OptionalSection({
  enabled,
  onToggle,
  label,
  offHint,
  children,
}: {
  enabled: boolean;
  onToggle: (next: boolean) => void;
  label: string;
  offHint: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-0.5 size-5 shrink-0 rounded border-slate-300"
          checked={enabled}
          onChange={(event) => onToggle(event.target.checked)}
        />
        <span className="text-sm">
          <span className="font-medium text-slate-800">{label}</span>
          {enabled ? null : <span className="mt-0.5 block text-xs text-slate-500">{offHint}</span>}
        </span>
      </label>

      {enabled ? <div className="mt-3 space-y-3">{children}</div> : null}
    </div>
  );
}

export function FeatureCardsEditor({
  cards,
  onChange,
}: {
  cards: PortfolioFeatureCard[];
  onChange: (next: PortfolioFeatureCard[]) => void;
}) {
  return (
    <ListEditor
      items={cards}
      onChange={onChange}
      itemLabel="Card"
      addLabel="Add a card"
      emptyHint="No cards, so the whole section is left off the public page."
      blank={() => ({ iconKey: '', title: '', body: '' })}
    >
      {(card, index, update) => (
        <>
          <Field label="Title" htmlFor={`fc-title-${index}`} required>
            <input
              id={`fc-title-${index}`}
              className={inputClasses}
              value={card.title}
              onChange={(event) => update({ ...card, title: event.target.value })}
              placeholder="Immersive 3D / XR"
            />
          </Field>

          <Field label="Body" htmlFor={`fc-body-${index}`}>
            <textarea
              id={`fc-body-${index}`}
              className={`${inputClasses} min-h-20`}
              value={card.body}
              onChange={(event) => update({ ...card, body: event.target.value })}
            />
          </Field>

          <Field
            label="Icon"
            htmlFor={`fc-icon-${index}`}
            hint="From the media library. Tap again to clear it."
          >
            <MarkPicker
              value={card.iconKey}
              onChange={(iconKey) => update({ ...card, iconKey })}
              kinds={['tech', 'platform']}
            />
          </Field>
        </>
      )}
    </ListEditor>
  );
}

export function KeyModulesEditor({
  modules,
  onChange,
}: {
  modules: PortfolioKeyModule[];
  onChange: (next: PortfolioKeyModule[]) => void;
}) {
  return (
    <ListEditor
      items={modules}
      onChange={onChange}
      itemLabel="Module"
      addLabel="Add a module"
      emptyHint="No modules, so the whole section is left off the public page."
      blank={() => ({ title: '', body: '' })}
    >
      {(module, index, update) => (
        <>
          <Field label="Title" htmlFor={`km-title-${index}`} required>
            <input
              id={`km-title-${index}`}
              className={inputClasses}
              value={module.title}
              onChange={(event) => update({ ...module, title: event.target.value })}
              placeholder="3D Model Viewer"
            />
          </Field>

          <Field label="Body" htmlFor={`km-body-${index}`}>
            <textarea
              id={`km-body-${index}`}
              className={`${inputClasses} min-h-20`}
              value={module.body}
              onChange={(event) => update({ ...module, body: event.target.value })}
            />
          </Field>
        </>
      )}
    </ListEditor>
  );
}

/** What the demo video editor holds while it is being edited. */
export type DemoVideoDraft = {
  provider: DemoVideo['provider'];
  assetId: string | null;
  externalId: string;
  posterAssetId: string | null;
};

/**
 * Why a demo video cannot be saved yet, or null when it can.
 *
 * Mirrors the shared schema so the answer arrives before a round trip rather
 * than as a 400. The poster is required for every provider: a video with no
 * poster is a black rectangle until it buffers, and this one sits on the hero
 * of a project page.
 */
export function demoVideoProblem(draft: DemoVideoDraft): string | null {
  if (!draft.posterAssetId) return 'Pick a poster image — every demo video needs one.';

  if (draft.provider === 'blob' && !draft.assetId) {
    return 'Pick the video file, or switch the provider to YouTube or Vimeo.';
  }

  if (draft.provider !== 'blob' && draft.externalId.trim() === '') {
    return `Enter the ${draft.provider} video id.`;
  }

  return null;
}

export function DemoVideoEditor({
  draft,
  onChange,
  videoAssets,
  posterAssets,
}: {
  draft: DemoVideoDraft;
  onChange: (next: DemoVideoDraft) => void;
  videoAssets: Asset[];
  posterAssets: Asset[];
}) {
  const problem = demoVideoProblem(draft);

  return (
    <>
      <Field label="Provider" htmlFor="dv-provider">
        <select
          id="dv-provider"
          className={inputClasses}
          value={draft.provider}
          onChange={(event) =>
            onChange({ ...draft, provider: event.target.value as DemoVideo['provider'] })
          }
        >
          <option value="blob">One of your own uploads</option>
          <option value="youtube">YouTube</option>
          <option value="vimeo">Vimeo</option>
        </select>
      </Field>

      {draft.provider === 'blob' ? (
        <Field label="Video file" htmlFor="dv-asset" required>
          <AssetPicker
            id="dv-asset"
            value={draft.assetId}
            onChange={(assetId) => onChange({ ...draft, assetId })}
            assets={videoAssets}
            emptyLabel="Choose a video…"
          />
        </Field>
      ) : (
        <Field
          label={`${draft.provider === 'youtube' ? 'YouTube' : 'Vimeo'} id`}
          htmlFor="dv-external"
          required
          hint="Just the id, not the whole URL."
        >
          <input
            id="dv-external"
            className={inputClasses}
            value={draft.externalId}
            onChange={(event) => onChange({ ...draft, externalId: event.target.value })}
            placeholder={draft.provider === 'youtube' ? 'dQw4w9WgXcQ' : '76979871'}
          />
        </Field>
      )}

      <Field
        label="Poster image"
        htmlFor="dv-poster"
        required
        hint="Shown before the video plays. Required whichever provider you use."
      >
        <AssetPicker
          id="dv-poster"
          value={draft.posterAssetId}
          onChange={(posterAssetId) => onChange({ ...draft, posterAssetId })}
          assets={posterAssets}
          emptyLabel="Choose a poster…"
        />
      </Field>

      {problem ? (
        <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{problem}</p>
      ) : null}
    </>
  );
}
