import { renderKickoffPrompt, type Project, type ProjectDocSummary } from '@wroom/shared';
import { useState } from 'react';

import { Button } from '../../components/Button';
import { Pill } from '../../components/Pill';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { relativeDate, shortDate } from '../../lib/format';
import { useProjectDoc, useProjectDocs } from './api';
import { PushToRepo } from './PushToRepo';

/**
 * A hands-off project's CLAUDE.md: the newest version as plain text, the older
 * ones a tap away, a download, and the prompt that starts a session on it.
 *
 * Versions are saved from a chat with `wroom_doc_commit`. The one write here is
 * "Create repo & push"; once a version is pushed the repo copy is the real one.
 */

type CopyState = 'idle' | 'copied' | 'failed';

function KickoffButton({ project }: { project: Project }) {
  const [state, setState] = useState<CopyState>('idle');

  async function copy(): Promise<void> {
    try {
      // Throws rather than resolving off a secure origin, so it sits in the try.
      await navigator.clipboard.writeText(renderKickoffPrompt(project));
      setState('copied');
    } catch {
      setState('failed');
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-1 sm:items-end">
      <Button variant="secondary" className="min-h-9 text-xs" onClick={() => void copy()}>
        {state === 'copied' ? 'Kickoff prompt copied' : 'Copy kickoff prompt'}
      </Button>
      {state === 'failed' ? (
        <p role="alert" className="text-xs text-red-700">
          The browser would not allow copying here. Try again from the deployed portal.
        </p>
      ) : null}
    </div>
  );
}

/** Saves the text as a file called CLAUDE.md, ready to drop into a repo. */
function download(body: string): void {
  const url = URL.createObjectURL(new Blob([body], { type: 'text/markdown;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'CLAUDE.md';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function VersionList({
  versions,
  selected,
  onSelect,
}: {
  versions: ProjectDocSummary[];
  selected: number;
  onSelect: (version: number) => void;
}) {
  return (
    <nav aria-label="Versions" className="rounded-xl border border-slate-200 bg-white">
      <p className="border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Versions
      </p>
      <ul className="max-h-48 overflow-y-auto lg:max-h-[32rem]">
        {versions.map((entry) => (
          <li key={entry._id} className="border-b border-slate-100 last:border-0">
            <button
              type="button"
              aria-current={entry.version === selected ? 'true' : undefined}
              onClick={() => onSelect(entry.version)}
              className={`flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ${
                entry.version === selected
                  ? 'bg-slate-100 font-medium text-slate-900'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="min-w-0">
                <span className="block">Version {entry.version}</span>
                <span className="block text-xs font-normal text-slate-500">
                  {relativeDate(entry.createdAt)} · from {entry.source === 'mcp' ? 'a chat' : 'the portal'}
                </span>
              </span>
              {entry.pushedAt ? <Pill label="Pushed" tone="green" /> : null}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function ClaudeMdPanel({ project }: { project: Project }) {
  const versions = useProjectDocs(project._id);
  const [chosen, setChosen] = useState<number | null>(null);

  const items = versions.data?.items ?? [];
  // Newest first from the API, so the first entry is the latest.
  const selected = chosen ?? items[0]?.version ?? null;
  const doc = useProjectDoc(project._id, selected);
  const summary = items.find((entry) => entry.version === selected) ?? null;
  const pushed = items.find((entry) => entry.pushedAt !== null) ?? null;
  const latest = items[0] ?? null;

  const toolbar = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-end">
      {doc.data ? (
        <Button variant="secondary" className="min-h-9 text-xs" onClick={() => download(doc.data.body)}>
          Download CLAUDE.md
        </Button>
      ) : null}
      <KickoffButton project={project} />
      {/* Hands-off only, and only until one version has gone to a repo. */}
      {latest && !pushed && project.workMode === 'hands-off' ? (
        <PushToRepo project={project} version={latest.version} />
      ) : null}
    </div>
  );

  if (versions.isPending) return <LoadingState label="Loading CLAUDE.md…" />;

  if (versions.isError) {
    return <ErrorState error={versions.error} onRetry={() => void versions.refetch()} />;
  }

  if (items.length === 0 || selected === null) {
    return (
      <div className="space-y-4">
        {toolbar}
        <EmptyState
          title="No CLAUDE.md yet"
          whatToDoNext="Plan the project in a Claude chat, then save it with wroom_doc_preview and wroom_doc_commit. Each save shows up here as a new version."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {toolbar}

      {pushed ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Version {pushed.version} was pushed
          {project.repo.fullName ? (
            <>
              {' '}
              to <span className="font-mono">{project.repo.fullName}</span>
            </>
          ) : null}
          . That copy is now the real one — change it in the repo, not here.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <VersionList versions={items} selected={selected} onSelect={setChosen} />

        <section className="min-w-0 rounded-xl border border-slate-200 bg-white">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900">
                Version {selected}
                {selected === items[0]?.version ? ' · latest' : ''}
              </h3>
              {summary ? (
                <p className="mt-0.5 text-xs text-slate-500">Saved {shortDate(summary.createdAt)}</p>
              ) : null}
            </div>
            {summary?.pushedAt ? (
              <p className="text-xs text-slate-500">
                Pushed {shortDate(summary.pushedAt)}
                {summary.pushedCommitSha ? (
                  <span className="font-mono"> · {summary.pushedCommitSha.slice(0, 7)}</span>
                ) : null}
              </p>
            ) : null}
          </header>

          <div className="p-4">
            {doc.isPending ? <LoadingState label={`Loading version ${selected}…`} /> : null}
            {doc.isError ? (
              <ErrorState error={doc.error} onRetry={() => void doc.refetch()} />
            ) : null}
            {doc.data ? (
              // Plain text, never rendered as markup — it is a file to read and
              // copy, and it came in from a chat.
              <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-slate-800">
                {doc.data.body}
              </pre>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
