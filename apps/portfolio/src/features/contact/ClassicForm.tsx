import { ENQUIRY_LIMITS } from '@wroom/shared';
import { useState } from 'react';

import { Field, Honeypot, SubmitError, inputClasses } from './formParts';
import { validateAnswers, type EnquiryDraft, type FieldErrors } from './enquiryDraft';

/**
 * The plain contact form — every question on one page, in one column.
 *
 * It is kept because the guided form is a longer road for somebody who already
 * knows what they want to say, and because a multi-step flow is the wrong shape
 * for a screen reader or a keyboard user in a hurry. Both write the same
 * enquiry through the same draft, so neither is the "real" one.
 */
export function ClassicForm({ draft }: { draft: EnquiryDraft }) {
  const { answers, setAnswer, submit, send, serverErrors, isRateLimited } = draft;
  const [errors, setErrors] = useState<FieldErrors>({});

  const errorFor = (field: keyof FieldErrors): string | undefined =>
    errors[field] ?? serverErrors[field];

  return (
    <form
      className="mt-10 space-y-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();

        const found = validateAnswers(answers);
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        send();
      }}
    >
      <Field label="Your name" htmlFor="contact-name" required error={errorFor('name')}>
        <input
          id="contact-name"
          className={inputClasses}
          value={answers.name}
          maxLength={ENQUIRY_LIMITS.name}
          autoComplete="name"
          onChange={(event) => setAnswer('name', event.target.value)}
        />
      </Field>

      <Field label="Email" htmlFor="contact-email" required error={errorFor('email')}>
        <input
          id="contact-email"
          type="email"
          className={inputClasses}
          value={answers.email}
          maxLength={ENQUIRY_LIMITS.email}
          autoComplete="email"
          onChange={(event) => setAnswer('email', event.target.value)}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Phone" htmlFor="contact-phone" hint="Optional." error={errorFor('phone')}>
          <input
            id="contact-phone"
            type="tel"
            className={inputClasses}
            value={answers.phone}
            maxLength={ENQUIRY_LIMITS.phone}
            autoComplete="tel"
            onChange={(event) => setAnswer('phone', event.target.value)}
          />
        </Field>

        <Field
          label="Company"
          htmlFor="contact-company"
          hint="Optional."
          error={errorFor('company')}
        >
          <input
            id="contact-company"
            className={inputClasses}
            value={answers.company}
            maxLength={ENQUIRY_LIMITS.company}
            autoComplete="organization"
            onChange={(event) => setAnswer('company', event.target.value)}
          />
        </Field>
      </div>

      <Field
        label="What do you need?"
        htmlFor="contact-message"
        required
        error={errorFor('message')}
      >
        <textarea
          id="contact-message"
          rows={6}
          className={inputClasses}
          value={answers.message}
          maxLength={ENQUIRY_LIMITS.message}
          onChange={(event) => setAnswer('message', event.target.value)}
        />
      </Field>

      <fieldset className="border-t border-border pt-5">
        <legend className="text-xs font-medium uppercase tracking-wide text-muted">
          Helpful, not required
        </legend>

        <div className="mt-4 space-y-5">
          <Field label="Budget" htmlFor="contact-budget" hint="A range is fine.">
            <input
              id="contact-budget"
              className={inputClasses}
              value={answers.budgetRange}
              maxLength={ENQUIRY_LIMITS.requirement}
              onChange={(event) => setAnswer('budgetRange', event.target.value)}
            />
          </Field>

          <Field label="Timeline" htmlFor="contact-timeline" hint="When you would want it done.">
            <input
              id="contact-timeline"
              className={inputClasses}
              value={answers.timeline}
              maxLength={ENQUIRY_LIMITS.requirement}
              onChange={(event) => setAnswer('timeline', event.target.value)}
            />
          </Field>

          <Field label="What kind of work" htmlFor="contact-interest" hint="Web, mobile, XR…">
            <input
              id="contact-interest"
              className={inputClasses}
              value={answers.interest}
              maxLength={ENQUIRY_LIMITS.requirement}
              onChange={(event) => setAnswer('interest', event.target.value)}
            />
          </Field>
        </div>
      </fieldset>

      <Honeypot id="contact-website" value={draft.honeypot} onChange={draft.setHoneypot} />

      {submit.isError ? (
        <SubmitError error={submit.error} isRateLimited={isRateLimited} />
      ) : null}

      <button
        type="submit"
        disabled={submit.isPending}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-accent px-6 font-heading text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-hover disabled:text-muted sm:w-auto"
      >
        {submit.isPending ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
