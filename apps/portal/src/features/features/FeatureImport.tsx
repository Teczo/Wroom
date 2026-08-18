import type { FeatureImportDiff, FeatureImportResult } from '@wroom/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '../../components/Button';
import { Pill } from '../../components/Pill';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { ApiRequestError, apiPost } from '../../lib/api';
import { projectKeys } from '../projects/api';
import { featureKeys } from './api';

/**
 * CSV import: pick a file, read what would change, then apply it.
 *
 * The file is read in the browser and posted as text, so the API needs no
 * upload handling. Nothing is written until commit — the preview is a
 * calculation the server throws away.
 */

function Section({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone: 'green' | 'blue' | 'red' | 'neutral';
  children: React.ReactNode;
}) {
  if (count === 0) return null;

  return (
    <section className="rounded-lg border border-slate-200">
      <header className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</h4>
        <Pill label={String(count)} tone={tone} />
      </header>
      <div className="divide-y divide-slate-100">{children}</div>
    </section>
  );
}

export function FeatureImport({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const client = useQueryClient();
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [result, setResult] = useState<FeatureImportResult | null>(null);

  const preview = useMutation({
    mutationFn: (text: string) =>
      apiPost<FeatureImportDiff>(`/api/projects/${projectId}/features/import/preview`, {
        csv: text,
      }),
  });

  const commit = useMutation({
    mutationFn: () =>
      apiPost<FeatureImportResult>(`/api/projects/${projectId}/features/import/commit`, {
        csv,
        acknowledgeSkipped: acknowledged,
      }),
    onSuccess: async (summary) => {
      setResult(summary);
      await Promise.all([
        client.invalidateQueries({ queryKey: featureKeys.list(projectId) }),
        client.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
      ]);
    },
  });

  const diff = preview.data;
  const validCount = (diff?.inserts.length ?? 0) + (diff?.updates.length ?? 0);
  const needsAcknowledgement = (diff?.invalid.length ?? 0) > 0;

  if (result) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-medium text-emerald-900">Imported {fileName}</p>
        <p className="mt-1 text-sm text-emerald-800">
          {result.inserted} added, {result.updated} updated
          {result.skipped > 0 ? `, ${result.skipped} skipped` : ''}.
        </p>
        <Button variant="secondary" className="mt-3 min-h-9 text-xs" onClick={onDone}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Import features from CSV</h3>
        <Button variant="ghost" className="min-h-9 text-xs" onClick={onDone}>
          Cancel
        </Button>
      </div>

      <p className="text-xs text-slate-500">
        Columns: ref, title, description, acceptanceCriteria, status, priority, size, labels,
        dependsOn. Rows match on <span className="font-mono">ref</span> — a match updates, anything
        new is added, and nothing is ever deleted.
      </p>

      <input
        type="file"
        accept=".csv,text/csv"
        className="block w-full text-sm text-slate-600 file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:text-sm file:font-medium file:text-white"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;

          setResult(null);
          setAcknowledged(false);
          setFileName(file.name);
          preview.reset();

          void file.text().then((text) => {
            setCsv(text);
            preview.mutate(text);
          });
        }}
      />

      {preview.isPending ? <LoadingState label="Reading the file…" /> : null}

      {preview.isError ? (
        <ErrorState error={preview.error} onRetry={() => preview.mutate(csv)} />
      ) : null}

      {diff ? (
        <div className="space-y-3">
          {diff.unknownColumns.length > 0 ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Ignoring {diff.unknownColumns.length === 1 ? 'a column' : 'columns'} Wroom does not
              use: {diff.unknownColumns.join(', ')}.
            </p>
          ) : null}

          <Section title="Will be added" count={diff.inserts.length} tone="green">
            {diff.inserts.map((row) => (
              <div key={row.ref} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                <span className="font-mono text-xs text-slate-500">{row.ref}</span>
                <span className="min-w-0 flex-1 truncate text-slate-800">{row.title}</span>
                <Pill label={row.status} />
              </div>
            ))}
          </Section>

          <Section title="Will be updated" count={diff.updates.length} tone="blue">
            {diff.updates.map((row) => (
              <div key={row.ref} className="px-3 py-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-mono text-xs text-slate-500">{row.ref}</span>
                  <span className="min-w-0 flex-1 truncate text-slate-800">{row.title}</span>
                </div>

                {row.changes.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-400">No fields change.</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {row.changes.map((change) => (
                      <li key={change.field} className="text-xs">
                        <span className="text-slate-500">{change.field}: </span>
                        {/* Stacks rather than sits side by side, so it stays readable at 390px. */}
                        <span className="block break-words text-red-700 line-through">
                          {change.from || '(empty)'}
                        </span>
                        <span className="block break-words text-emerald-700">
                          {change.to || '(empty)'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </Section>

          <Section title="Cannot be imported" count={diff.invalid.length} tone="red">
            {diff.invalid.map((row) => (
              <div key={`${row.row}-${row.ref}`} className="px-3 py-2">
                <p className="text-xs text-slate-500">
                  Line {row.row}
                  {row.column ? ` · ${row.column}` : ''}
                  {row.ref ? ` · ${row.ref}` : ''}
                </p>
                <p className="mt-0.5 break-words text-sm text-red-800">{row.reason}</p>
              </div>
            ))}
          </Section>

          <Section title="Left alone" count={diff.unaffected.length} tone="neutral">
            {diff.unaffected.map((row) => (
              <div key={row.ref} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="font-mono text-xs text-slate-500">{row.ref}</span>
                <span className="min-w-0 flex-1 truncate text-slate-600">{row.title}</span>
              </div>
            ))}
          </Section>

          {needsAcknowledgement ? (
            <label className="flex min-h-11 items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 rounded border-amber-300"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
              />
              Import anyway and skip the {diff.invalid.length} row
              {diff.invalid.length === 1 ? '' : 's'} above.
            </label>
          ) : null}

          {commit.isError ? (
            <p className="text-sm text-red-600">
              {commit.error instanceof ApiRequestError
                ? commit.error.message
                : 'The import could not be applied.'}
            </p>
          ) : null}

          <Button
            disabled={validCount === 0 || commit.isPending || (needsAcknowledgement && !acknowledged)}
            onClick={() => commit.mutate()}
          >
            {commit.isPending
              ? 'Importing…'
              : validCount === 0
                ? 'Nothing to import'
                : `Import ${validCount} row${validCount === 1 ? '' : 's'}`}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
