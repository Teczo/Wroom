/**
 * Strips the dangerous parts out of `mediaLibrary.svg`.
 *
 * This is a **write-time** gate, and it is the only one there is. Library SVG
 * is rendered with `dangerouslySetInnerHTML` on the public site (CLAUDE.md §7.3)
 * because a mark has to inherit `currentColor`, so nothing downstream inspects
 * the markup again. Whatever this function lets through is what a visitor's
 * browser executes.
 *
 * The strip list is CLAUDE.md §8, and nothing more:
 *
 *   - `<script>`, contents included
 *   - every `on*` attribute
 *   - `href` and `xlink:href` pointing anywhere external
 *   - `<foreignObject>`, contents included
 *   - embedded `<style>`, contents included
 *
 * Two rules that are not in that list but fall out of honouring it properly:
 * comments and doctype/processing instructions go too. A comment can hide an
 * unbalanced tag, and a `<!DOCTYPE>` can carry entity definitions while
 * `<?xml-stylesheet?>` is an external stylesheet by another name.
 *
 * Deliberately hand-rolled. The input is one element from a designer or a
 * vendor's brand kit, not arbitrary web HTML, and CLAUDE.md §3 does not name a
 * sanitising dependency.
 */

/** Removed whole — opening tag, contents, closing tag. */
const FORBIDDEN_ELEMENTS = ['script', 'style', 'foreignObject'] as const;

/**
 * The only `href` this keeps: a reference into the same document, which is how
 * `<use>` and gradient fills point at their own `<defs>`. Anything else — a
 * protocol, a protocol-relative `//host`, a bare path, a `data:` payload — is
 * external by the definition that matters here, which is "causes the visitor's
 * browser to fetch or run something we did not sanitise".
 */
const SAME_DOCUMENT_REF = /^#[^\s<>"']*$/;

/**
 * Finds the `>` that closes the tag opening at `start`, ignoring any `>` inside
 * a quoted attribute value. Returns the index just past it, or -1 if the tag is
 * never closed.
 */
function findTagEnd(source: string, start: number): number {
  let quote: string | null = null;

  for (let i = start + 1; i < source.length; i += 1) {
    const char = source[i] as string;

    if (quote) {
      if (char === quote) quote = null;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === '>') return i + 1;
  }

  return -1;
}

/**
 * Removes every occurrence of one element, contents and all.
 *
 * An element that is never closed takes the rest of the string with it. That is
 * the safe reading of `<script>` with no `</script>`: a browser would treat
 * everything after it as script, so treating it as removed keeps the two in
 * agreement.
 */
function removeElement(source: string, name: string): string {
  const opening = new RegExp(`<\\s*${name}(?=[\\s/>])`, 'i');
  const closing = new RegExp(`<\\s*/\\s*${name}\\s*>`, 'i');

  let out = source;

  for (;;) {
    const start = out.search(opening);
    if (start === -1) return out;

    const tagEnd = findTagEnd(out, start);
    if (tagEnd === -1) return out.slice(0, start);

    // `<style/>` carries nothing, so there is no content to skip past.
    if (out.slice(start, tagEnd).trimEnd().endsWith('/>')) {
      out = out.slice(0, start) + out.slice(tagEnd);
      continue;
    }

    const rest = out.slice(tagEnd);
    const close = closing.exec(rest);

    out = close
      ? out.slice(0, start) + rest.slice(close.index + close[0].length)
      : out.slice(0, start);
  }
}

/** Attribute values are re-quoted, so a `"` inside one must not end it early. */
function escapeAttributeValue(value: string): string {
  return value.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function isEventHandler(name: string): boolean {
  return /^on/i.test(name);
}

/** `href`, `xlink:href`, or the same attribute under any other prefix. */
function isHrefAttribute(name: string): boolean {
  const local = name.includes(':') ? (name.split(':').pop() as string) : name;
  return local.toLowerCase() === 'href';
}

const ATTRIBUTE = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

/**
 * Rewrites one tag, keeping only attributes that survive the strip list.
 *
 * Closing tags pass through. Doctypes, comments and processing instructions are
 * dropped whole — see the note at the top of the file.
 */
function cleanTag(tag: string): string {
  if (/^<\s*\//.test(tag)) return tag;
  if (/^<[!?]/.test(tag)) return '';

  const parsed = /^<\s*([A-Za-z][A-Za-z0-9:._-]*)([\s\S]*?)(\/?)\s*>$/.exec(tag);
  // Not a tag this understands — a `<` that was never markup, most likely.
  if (!parsed) return '';

  const [, name, rawAttributes = '', selfClosing = ''] = parsed;
  const kept: string[] = [];

  ATTRIBUTE.lastIndex = 0;
  let match = ATTRIBUTE.exec(rawAttributes);

  while (match !== null) {
    const attribute = match[1] as string;
    const value = match[2] ?? match[3] ?? match[4];

    if (isEventHandler(attribute)) {
      // dropped
    } else if (isHrefAttribute(attribute)) {
      if (value !== undefined && SAME_DOCUMENT_REF.test(value.trim())) {
        kept.push(`${attribute}="${escapeAttributeValue(value.trim())}"`);
      }
    } else if (value === undefined) {
      kept.push(attribute);
    } else {
      kept.push(`${attribute}="${escapeAttributeValue(value)}"`);
    }

    match = ATTRIBUTE.exec(rawAttributes);
  }

  const body = kept.length > 0 ? ` ${kept.join(' ')}` : '';
  return `<${name}${body}${selfClosing ? ' /' : ''}>`;
}

/** Walks the markup tag by tag so text between tags is left alone. */
function filterAttributes(source: string): string {
  let out = '';
  let index = 0;

  for (;;) {
    const lt = source.indexOf('<', index);

    if (lt === -1) {
      out += source.slice(index);
      return out;
    }

    out += source.slice(index, lt);

    const tagEnd = findTagEnd(source, lt);
    // An unterminated tag, and everything after it, is not markup we can vouch for.
    if (tagEnd === -1) return out;

    out += cleanTag(source.slice(lt, tagEnd));
    index = tagEnd;
  }
}

/**
 * Returns the markup with everything on the strip list removed.
 *
 * Safe to run on already-sanitised markup — re-saving a record must not degrade
 * the mark it holds.
 */
export function sanitiseSvg(input: string): string {
  if (typeof input !== 'string' || input.trim() === '') return '';

  // Comments first: one can hide an unbalanced tag from the element scan below.
  let out = input.replace(/<!--[\s\S]*?-->/g, '');
  const unterminatedComment = out.indexOf('<!--');
  if (unterminatedComment !== -1) out = out.slice(0, unterminatedComment);

  // A doctype is removed whole rather than tag by tag, because its internal
  // subset — `<!DOCTYPE svg [ … ]>` — contains `>` characters of its own and
  // would otherwise leave the `]>` tail behind as text.
  out = out.replace(/<!DOCTYPE[^[>]*(?:\[[\s\S]*?\])?[^>]*>/gi, '');

  for (const element of FORBIDDEN_ELEMENTS) {
    out = removeElement(out, element);
  }

  // Closing tags whose opening tag was never there are left behind by the loop.
  out = out.replace(
    new RegExp(`<\\s*/\\s*(?:${FORBIDDEN_ELEMENTS.join('|')})\\s*>`, 'gi'),
    '',
  );

  return filterAttributes(out).trim();
}
