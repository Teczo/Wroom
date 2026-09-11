import { ENQUIRY_HONEYPOT_FIELD } from '@wroom/shared';
import type { Dispatch, ReactNode, SetStateAction } from 'react';

import { ApiRequestError } from '../../lib/api';

/**
 * The pieces both contact forms need, written once.
 *
 * The honeypot and the refusal panel are load-bearing rather than cosmetic —
 * the first is half of the anti-bot check the server runs (§8) and the second
 * is the only thing standing between a rate-limited visitor and a form that
 * looks broken. A second copy of either is a second chance to get one wrong.
 */

export const inputClasses =
  'block w-full min-h-11 rounded-lg border border-border bg-surface px-3 py-2 text-base ' +
  'text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 ' +
  'focus:ring-accent';

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-fg">
        {label}
        {required ? <span className="ml-1 text-danger">*</span> : null}
      </label>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p className="mt-1 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/*
 * Hidden from sight and from a screen reader, skipped by tabbing, and never
 * autofilled — so a person cannot fill it by accident, and a script that fills
 * every input will.
 */
export function Honeypot({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: Dispatch<SetStateAction<string>>;
}) {
  return (
    <div aria-hidden className="hidden">
      <label htmlFor={id}>Website</label>
      <input
        id={id}
        name={ENQUIRY_HONEYPOT_FIELD}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

/**
 * Every refusal says something. The rate limit in particular gets its own
 * colour and its own words: being told "that did not send" for what is actually
 * "you have sent five already" reads as a broken form, and the one thing a
 * visitor must know is that nothing they typed was lost.
 */
export function SubmitError({
  error,
  isRateLimited,
}: {
  error: unknown;
  isRateLimited: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        isRateLimited ? 'border-notice bg-notice-soft' : 'border-danger bg-danger-soft'
      }`}
      role="alert"
    >
      <p className={`text-sm font-medium ${isRateLimited ? 'text-notice' : 'text-danger'}`}>
        {isRateLimited ? 'Not you — the form is taking a breather' : 'That did not send'}
      </p>
      <p className={`mt-1 text-sm ${isRateLimited ? 'text-notice' : 'text-danger'}`}>
        {error instanceof ApiRequestError
          ? error.message
          : 'The message could not be sent. Check your connection and try again.'}
      </p>
      {isRateLimited ? (
        <p className="mt-2 text-sm text-notice">
          Nothing you did is wrong and nothing was lost — your answers are still here.
        </p>
      ) : null}
    </div>
  );
}

/** The link between the two ways of filling in the same enquiry. */
export function FormSwitch({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="mt-10 border-t border-border pt-5 text-center">
      <button
        type="button"
        onClick={onClick}
        className="min-h-11 px-2 text-sm text-muted underline underline-offset-4 transition-colors hover:text-accent"
      >
        {label}
      </button>
    </div>
  );
}
