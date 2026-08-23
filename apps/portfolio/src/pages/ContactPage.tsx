import { ENQUIRY_HONEYPOT_FIELD, ENQUIRY_LIMITS, type SiteContentBody } from '@wroom/shared';
import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Markdown } from '../components/Markdown';
import { useSubmitEnquiry } from '../features/content/enquiryApi';
import { usePublishedContent } from '../features/content/api';
import { ApiRequestError } from '../lib/api';
import { useDocumentMeta } from '../lib/useDocumentMeta';

/**
 * The contact form, and the only place the portfolio writes anything.
 *
 * The page copy is a published content record when there is one, and the form
 * stands on its own when there is not — an unpublished about-style record must
 * not be able to take the form away, because the form is the point of the page.
 */

const inputClasses =
  'block w-full min-h-11 rounded-lg border border-border bg-surface px-3 py-2 text-base text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent';

type Errors = Partial<Record<string, string>>;

/** Mirrors the shared schema, so the server rarely has to be the one to say no. */
function validate(values: {
  name: string;
  email: string;
  message: string;
}): Errors {
  const errors: Errors = {};

  if (values.name.trim() === '') errors.name = 'Please tell me your name.';
  else if (values.name.length > ENQUIRY_LIMITS.name) errors.name = 'That is too long.';

  if (values.email.trim() === '') errors.email = 'I need an address to reply to.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'That does not look like an email address.';
  }

  if (values.message.trim() === '') errors.message = 'Say a little about what you need.';
  else if (values.message.length > ENQUIRY_LIMITS.message) errors.message = 'That is too long.';

  return errors;
}

