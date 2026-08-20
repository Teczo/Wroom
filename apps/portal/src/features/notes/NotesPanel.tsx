import type { Note, NoteKind } from '@wroom/shared';
import { NOTE_KINDS } from '@wroom/shared';
import { useState } from 'react';

import { Button } from '../../components/Button';
import { Field, inputClasses } from '../../components/Field';
import { Pill } from '../../components/Pill';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { ApiRequestError } from '../../lib/api';
import { humanise, relativeDate } from '../../lib/format';
import { useCreateNote, useDeleteNote, useNotes, useUpdateNote, type NoteOwner } from './api';

/**
 * Free notes on a project or an enquiry, pinned ones first.
 *
 * The body is written as markdown but rendered as pre-wrapped plain text:
 * formatting it properly needs a markdown dependency, which CLAUDE.md §2 rule 2
 * says to ask about first. Line breaks are preserved, and nothing here tries to
 * parse markdown by hand.
 */

const KIND_TONES: Record<NoteKind, 'neutral' | 'blue' | 'violet' | 'red'> = {
  note: 'neutral',
  meeting: 'blue',
  idea: 'violet',
  issue: 'red',
};

function NoteBody({ body }: { body: string }) {
  return (
    <p className="whitespace-pre-wrap break-words text-sm text-slate-800">{body}</p>
  );
}

function NoteForm({
  owner,
  note,
  onDone,
}: {
  owner: NoteOwner;
  note?: Note;
  onDone: () => void;
}) {
  const create = useCreateNote(owner);
  const update = useUpdateNote();
  const save = note ? update : create;

  const [body, setBody] = useState(note?.body ?? '');
  const [kind, setKind] = useState<string>(note?.kind ?? 'note');

  const fieldErrors = save.error instanceof ApiRequestError ? save.error.fieldErrors : {};

  return (
    <form
      className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
      onSubmit={(event) => {
        event.preventDefault();

        if (note) update.mutate({ id: note._id, body, kind }, { onSuccess: onDone });
        else create.mutate({ body, kind }, { onSuccess: onDone });
      }}
    >
      <Field
        label="Note"
        htmlFor="note-body"
        hint="Markdown is kept as you type it. Line breaks are preserved."
        required
        error={fieldErrors.body}
      >
        <textarea
          id="note-body"
          rows={6}
          className={inputClasses}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          required
        />
      </Field>

      <Field label="What kind of note" htmlFor="note-kind" error={fieldErrors.kind}>
        <select
          id="note-kind"
          className={inputClasses}
          value={kind}
          onChange={(event) => setKind(event.target.value)}
        >
          {NOTE_KINDS.map((value) => (
            <option key={value} value={value}>
              {humanise(value)}
            </option>
          ))}
        </select>
      </Field>

      {save.isError ? (
        <p className="text-sm text-red-600">
          {save.error instanceof ApiRequestError ? save.error.message : 'That could not be saved.'}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending || body.trim() === ''}>
          {save.isPending ? 'Saving…' : note ? 'Save note' : 'Add note'}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function NoteRow({ owner, note }: { owner: NoteOwner; note: Note }) {
  const update = useUpdateNote();
  const remove = useDeleteNote();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (editing) {
    return (
      <div className="border-b border-slate-100 p-4 last:border-0">
        <NoteForm owner={owner} note={note} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <article className="border-b border-slate-100 p-4 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill label={humanise(note.kind)} tone={KIND_TONES[note.kind]} />
          {note.pinned ? <Pill label="Pinned" tone="amber" /> : null}
          <span className="text-xs text-slate-500">{relativeDate(note.updatedAt)}</span>
        </div>

        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            className="min-h-9 px-2 text-xs"
            disabled={update.isPending}
            onClick={() => update.mutate({ id: note._id, pinned: !note.pinned })}
          >
            {note.pinned ? 'Unpin' : 'Pin'}
          </Button>
          <Button
            variant="ghost"
            className="min-h-9 px-2 text-xs"
            onClick={() => setEditing(true)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            className="min-h-9 px-2 text-xs text-red-600 hover:bg-red-50"
            onClick={() => setConfirming((current) => !current)}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="mt-2">
        <NoteBody body={note.body} />
      </div>

      {confirming ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-900">Delete this note?</p>
          <Button
            variant="danger"
            className="min-h-9 text-xs"
            disabled={remove.isPending}
            onClick={() => remove.mutate(note._id, { onSuccess: () => setConfirming(false) })}
          >
            {remove.isPending ? 'Deleting…' : 'Yes, delete it'}
          </Button>
          <Button
            variant="ghost"
            className="min-h-9 text-xs"
            onClick={() => setConfirming(false)}
          >
            Keep it
          </Button>
        </div>
      ) : null}
    </article>
  );
}

export function NotesPanel({ owner }: { owner: NoteOwner }) {
  const [kind, setKind] = useState('');
  const [adding, setAdding] = useState(false);
  const notes = useNotes(owner, kind ? { kind } : {});

  const items = notes.data?.items ?? [];
  const pinned = items.filter((note) => note.pinned);
  const rest = items.filter((note) => !note.pinned);

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Notes</h3>

        <div className="flex items-center gap-2">
          <select
            className={`${inputClasses} h-9 min-h-9 w-36 py-0 text-xs`}
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            aria-label="Filter notes by kind"
          >
            <option value="">All kinds</option>
            {NOTE_KINDS.map((value) => (
              <option key={value} value={value}>
                {humanise(value)}
              </option>
            ))}
          </select>

          {adding ? null : (
            <Button
              variant="secondary"
              className="min-h-9 text-xs"
              onClick={() => setAdding(true)}
            >
              Add note
            </Button>
          )}
        </div>
      </div>

      {notes.isPending ? (
        <div className="p-4">
          <LoadingState label="Loading notes…" />
        </div>
      ) : null}

      {notes.isError ? (
        <div className="p-4">
          <ErrorState error={notes.error} onRetry={() => void notes.refetch()} />
        </div>
      ) : null}

      {adding ? (
        <div className="border-b border-slate-100 p-4">
          <NoteForm owner={owner} onDone={() => setAdding(false)} />
        </div>
      ) : null}

      {notes.isSuccess && items.length === 0 && !adding ? (
        <div className="p-4">
          <EmptyState
            title={kind ? `No ${kind} notes on this project` : 'Nothing written down yet'}
            whatToDoNext={
              kind
                ? 'Nothing of this kind here. Show all kinds to see the rest.'
                : 'Write down what you last thought about this project — what a client asked for, a decision half-made, a bug you saw once and could not reproduce.'
            }
            action={
              kind ? (
                <Button variant="secondary" onClick={() => setKind('')}>
                  Show all kinds
                </Button>
              ) : (
                <Button onClick={() => setAdding(true)}>Write the first note</Button>
              )
            }
          />
        </div>
      ) : null}

      {pinned.length > 0 ? (
        <div className="border-b-4 border-slate-100">
          <p className="bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
            Pinned
          </p>
          {pinned.map((note) => (
            <NoteRow key={note._id} owner={owner} note={note} />
          ))}
        </div>
      ) : null}

      {rest.map((note) => (
        <NoteRow key={note._id} owner={owner} note={note} />
      ))}
    </section>
  );
}
