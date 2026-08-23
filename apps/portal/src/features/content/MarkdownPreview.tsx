import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';

/**
 * The body as the public site will render it.
 *
 * Deliberately the same pipeline the portfolio uses — `react-markdown` with
 * `rehype-sanitize` — rather than a lighter approximation. A preview that
 * disagrees with the real renderer is worse than no preview: it is a preview
 * that lies about the one thing it exists to show.
 *
 * The sanitiser stays even though the only author is signed in. The copy makes
 * a round trip through the database either way, and this is the point at which
 * it is rendered.
 */
const components: Components = {
  h1: ({ children }) => <h2 className="mt-5 text-lg font-semibold text-slate-900">{children}</h2>,
  h2: ({ children }) => <h3 className="mt-4 text-base font-semibold text-slate-900">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-3 text-sm font-semibold text-slate-900">{children}</h4>,
  p: ({ children }) => <p className="mt-2 text-sm leading-relaxed text-slate-700">{children}</p>,
  ul: ({ children }) => (
    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">{children}</ol>
  ),
  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a href={href} className="font-medium text-slate-900 underline underline-offset-2">
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mt-3 border-l-2 border-slate-900 pl-4 text-slate-700">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs text-slate-800">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
      {children}
    </pre>
  ),
  hr: () => <hr className="mt-4 border-slate-200" />,
  img: ({ src, alt }) => (
    <img
      src={typeof src === 'string' ? src : undefined}
      alt={alt ?? ''}
      className="mt-3 w-full max-w-full rounded-lg border border-slate-200"
    />
  ),
};

export function MarkdownPreview({ body }: { body: string }) {
  if (body.trim() === '') {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
        Nothing written yet. What you type above appears here as the page will show it.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <ReactMarkdown rehypePlugins={[rehypeSanitize]} components={components}>
        {body}
      </ReactMarkdown>
    </div>
  );
}