function Field({
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
  children: React.ReactNode;
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

function ContactForm({ relatedProjectId }: { relatedProjectId: string }) {
  const submit = useSubmitEnquiry();

  // When the form was first shown. A submission far too soon after this was
  // not typed by a person, and the server refuses it.
  const openedAt = useRef(Date.now());

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [budgetRange, setBudgetRange] = useState('');
  const [timeline, setTimeline] = useState('');
  const [interest, setInterest] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  const isRateLimited = submit.error instanceof ApiRequestError && submit.error.status === 429;

  if (submit.isSuccess) {
    return (
      <div className="mt-10 rounded-2xl border border-border bg-surface p-6" role="status">
        <p className="text-base font-medium text-fg">Thank you — that has reached me.</p>
        <p className="mt-2 text-sm text-muted">
          I read everything that comes through here and will reply to {email || 'your address'} as
          soon as I can. There is nothing else you need to do.
        </p>
      </div>
    );
  }

  return (
    <form
      className="mt-10 space-y-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();

        const found = validate({ name, email, message });
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        submit.mutate({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          company: company.trim(),
          message: message.trim(),
          requirement: {
            budgetRange: budgetRange.trim(),
            timeline: timeline.trim(),
            interest: interest.trim(),
          },
          ...(relatedProjectId ? { relatedProjectId } : {}),
          website: honeypot,
          submittedInMs: Date.now() - openedAt.current,
        });
      }}
    >
      <Field label="Your name" htmlFor="contact-name" required error={errors.name}>
        <input
          id="contact-name"
          className={inputClasses}
          value={name}
          maxLength={ENQUIRY_LIMITS.name}
          autoComplete="name"
          onChange={(event) => setName(event.target.value)}
        />
      </Field>

      <Field label="Email" htmlFor="contact-email" required error={errors.email}>
        <input
          id="contact-email"
          type="email"
          className={inputClasses}
          value={email}
          maxLength={ENQUIRY_LIMITS.email}
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Phone" htmlFor="contact-phone" hint="Optional.">
          <input
            id="contact-phone"
            type="tel"
            className={inputClasses}
            value={phone}
            maxLength={ENQUIRY_LIMITS.phone}
            autoComplete="tel"
            onChange={(event) => setPhone(event.target.value)}
          />
        </Field>

        <Field label="Company" htmlFor="contact-company" hint="Optional.">
          <input
            id="contact-company"
            className={inputClasses}
            value={company}
            maxLength={ENQUIRY_LIMITS.company}
            autoComplete="organization"
            onChange={(event) => setCompany(event.target.value)}
          />
        </Field>
      </div>

      <Field label="What do you need?" htmlFor="contact-message" required error={errors.message}>
        <textarea
          id="contact-message"
          rows={6}
          className={inputClasses}
          value={message}
          maxLength={ENQUIRY_LIMITS.message}
          onChange={(event) => setMessage(event.target.value)}
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
              value={budgetRange}
              maxLength={ENQUIRY_LIMITS.requirement}
              onChange={(event) => setBudgetRange(event.target.value)}
            />
          </Field>

          <Field label="Timeline" htmlFor="contact-timeline" hint="When you would want it done.">
            <input
              id="contact-timeline"
              className={inputClasses}
              value={timeline}
              maxLength={ENQUIRY_LIMITS.requirement}
              onChange={(event) => setTimeline(event.target.value)}
            />
          </Field>

          <Field label="What kind of work" htmlFor="contact-interest" hint="Web, mobile, XR…">
            <input
              id="contact-interest"
              className={inputClasses}
              value={interest}
              maxLength={ENQUIRY_LIMITS.requirement}
              onChange={(event) => setInterest(event.target.value)}
            />
          </Field>
        </div>
      </fieldset>

      {/*
       * The honeypot. Hidden from sight and from a screen reader, skipped by
       * tabbing, and never autofilled — so a person cannot fill it by accident,
       * and a script that fills every input will.
       */}
      <div aria-hidden className="hidden">
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          name={ENQUIRY_HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>

      {submit.isError ? (
        <div
          className={`rounded-lg border p-4 ${
            isRateLimited ? 'border-notice bg-notice-soft' : 'border-danger bg-danger-soft'
          }`}
          role="alert"
        >
          <p
            className={`text-sm font-medium ${
              isRateLimited ? 'text-notice' : 'text-danger'
            }`}
          >
            {isRateLimited ? 'Not you — the form is taking a breather' : 'That did not send'}
          </p>
          <p className={`mt-1 text-sm ${isRateLimited ? 'text-notice' : 'text-danger'}`}>
            {submit.error instanceof ApiRequestError
              ? submit.error.message
              : 'The message could not be sent. Check your connection and try again.'}
          </p>
          {isRateLimited ? (
            <p className="mt-2 text-sm text-notice">
              Nothing you did is wrong and nothing was lost — your message is still in the boxes
              above.
            </p>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submit.isPending}
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-6 font-heading text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-hover disabled:text-muted"
      >
        {submit.isPending ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}

function ContactCopy({ content }: { content: SiteContentBody }) {
  useDocumentMeta(content.meta.title || content.title, content.meta.description);

  return (
    <header>
      {content.title ? (
        <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          {content.title}
        </h1>
      ) : null}
      {content.body ? (
        <div className="mt-4">
          <Markdown>{content.body}</Markdown>
        </div>
      ) : null}
    </header>
  );
}

/** What the page says when no contact record has been published. */
function DefaultCopy() {
  useDocumentMeta('Contact — Teczo', 'Start a conversation about a project with Teczo.');

  return (
    <header>
      <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
        Get in touch
      </h1>
      <p className="mt-3 text-base text-muted">
        Tell me what you are building and I will get back to you.
      </p>
    </header>
  );
}

export function ContactPage() {
  const [params] = useSearchParams();
  const content = usePublishedContent('contact');

  // A project id only ever arrives from a case study link. It is a hint about
  // where the enquiry came from — the server stores it only if it names a
  // project that is currently published, and null otherwise.
  const relatedProjectId = params.get('project') ?? '';

  return (
    <div className="mx-auto max-w-2xl px-5 py-14 sm:py-20">
      {/*
       * The copy is optional and the form is not, so a record that is missing,
       * unpublished or slow never blocks the form from rendering.
       */}
      {content.isSuccess ? <ContactCopy content={content.data} /> : null}
      {content.isPending || content.isError ? <DefaultCopy /> : null}

      <ContactForm relatedProjectId={relatedProjectId} />
    </div>
  );
}
