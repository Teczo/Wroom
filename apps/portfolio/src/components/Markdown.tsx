import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';

/**
 * Markdown from the database, rendered as styled elements.
 *
 * Two things keep this safe. `react-markdown` does not pass raw HTML through
 * unless asked to, and `rehype-sanitize` strips anything dangerous that
 * survives that — including a `javascript:` href. Both stay even though the
 * only author is the site owner: the copy travels through a database and a
 * public route to get here, so it is treated as untrusted at the point it is
 * rendered.
 *
 * Tailwind's reset means these elements arrive unstyled, so every one used is
 * mapped explicitly. That is the same rule as everywhere else in the app —
 * utility classes, no plugin shipping its own design system.
 */

/**
 * Headings shift down one level. The record's `title` is already the page's
 * `h1`, so a `#` in the body becomes an `h2` and the outline stays readable to
 * a screen reader instead of the page having two competing top-level headings.
 */
const components: Components = {
  h1: ({ children }) => (
    <h2 className="mt-10 text-xl font-semibold tracking-tight text-slate-900">{children}</h2>
  ),
  h2: ({ children }) => (
    <h3 className="mt-8 text-lg font-semibold tracking-tight text-slate-900">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="mt-6 text-base font-semibold text-slate-900">{children}</h4>
  ),

  p: ({ children }) => <p className="mt-4 text-base leading-relaxed text-slate-700">{children}</p>,

  ul: ({ children }) => (
    <ul className="mt-4 list-disc space-y-1 pl-5 text-base leading-relaxed text-slate-700">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-4 list-decimal space-y-1 pl-5 text-base leading-relaxed text-slate-700">
      {children}
    </ol>
  ),
  li: ({ children }) => <li>{children}</li>,

  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,

  a: ({ href, children }) => {
    const isExternal = /^https?:\/\//i.test(href ?? '');

    return (
      <a
        href={href}
        {...(isExternal ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
        className="font-medium text-slate-900 underline underline-offset-2 hover:text-slate-600"
      >
        {children}
      </a>
    );
  },

  blockquote: ({ children }) => (
    <blockquote className="mt-6 border-l-2 border-slate-900 pl-5 text-slate-700">
      {children}
    </blockquote>
  ),

  code: ({ children }) => (
    <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-sm text-slate-800">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-900 p-4 text-sm text-slate-100">
      {children}
    </pre>
  ),

  hr: () => <hr className="mt-8 border-slate-200" />,

  /** Width-capped so an image in the copy cannot push the page sideways on a phone. */
  img: ({ src, alt }) => (
    <img
      src={typeof src === 'string' ? src : undefined}
      alt={alt ?? ''}
      loading="lazy"
      className="mt-6 w-full max-w-full rounded-xl border border-slate-200"
    />
  ),
};

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown rehypePlugins={[rehypeSanitize]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
