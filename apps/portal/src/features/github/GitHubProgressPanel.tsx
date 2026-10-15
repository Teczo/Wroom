import type { Project } from '@wroom/shared';
import type { ReactNode } from 'react';

import { Button } from '../../components/Button';
import { LoadingState } from '../../components/StateViews';
import { ApiRequestError } from '../../lib/api';
import { relativeDate, shortDate } from '../../lib/format';
import { useGitHubStatus } from './api';

/**
 * Where a hands-off project is up to, from its repo: the newest phase marked
 * done in CHANGELOG.md, the last commit on main, and what is open.
 *
 * Read only. When GitHub cannot be reached this panel says so and nothing else
 * on the page is affected.
 */

function External({ href, children }: { href: string | null; children: string }) {
  if (!href) return <>{children}</>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-blue-700 underline underline-offset-2 hover:text-blue-900"
    >
      {children}
    </a>
  );
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="border-t border-slate-100 py-3 first:border-0 first:pt-0 last:pb-0">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{term}</dt>
      <dd className="mt-1 text-sm text-slate-900">{children}</dd>
    </div>
  );
}

/** "10:42 am" today, "yesterday" or a date after that. */
function checkedAt(value: string): string {
  return relativeDate(value) === 'today'
    ? new Date(value).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
    : relativeDate(value);
}

export function GitHubProgressPanel({ project }: { project: Project }) {
  const status = useGitHubStatus(project._id);
  const data = status.data;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-sm font-semibold text-slate-900">Progress on GitHub</h3>
        {data ? (
          <p className="text-xs text-slate-500">
            Checked {checkedAt(data.fetchedAt)} · refreshes every 5 minutes
          </p>
        ) : null}
      </div>

      <div className="mt-3">
        {status.isPending ? <LoadingState label="Asking GitHub…" /> : null}

        {status.isError ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">Could not reach GitHub</p>
            <p className="mt-1 text-sm text-amber-800">
              {status.error instanceof ApiRequestError
                ? status.error.message
                : 'The API could not be reached.'}{' '}
              The rest of this page is unaffected.
            </p>
            <Button
              variant="secondary"
              className="mt-3 min-h-9 text-xs"
              onClick={() => void status.refetch()}
            >
              Try again
            </Button>
          </div>
        ) : null}

        {data ? (
          <dl>
            <Row term="Latest phase done">
              {data.latestPhase ? (
                <>
                  Phase {data.latestPhase.phase}{' '}
                  <span className="text-slate-500">— {data.latestPhase.date}</span>
                </>
              ) : (
                <span className="text-slate-500">
                  None yet. A session adds a “Phase n — done” heading to CHANGELOG.md when it
                  finishes a phase.
                </span>
              )}
            </Row>

            <Row term={`Last commit on ${data.repo.defaultBranch}`}>
              {data.lastCommit ? (
                <>
                  <span className="block break-words">
                    <External href={data.lastCommit.url}>
                      {data.lastCommit.message.split('\n')[0] || '(no message)'}
                    </External>
                  </span>
                  <span className="text-xs text-slate-500">
                    {shortDate(data.lastCommit.date)} ·{' '}
                    <span className="font-mono">{data.lastCommit.sha.slice(0, 7)}</span>
                  </span>
                </>
              ) : (
                <span className="text-slate-500">No commits on this branch yet.</span>
              )}
            </Row>

            <Row term={`Open pull requests · ${data.pullRequests.length}`}>
              {data.pullRequests.length === 0 ? (
                <span className="text-slate-500">None open.</span>
              ) : (
                <ul className="space-y-1">
                  {data.pullRequests.map((pull) => (
                    <li key={pull.number} className="break-words">
                      <span className="font-mono text-slate-500">#{pull.number}</span>{' '}
                      <External href={pull.url}>{pull.title || '(untitled)'}</External>
                    </li>
                  ))}
                </ul>
              )}
            </Row>

            <Row term={`Other branches · ${data.branches.length}`}>
              {data.branches.length === 0 ? (
                <span className="text-slate-500">Only {data.repo.defaultBranch}.</span>
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {data.branches.map((name) => (
                    <li
                      key={name}
                      className="max-w-full truncate rounded-full bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700"
                    >
                      {name}
                    </li>
                  ))}
                </ul>
              )}
            </Row>
          </dl>
        ) : null}
      </div>
    </section>
  );
}
