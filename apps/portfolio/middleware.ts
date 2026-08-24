import type { ApiSuccess, PublishedProject, SiteContentBody } from '@wroom/shared';

/**
 * Vercel edge middleware — meta tags for `/` and `/work/:slug` (CLAUDE.md §7.6).
 *
 * The portfolio is a Vite SPA: one `index.html` for every route. A crawler that
 * does not run JavaScript — LinkedIn, Slack, WhatsApp, iMessage, Discord, every
 * mail client — sees that one shell and nothing the React app later writes into
 * it. This function fetches the shell, rewrites the head, and returns it. React
 * still boots from the same HTML and hydrates normally.
 *
 * What this is not, and must not become (§12):
 *
 * - It injects meta tags only. It renders no application markup. Adding a
 *   component render here turns a cached string edit into server-side
 *   rendering, which is out of scope and is a ticket, not a session decision.
 * - It reads `/public/*` and nothing else, so it holds no credential. The two
 *   routes it calls are already in the §6 allowlist; it adds none.
 * - It never errors the page. A missing env var, a slow API, a 404 slug, an
 *   unpublished landing record and a shell it cannot parse all end the same
 *   way: return nothing, the request continues to the static file, and the
 *   visitor gets the default tags from `index.html`.
 */

/**
 * The edge runtime's env, declared rather than depended on: this app's
 * typecheck carries no Node types, and `PUBLIC_API_URL` is the only value the
 * portfolio reads at runtime (§5). Nothing secret belongs here.
 */
declare const process: { env: Record<string, string | undefined> };

/** Only the two routes in §7.6. Everything else never reaches this function. */
export const config = {
  matcher: ['/', '/work/:slug'],
};

/**
 * How long the API gets before the shell goes out with its default tags.
 *
 * This sits in front of every unfurl *and* every human page load, so the budget
 * is the visitor's, not the crawler's. A cold API is a plain page, not a slow
 * one.
 */
const API_TIMEOUT_MS = 1000;

/**
 * Edge cache, in seconds: five minutes fresh, a day of stale-while-revalidate.
 *
 * Publishing changes the snapshot the tags are built from, so the window is
 * what a card can lag a publish by. Serving stale while revalidating is what
 * keeps the API off the critical path of the request after that window.
 */
const EDGE_MAX_AGE = 300;
const EDGE_STALE_WHILE_REVALIDATE = 86_400;

/** The description length the unfurlers actually show. */
const DESCRIPTION_MAX = 200;

type MetaTag = { name?: string; property?: string; content: string };

type PageMeta = {
  title: string;
  description: string;
  image: { url: string; width?: number; height?: number; alt: string } | null;
};

export default async function middleware(request: Request): Promise<Response | undefined> {
  try {
    const url = new URL(request.url);
    const meta = await readMeta(url.pathname);
    if (!meta) return undefined;

    const shell = await fetch(new URL('/index.html', url.origin), {
      headers: { accept: 'text/html' },
    });
    if (!shell.ok) return undefined;

    const html = injectMeta(await shell.text(), meta, canonicalUrl(request, url.pathname));
    if (html === null) return undefined;

    const headers = new Headers(shell.headers);
    headers.set('content-type', 'text/html; charset=utf-8');
    headers.set(
      'cache-control',
      `public, max-age=0, s-maxage=${EDGE_MAX_AGE}, stale-while-revalidate=${EDGE_STALE_WHILE_REVALIDATE}`,
    );
    // The body is no longer the bytes the origin sent, and it is no longer
    // encoded — `fetch` decoded it to read it.
    headers.delete('content-length');
    headers.delete('content-encoding');

    return new Response(html, { status: 200, headers });
  } catch {
    // Nothing this function can fail at is worth a broken page.
    return undefined;
  }
}

// --- reading the snapshot ---------------------------------------------------

/** The meta for a path, or null for "leave the shell alone". */
async function readMeta(pathname: string): Promise<PageMeta | null> {
  const apiBase = process.env.PUBLIC_API_URL?.trim().replace(/\/$/, '');
  if (!apiBase) return null;

  if (pathname === '/') return landingMeta(apiBase);

  const slug = projectSlug(pathname);
  return slug ? projectMeta(apiBase, slug) : null;
}

/**
 * The slug of a `/work/:slug` request, or null.
 *
 * The matcher has already narrowed this to one segment under `/work`; the
 * check is here so the shape of the path is decided in one place and a slug
 * with a slash in it cannot be assembled into some other API request.
 */
function projectSlug(pathname: string): string | null {
  const match = /^\/work\/([^/]+)\/?$/.exec(pathname);
  const slug = match?.[1] ? decodeURIComponent(match[1]) : '';
  return /^[a-z0-9-]{1,120}$/i.test(slug) ? slug : null;
}

async function fetchPublic<T>(url: string): Promise<T | null> {
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  }).catch(() => null);

  if (!response?.ok) return null;
  return (await response.json().catch(() => null)) as T | null;
}

/**
 * The landing page's own words, from the published `landing` record.
 *
 * There is no image field on a `siteContent` record, so `/` unfurls as a text
 * card. Giving it one would mean either inventing a field or hardcoding an
 * asset, and §2 rule 8 rules out both.
 */
async function landingMeta(apiBase: string): Promise<PageMeta | null> {
  const payload = await fetchPublic<ApiSuccess<SiteContentBody>>(`${apiBase}/public/content/landing`);
  const content = payload?.data;
  if (!content) return null;

  const title = text(content.meta?.title) || text(content.title);
  const description = text(content.meta?.description);
  if (!title && !description) return null;

  return { title, description, image: null };
}

