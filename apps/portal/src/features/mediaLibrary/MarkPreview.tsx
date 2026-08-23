import { sanitiseSvg } from '@wroom/shared';
import { useMemo } from 'react';

/**
 * Renders a library mark.
 *
 * This is the one place in the portal that uses `dangerouslySetInnerHTML`, and
 * CLAUDE.md §7.3 permits it here only because the markup has been through the
 * sanitiser. Two different reasons apply depending on where the string came
 * from, and both hold:
 *
 *   - a saved mark was sanitised by the API on write, which is the real gate
 *   - a pasted one is sanitised here before it is rendered
 *
 * The second is not a security boundary and is not relied on as one — the API
 * sanitises again on save regardless. It is here because rendering a paste
 * unsanitised would be exactly what §7.3 says never to do, and because a
 * preview of the raw paste would show a mark the sanitiser is about to strip.
 *
 * An `<img>` with a data URI would sandbox the markup and need none of this,
 * but an image is its own document and inherits no colour from the page — which
 * would defeat the only thing the two swatches below exist to show.
 */
export function MarkGlyph({ svg, className = '' }: { svg: string; className?: string }) {
  const safe = useMemo(() => sanitiseSvg(svg), [svg]);

  if (!safe) return null;

  return <span className={className} dangerouslySetInnerHTML={{ __html: safe }} />;
}

/**
 * What the sanitiser will strip, or null when it will strip nothing.
 *
 * Deliberately driven off what is actually in the paste rather than off whether
 * the output differs from the input. The sanitiser also normalises whitespace
 * and quoting, so comparing the two strings warns about a clean mark that is
 * merely being reformatted — a warning that cries wolf is worse than none.
 */
function describeStripping(pasted: string): string | null {
  if (!pasted.trim()) return null;

  const removed: string[] = [];
  if (/<\s*script/i.test(pasted)) removed.push('a <script> block');
  if (/\son[a-z]+\s*=/i.test(pasted)) removed.push('event handler attributes');
  if (/<\s*style/i.test(pasted)) removed.push('an embedded <style>');
  if (/<\s*foreignObject/i.test(pasted)) removed.push('a <foreignObject>');
  if (/(?:xlink:)?href\s*=\s*["'](?!#)/i.test(pasted)) removed.push('links pointing off the page');

  return removed.length > 0 ? `Stripped on save: ${removed.join(', ')}.` : null;
}

/**
 * Mirrors the `^<svg` rule the shared schema enforces, so a paste that the API
 * would refuse says so here rather than after a round trip. Plain text renders
 * as plain text — harmless, but it looks like the mark simply did not work.
 */
function looksLikeSvg(pasted: string): boolean {
  return /^<svg[\s>]/i.test(pasted.trim());
}

/**
 * One swatch. `color` is set on the wrapper so a mark drawn with
 * `currentColor` takes it, and one drawn with a baked-in fill does not — which
 * is the whole point of showing two.
 */
function Swatch({
  svg,
  label,
  tone,
}: {
  svg: string;
  label: string;
  tone: 'light' | 'dark';
}) {
  const surface =
    tone === 'light' ? 'bg-white text-slate-900 border-slate-200' : 'bg-slate-900 text-slate-100 border-slate-700';

  return (
    <div className="min-w-0 flex-1">
      <div
        className={`flex min-h-24 items-center justify-center rounded-lg border p-4 ${surface}`}
      >
        {/*
         * No width or height is imposed: the mark renders at whatever size it
         * declares, which is what you are checking. The cap only stops an
         * oversized paste from pushing the form off the screen.
         */}
        <MarkGlyph svg={svg} className="[&_svg]:max-h-16 [&_svg]:max-w-full" />
      </div>
      <p className="mt-1 text-center text-xs text-slate-500">{label}</p>
    </div>
  );
}

/**
 * The pasted mark on a light and a dark surface, side by side.
 *
 * Side by side and not stacked even at 390px: the comparison is the feature,
 * and two 24px glyphs a screen-height apart tell you nothing.
 */
export function MarkPreview({ svg, blobUrl }: { svg: string; blobUrl: string | null }) {
  const trimmed = svg.trim();
  const inheritsColour = /currentColor/i.test(trimmed);
  const stripped = describeStripping(svg);
  const rendersToNothing = trimmed !== '' && sanitiseSvg(svg) === '';
  const notAnSvg = trimmed !== '' && !looksLikeSvg(trimmed);

  if (!trimmed && blobUrl) {
    return (
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-h-24 items-center justify-center rounded-lg border border-slate-200 bg-white p-4">
            <img src={blobUrl} alt="" className="max-h-16 max-w-full" />
          </div>
          <p className="mt-1 text-center text-xs text-slate-500">Raster mark</p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-h-24 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 p-4">
            <img src={blobUrl} alt="" className="max-h-16 max-w-full" />
          </div>
          <p className="mt-1 text-center text-xs text-slate-500">On dark</p>
        </div>
      </div>
    );
  }

  if (!trimmed) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        Paste an SVG above and it appears here, on both surfaces the public site uses.
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-3">
        <Swatch svg={svg} label="On light" tone="light" />
        <Swatch svg={svg} label="On dark" tone="dark" />
      </div>

      {notAnSvg ? (
        <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">
          This does not start with an <code>&lt;svg&gt;</code> element, so it will be refused on
          save. Paste the whole tag, opening angle bracket included.
        </p>
      ) : rendersToNothing ? (
        <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">
          Nothing survives sanitising — this will save as an empty mark. Check that what you
          pasted is an <code>&lt;svg&gt;</code> element.
        </p>
      ) : (
        <p
          className={`mt-2 text-xs ${inheritsColour ? 'text-emerald-700' : 'text-amber-700'}`}
        >
          {inheritsColour
            ? 'Uses currentColor, so it takes the colour of whatever it sits on — the two above should differ.'
            : 'No currentColor in this mark, so it keeps its own colours on both surfaces. Fine for a brand logo; wrong for a UI glyph.'}
        </p>
      )}

      {stripped ? <p className="mt-1 text-xs text-slate-500">{stripped}</p> : null}
    </div>
  );
}
