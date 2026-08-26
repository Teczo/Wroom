import type { SiteContentMark } from '@wroom/shared';

/**
 * A mark from `mediaLibrary`, as a published content record carries it.
 *
 * `svg` is inline markup, sanitised by the API when the mark was saved and
 * resolved into `published.data.marks` by the publish action. This is the one
 * API in either app permitted to render markup, and only because that
 * write-time gate exists (§7.3, §8) — nothing else may be passed through here.
 *
 * It draws with `currentColor` and fills its box, so the colour and the size
 * both come from the caller rather than from the file.
 */
export function Mark({
  mark,
  className = 'size-6',
}: {
  mark: SiteContentMark;
  className?: string;
}) {
  // A library record can exist with no markup yet — a raster-only mark, or one
  // added before its file was pasted in. Nothing to draw is not an empty box.
  if (!mark.svg) return null;

  return (
    <span
      aria-hidden
      className={`${className} [&_svg]:size-full`}
      dangerouslySetInnerHTML={{ __html: mark.svg }}
    />
  );
}

/**
 * The mark a `mediaKey` resolved to at publish, or null.
 *
 * Null covers every reason a key can arrive without one: no record, no markup,
 * or a mark whose usage was never approved and which the publish action
 * therefore dropped. Each caller decides what to show instead, and every one of
 * them falls back to the words rather than to a hole in the layout.
 */
export function findMark(marks: SiteContentMark[], mediaKey: string): SiteContentMark | null {
  return marks.find((mark) => mark.key === mediaKey && mark.svg !== '') ?? null;
}