async function projectMeta(apiBase: string, slug: string): Promise<PageMeta | null> {
  const payload = await fetchPublic<ApiSuccess<PublishedProject>>(
    `${apiBase}/public/projects/${encodeURIComponent(slug)}`,
  );
  const project = payload?.data;
  if (!project) return null;

  const title = text(project.name);
  const description = truncate(
    text(project.shortDescription) || text(project.tagline) || text(project.overview),
  );
  if (!title && !description) return null;

  return { title, description, image: projectImage(project) };
}

/**
 * The card image: the snapshot's OG crop, or the hero image (§7.6).
 *
 * `ogImage` is cropped to 1200×630 at publish and carries its own dimensions,
 * so those go out as tags. The hero fallback does not — its stored size is
 * whatever the upload was, and a width tag that disagrees with the bytes is
 * worse than no width tag. Every unfurler fetches the image regardless.
 */
function projectImage(project: PublishedProject): PageMeta['image'] {
  const alt = text(project.heroImage?.alt) || text(project.name);

  if (project.ogImage?.url) {
    return {
      url: project.ogImage.url,
      width: project.ogImage.width,
      height: project.ogImage.height,
      alt,
    };
  }

  const hero = project.heroImage;
  if (hero?.url) return { url: hero.variants?.hero || hero.url, alt };

  return null;
}

// --- writing the head -------------------------------------------------------

/**
 * The canonical address of this page, as the visitor asked for it.
 *
 * `request.url` inside a middleware invocation can carry the deployment's own
 * hostname rather than the domain the link was shared under, and `og:url` is
 * the one tag where that difference is visible in the card.
 */
function canonicalUrl(request: Request, pathname: string): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost || request.headers.get('host');
  if (!host) return new URL(pathname, request.url).toString();

  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  return `${protocol}://${host}${pathname}`;
}

/** The tags this function owns. Any of these already in the shell is replaced. */
function tagsFor(meta: PageMeta, canonical: string): MetaTag[] {
  const tags: MetaTag[] = [];

  if (meta.description) tags.push({ name: 'description', content: meta.description });

  tags.push({ property: 'og:type', content: meta.image ? 'article' : 'website' });
  tags.push({ property: 'og:url', content: canonical });
  if (meta.title) tags.push({ property: 'og:title', content: meta.title });
  if (meta.description) tags.push({ property: 'og:description', content: meta.description });

  if (meta.image) {
    tags.push({ property: 'og:image', content: meta.image.url });
    if (meta.image.width) tags.push({ property: 'og:image:width', content: String(meta.image.width) });
    if (meta.image.height) {
      tags.push({ property: 'og:image:height', content: String(meta.image.height) });
    }
    if (meta.image.alt) tags.push({ property: 'og:image:alt', content: meta.image.alt });
  }

  // A large card with no image is an empty grey box on every network that
  // honours it, so the card type follows the image rather than being fixed.
  tags.push({ name: 'twitter:card', content: meta.image ? 'summary_large_image' : 'summary' });
  if (meta.title) tags.push({ name: 'twitter:title', content: meta.title });
  if (meta.description) tags.push({ name: 'twitter:description', content: meta.description });
  if (meta.image) {
    tags.push({ name: 'twitter:image', content: meta.image.url });
    if (meta.image.alt) tags.push({ name: 'twitter:image:alt', content: meta.image.alt });
  }

  return tags;
}

/**
 * Rewrites the head of the shell. Returns null when the shell is not the shape
 * this expects, which is a pass-through rather than a guess.
 *
 * Only the head is touched, and only the tags above: everything else in the
 * document — the preload, the canvas colour, the module script React boots
 * from — is carried through byte for byte.
 */
function injectMeta(html: string, meta: PageMeta, canonical: string): string | null {
  const closing = html.search(/<\/head>/i);
  if (closing === -1) return null;

  const tags = tagsFor(meta, canonical);
  const managed = new Set(tags.map((tag) => (tag.name ?? tag.property ?? '').toLowerCase()));

  let head = html.slice(0, closing);
  const rest = html.slice(closing);

  head = removeManagedMeta(head, managed);
  head = replaceTitle(head, meta.title);

  const rendered = tags.map(renderTag).join('\n    ');
  return `${head.replace(/[^\S\n]*$/, '')}    ${rendered}\n  ${rest}`;
}

/** Drops the shell's own copies of the tags being written, so none doubles up. */
function removeManagedMeta(head: string, managed: Set<string>): string {
  return head.replace(/[^\S\n]*<meta\b[^>]*>\n?/gi, (tag) => {
    const key = /\b(?:name|property)\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];
    return key && managed.has(key.toLowerCase()) ? '' : tag;
  });
}

function replaceTitle(head: string, title: string): string {
  if (!title) return head;

  const rendered = `<title>${escapeHtml(title)}</title>`;
  return /<title[^>]*>[\s\S]*?<\/title>/i.test(head)
    ? head.replace(/<title[^>]*>[\s\S]*?<\/title>/i, rendered)
    : `${head}    ${rendered}\n`;
}

function renderTag(tag: MetaTag): string {
  const key = tag.name ? `name="${tag.name}"` : `property="${tag.property}"`;
  return `<meta ${key} content="${escapeHtml(tag.content)}" />`;
}

// --- text -------------------------------------------------------------------

/**
 * Published copy is authored, not trusted markup. Every value written into the
 * head is escaped here, so a quote in a project name closes nothing.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** One line of plain text: no newlines, no runs of whitespace, trimmed. */
function text(value: string | undefined | null): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

/** Cuts at a word boundary — a card truncates mid-word, a tag should not. */
function truncate(value: string): string {
  if (value.length <= DESCRIPTION_MAX) return value;

  const cut = value.slice(0, DESCRIPTION_MAX);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > DESCRIPTION_MAX / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
