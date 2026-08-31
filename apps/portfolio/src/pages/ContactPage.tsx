import { ENQUIRY_HONEYPOT_FIELD, ENQUIRY_LIMITS, type SiteContentBody } from '@wroom/shared';
import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Mark, findMark } from '../components/Mark';
import { ContentPage } from '../features/content/ContentPage';
import { readContactData, type ContactData } from '../features/content/pageData';
import { useSubmitEnquiry } from '../features/content/enquiryApi';
import { ApiRequestError } from '../lib/api';
import { useDocumentMeta } from '../lib/useDocumentMeta';

/**
 * The contact page, and the only place the portfolio writes anything.
 *
 * The copy — headline, intro, address and the social row — is the published
 * `contact` record. The form below it is not content: it posts to
 * `/public/enquiries`, which is a different path with its own middleware chain
 * (§8), and it does not read `data.email` to do it.
 */

const inputClasses =
  'block w-full min-h-11 rounded-lg border border-border bg-surface px-3 py-2 text-base text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent';

type Errors = Partial<Record<string, string>>;

/** Mirrors the shared schema, so the server rarely has to be the one to say no. */
function validate(values: { name: string; email: string; message: string }): Errors {
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

  /*
   * Field messages the server sent back, shown against the fields they name.
   * The client check above catches almost everything, so this is for the cases
   * where the two disagree — without it a 422 naming a field would surface only
   * as a general "that did not send" and the visitor would have no idea which
   * box to fix. The bot refusals carry no details and fall through to the
   * panel, which is the point of them saying nothing specific.
   */
  const serverErrors =
    submit.error instanceof ApiRequestError ? submit.error.fieldErrors : ({} as Errors);

  const errorFor = (field: string): string | undefined => errors[field] ?? serverErrors[field];

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
      <Field label="Your name" htmlFor="contact-name" required error={errorFor('name')}>
        <input
          id="contact-name"
          className={inputClasses}
          value={name}
          maxLength={ENQUIRY_LIMITS.name}
          autoComplete="name"
          onChange={(event) => setName(event.target.value)}
        />
      </Field>

      <Field label="Email" htmlFor="contact-email" required error={errorFor('email')}>
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
        <Field label="Phone" htmlFor="contact-phone" hint="Optional." error={errorFor('phone')}>
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

        <Field
          label="Company"
          htmlFor="contact-company"
          hint="Optional."
          error={errorFor('company')}
        >
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

      {/*
       * Every refusal says something. The rate limit in particular gets its own
       * colour and its own words: being told "that did not send" for what is
       * actually "you have sent five already" reads as a broken form, and the
       * one thing a visitor must know is that nothing they typed was lost.
       */}
      {submit.isError ? (
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
        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-accent px-6 font-heading text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-hover disabled:text-muted sm:w-auto"
      >
        {submit.isPending ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}

/**
 * The address and the social row.
 *
 * Each link draws its mark from `data.marks`, resolved from the library by the
 * publish action. The label stays beside it rather than being replaced by it:
 * this is a list of ways to reach somebody, and a row of bare glyphs makes the
 * reader work out which is which. A key that resolved to nothing simply has no
 * glyph in front of its name.
 */
function ContactChannels({ data }: { data: ContactData }) {
  const socials = data.socials.filter((social) => social.mediaKey !== '' && social.url !== '');

  if (data.email === '' && socials.length === 0) return null;

  return (
    <div className="mt-6 flex flex-col gap-4">
      {data.email ? (
        <a
          href={`mailto:${data.email}`}
          className="font-heading text-base font-medium text-accent underline underline-offset-4 transition-colors hover:text-accent-hover"
        >
          {data.email}
        </a>
      ) : null}

      {socials.length > 0 ? (
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {socials.map((social) => {
            const mark = findMark(data.marks, social.mediaKey);

            return (
              <li key={social.mediaKey}>
                <a
                  href={social.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 font-heading text-sm font-medium capitalize text-muted transition-colors hover:text-accent"
                >
                  {mark ? <Mark mark={mark} className="size-4" /> : null}
                  {mark?.label || social.mediaKey}
                </a>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function Contact({ content }: { content: SiteContentBody }) {
  const [params] = useSearchParams();
  const data = readContactData(content.data);

  // `title` is the record's own name and stands in when the page has no
  // headline yet, so the page is never without an `h1`.
  const headline = data?.headline || content.title;

  useDocumentMeta(content.meta.title || headline, content.meta.description);

  // A project id only ever arrives from a case study link. It is a hint about
  // where the enquiry came from — the server stores it only if it names a
  // project that is currently published, and null otherwise.
  const relatedProjectId = params.get('project') ?? '';

  return (
    <div className="mx-auto max-w-2xl px-5 py-14 sm:py-20">
      <header>
        {headline ? (
          <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{headline}</h1>
        ) : null}

        {/*
          * Plain text, not markdown. `intro` is a single authored line in the
          * record's `data`, and the field the schema gives it is a string.
          */}
        {data?.intro ? <p className="mt-3 text-base text-muted">{data.intro}</p> : null}

        {data ? <ContactChannels data={data} /> : null}
      </header>

      <ContactForm relatedProjectId={relatedProjectId} />
    </div>
  );
}

export function ContactPage() {
  return (
    <ContentPage contentKey="contact">{(content) => <Contact content={content} />}</ContentPage>
  );
}
