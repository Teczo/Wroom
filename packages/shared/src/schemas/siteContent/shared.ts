import { slug, string, url, withDefault, type Validator } from '../../validate.js';

/**
 * Pieces more than one page's `data` needs.
 *
 * Everything here tolerates the empty string. A draft is half-written by
 * nature — refusing to save a page because a social row has no URL yet would
 * make the editor unusable for the ten minutes it takes to write a page.
 */

/** An http(s) URL, or nothing yet. */
export function optionalUrl(): Validator<string> {
  const inner = url();

  return {
    run(input, path, issues) {
      if (typeof input === 'string' && input.trim() === '') return '';
      return inner.run(input, path, issues);
    },
  };
}

/**
 * An email address, or nothing yet.
 *
 * Loose on purpose, matching `enquiries`: a stricter pattern rejects addresses
 * that genuinely work, and this one is displayed rather than delivered to.
 */
export function optionalEmail(): Validator<string> {
  const inner = string({ min: 3, max: 200, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ });

  return {
    run(input, path, issues) {
      if (typeof input === 'string' && input.trim() === '') return '';
      return inner.run(input, path, issues);
    },
  };
}

/**
 * One social row: which mark to draw, and where it points.
 *
 * `mediaKey` is a `mediaLibrary.key` — a key, not a label, and not an icon
 * pasted into a component (CLAUDE.md §7.3).
 */
export const socialShape = {
  mediaKey: slug(),
  url: withDefault(optionalUrl(), ''),
};
