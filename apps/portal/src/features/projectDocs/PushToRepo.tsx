import { GITHUB_REPO_NAME, type Project } from '@wroom/shared';
import { useState } from 'react';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
import { ApiRequestError } from '../../lib/api';
import { usePushProjectDoc } from './api';

/**
 * "Create repo & push" — the only button in Wroom that writes to GitHub
 * (CLAUDE.md §8). It asks once, showing the name the repo will have, because
 * what it does cannot be taken back from here: a new private repo exists, and
 * from then on the repo copy of CLAUDE.md is the real one.
 */
export function PushToRepo({ project, version }: { project: Project; version: number }) {
  const push = usePushProjectDoc(project._id);
  const [confirming, setConfirming] = useState(false);
  const [name, setName] = useState(project.slug);

  const trimmed = name.trim();
  const nameError =
    trimmed === ''
      ? 'Give the repo a name.'
      : trimmed.length > 100 || !GITHUB_REPO_NAME.test(trimmed)
        ? 'Letters, numbers, dots, dashes and underscores only — up to 100.'
        : undefined;

  if (!confirming) {
    return (
      <Button className="min-h-9 text-xs" onClick={() => setConfirming(true)}>
        Create repo &amp; push
      </Button>
    );
  }

  return (
    <div
      role="dialog"
      aria-labelledby="push-title"
      className="w-full rounded-xl border border-slate-300 bg-white p-4 text-left sm:max-w-md"
    >
      <h3 id="push-title" className="text-sm font-semibold text-slate-900">
        Create repo &amp; push
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        This creates a new <strong>private</strong> repo in the GitHub account Wroom is connected
        to, and commits version {version} as <span className="font-mono">CLAUDE.md</span> on{' '}
        <span className="font-mono">main</span>. After that the repo copy is the real one — Wroom
        will not save new versions of this file.
      </p>

      <div className="mt-4">
        <Field label="Repo name" htmlFor="push-repo-name" error={nameError}>
          <input
            id="push-repo-name"
            className={`${inputClasses} font-mono`}
            value={name}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
      </div>

      {push.isError ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {push.error instanceof ApiRequestError
            ? push.error.message
            : 'The server could not be reached. Nothing was created.'}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
        <Button
          disabled={nameError !== undefined || push.isPending}
          onClick={() => push.mutate({ name: trimmed })}
        >
          {push.isPending ? 'Creating…' : `Create ${trimmed || 'repo'} and push`}
        </Button>
        <Button
          variant="ghost"
          disabled={push.isPending}
          onClick={() => {
            setConfirming(false);
            push.reset();
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
