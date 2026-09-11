import { ENQUIRY_LIMITS } from '@wroom/shared';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { buttonClasses } from '../../components/Button';
import { panelClass } from '../../components/Panel';
import { entering, useEntered } from '../../lib/entrance';
import {
  BUDGET_DEFAULT_INDEX,
  BUDGET_MAX_INDEX,
  BUDGET_UNSURE,
  budgetAt,
  formatBudget,
} from './budget';
import { Field, Honeypot, SubmitError, inputClasses } from './formParts';
import { validateAnswers, type EnquiryDraft, type FieldErrors } from './enquiryDraft';

/**
 * The guided contact form: one question on screen at a time.
 *
 * Why a flow rather than a column of boxes. A contact form asks a stranger to
 * do the hardest part of the job — describe what they want — in the smallest
 * box on the page, surrounded by six other boxes reminding them how much is
 * left. Asking one thing at a time inverts that: the question is the whole
 * screen, the optional ones say so and can be waved past, and the boxes that
 * only matter once somebody has decided to write (name, email) come last.
 *
 * It writes the same enquiry as the plain form through the same draft, and the
 * plain form is one button away at the foot of every step. Nothing here is a
 * new field, a new route or a new rule: the budget and the timeline are the
 * `requirement` strings the API has always taken (§8), chosen with a slider and
 * a row of chips instead of typed.
 *
 * All of its motion is the site's own — `entering()` for each step's arrival, a
 * width transition for the progress bar — so `prefers-reduced-motion` disables
 * every bit of it in `index.css` without this file knowing (§7.5). Under that
 * preference each step is simply there, immediately, which is the correct
 * behaviour for a flow whose content must never be waited for.
 */

const INTEREST_OPTIONS = [
  'Web app',
  'Mobile app',
  'Website',
  'XR or 3D',
  'AI feature',
  'Something else',
];

const TIMELINE_OPTIONS = [
  'As soon as possible',
  'Within 1–3 months',
  '3–6 months',
  '6–12 months',
  'Just exploring',
];

type StepId = 'build' | 'budget' | 'timeline' | 'you' | 'reach' | 'review';

interface Step {
  id: StepId;
  question: string;
  hint: string;
  /** Optional questions get a skip button, and skipping clears what was set. */
  skippable: boolean;
  /** The answers this step is allowed to hold the visitor on. */
  requires: (keyof FieldErrors)[];
}

const STEPS: [Step, ...Step[]] = [
  {
    id: 'build',
    question: 'What do you want to build?',
    hint: 'A sentence or two is plenty. The detail can come later.',
    skippable: false,
    requires: ['message'],
  },
  {
    id: 'budget',
    question: 'Do you have a budget in mind?',
    hint: 'A guide, never a quote. Nothing here is held against you.',
    skippable: true,
    requires: [],
  },
  {
    id: 'timeline',
    question: 'When would you like it done?',
    hint: 'Roughly is fine.',
    skippable: true,
    requires: [],
  },
  {
    id: 'you',
    question: 'Who should I reply to?',
    hint: 'These two are the only things I really need.',
    skippable: false,
    requires: ['name', 'email'],
  },
  {
    id: 'reach',
    question: 'Any other way to reach you?',
    hint: 'Only if you would rather I called, or the company matters.',
    skippable: true,
    requires: [],
  },
  {
    id: 'review',
    question: 'Ready to send?',
    hint: 'Have a last look. You can step back and change anything.',
    skippable: false,
    requires: [],
  },
];

/** A selectable pill. Clicking the selected one clears it — nothing is a trap. */
function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-11 rounded-full border px-4 text-sm transition duration-300 ease-out-expo hover:-translate-y-0.5 ${
        selected
          ? 'border-accent bg-accent-soft text-accent shadow-[0_8px_28px_var(--color-accent-glow)]'
          : 'border-border bg-surface/40 text-muted hover:border-accent-hover hover:text-fg'
      }`}
    >
      {label}
    </button>
  );
}

/**
 * One step's arrival.
 *
 * Remounted per step by its `key`, which is what replays `useEntered` — a flag
 * that only ever moves one way cannot animate a second time inside one mount.
 * The direction is the only thing the choreography borrows from the visitor:
 * going forward the step comes in from the right, going back from the left, so
 * the movement agrees with the button that caused it.
 */
function StepShell({ back, children }: { back: boolean; children: ReactNode }) {
  const entered = useEntered();
  const enter = entering(entered, back ? 'left' : 'right', 0, 500);

  return (
    <div style={enter.style} className={enter.className}>
      {children}
    </div>
  );
}

function Progress({ current, total }: { current: number; total: number }) {
  const percent = Math.round(((current + 1) / total) * 100);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="font-heading text-xs uppercase tracking-[0.2em] text-muted">
          Step {current + 1} of {total}
        </p>
        <p className="font-heading text-xs text-muted">{percent}%</p>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out-expo"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/**
 * The end of the flow.
 *
 * A ring that settles onto the page, then the two lines, staggered. There is no
 * glyph inside it: a mark on this site is a `mediaLibrary` record (§7.3), and
 * the one thing this moment does not need is an icon pasted into a component.
 * The ring is a border and a glow — tokens, no hex (§7.1).
 */
function ThankYou({ email }: { email: string }) {
  const entered = useEntered();

  return (
    <div className={`${panelClass} mt-10 p-8 text-center sm:p-10`} role="status">
      <div
        style={entering(entered, 'lift', 0, 700).style}
        className={`${entering(entered, 'lift', 0, 700).className} mx-auto flex size-16 items-center justify-center rounded-full border-2 border-accent shadow-[0_0_48px_var(--color-accent-halo)]`}
      >
        <span className="size-3 rounded-full bg-accent" />
      </div>

      <p
        style={entering(entered, 'up', 140, 700).style}
        className={`${entering(entered, 'up', 140, 700).className} mt-6 font-heading text-xl font-semibold text-fg sm:text-2xl`}
      >
        Thank you — that has reached me.
      </p>

      <p
        style={entering(entered, 'up', 260, 700).style}
        className={`${entering(entered, 'up', 260, 700).className} mx-auto mt-3 max-w-md text-sm text-muted`}
      >
        I read everything that comes through here and will reply to {email || 'your address'} as
        soon as I can. There is nothing else you need to do.
      </p>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  if (value.trim() === '') return null;

  return (
    <div className="border-t border-border py-3 first:border-t-0 first:pt-0">
      <dt className="font-heading text-xs uppercase tracking-[0.16em] text-muted">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-fg">{value}</dd>
    </div>
  );
}

export function ConversationForm({ draft }: { draft: EnquiryDraft }) {
  const { answers, setAnswer, submit, send, serverErrors, isRateLimited } = draft;

  const [index, setIndex] = useState(0);
  const [back, setBack] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [budgetIndex, setBudgetIndex] = useState(BUDGET_DEFAULT_INDEX);

  const step: Step = STEPS[index] ?? STEPS[0];
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  /*
   * Move focus to the new question, but never on first paint — stealing focus
   * as the page loads scrolls a visitor past the header they were reading. From
   * the second step onwards the heading is what a keyboard or screen reader
   * lands on, which is the only way a flow like this announces itself at all.
   */
  useEffect(() => {
    if (!moved.current) {
      moved.current = true;
      return;
    }
    heading.current?.focus();
  }, [index]);

  const errorFor = (field: keyof FieldErrors): string | undefined =>
    errors[field] ?? serverErrors[field];

  const goTo = (next: number, goingBack: boolean) => {
    setBack(goingBack);
    setErrors({});
    setIndex(next);
  };

  /** Everything this step insists on, and nothing from any other step. */
  const checkStep = (): boolean => {
    const all = validateAnswers(answers);
    const found: FieldErrors = {};
    for (const field of step.requires) {
      if (all[field]) found[field] = all[field];
    }

    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const advance = () => {
    if (!checkStep()) return;
    if (index < STEPS.length - 1) goTo(index + 1, false);
  };

  const skip = () => {
    if (step.id === 'budget') setAnswer('budgetRange', '');
    if (step.id === 'timeline') setAnswer('timeline', '');
    if (step.id === 'reach') {
      setAnswer('phone', '');
      setAnswer('company', '');
    }
    goTo(index + 1, false);
  };

  const chooseInterest = (label: string) => {
    if (answers.interest === label) {
      setAnswer('interest', '');
      return;
    }

    setAnswer('interest', label);
    // A chip is a starting point, not the answer. When there is nothing in the
    // box yet it seeds it, so picking one is never a dead end at the Next
    // button; when there is, the visitor's own words are left alone.
    if (answers.message.trim() === '') setAnswer('message', label);
  };

  const setBudget = (next: number) => {
    setBudgetIndex(next);
    setAnswer('budgetRange', formatBudget(budgetAt(next)));
  };

  if (submit.isSuccess) return <ThankYou email={answers.email.trim()} />;

  return (
    <form
      className="mt-10"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (step.id === 'review') send();
        else advance();
      }}
    >
      <Progress current={index} total={STEPS.length} />

      <div className="mt-6 min-h-[22rem]">
        <StepShell key={step.id} back={back}>
          <h2
            ref={heading}
            tabIndex={-1}
            className="font-heading text-2xl font-semibold tracking-tight text-fg outline-none sm:text-3xl"
          >
            {step.question}
          </h2>
          <p className="mt-2 text-sm text-muted">{step.hint}</p>

          <div className="mt-6">
            {step.id === 'build' ? (
              <div className="space-y-4">
                <Field label="In your own words" htmlFor="guided-message" error={errorFor('message')}>
                  <textarea
                    id="guided-message"
                    rows={5}
                    className={inputClasses}
                    value={answers.message}
                    maxLength={ENQUIRY_LIMITS.message}
                    onChange={(event) => setAnswer('message', event.target.value)}
                  />
                </Field>

                <div>
                  <p className="text-xs text-muted">Or start from one of these</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {INTEREST_OPTIONS.map((option) => (
                      <Chip
                        key={option}
                        label={option}
                        selected={answers.interest === option}
                        onClick={() => chooseInterest(option)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {step.id === 'budget' ? (
              <div>
                <p
                  className="font-heading text-3xl font-semibold text-accent sm:text-4xl"
                  aria-live="polite"
                >
                  {answers.budgetRange === '' ? 'Not answered' : answers.budgetRange}
                </p>

                <label htmlFor="guided-budget" className="mt-6 block text-sm font-medium text-fg">
                  Drag to set a figure
                </label>
                <input
                  id="guided-budget"
                  type="range"
                  min={0}
                  max={BUDGET_MAX_INDEX}
                  step={1}
                  value={budgetIndex}
                  onChange={(event) => setBudget(Number(event.target.value))}
                  aria-valuetext={formatBudget(budgetAt(budgetIndex))}
                  className="mt-3 h-11 w-full cursor-pointer accent-[var(--color-accent)]"
                />
                <div className="flex justify-between text-xs text-muted">
                  <span>{formatBudget(0)}</span>
                  <span>{formatBudget(1_000_000)}</span>
                </div>

                <div className="mt-5">
                  <Chip
                    label={BUDGET_UNSURE}
                    selected={answers.budgetRange === BUDGET_UNSURE}
                    onClick={() =>
                      setAnswer(
                        'budgetRange',
                        answers.budgetRange === BUDGET_UNSURE ? '' : BUDGET_UNSURE,
                      )
                    }
                  />
                </div>
              </div>
            ) : null}

            {step.id === 'timeline' ? (
              <div className="flex flex-wrap gap-2">
                {TIMELINE_OPTIONS.map((option) => (
                  <Chip
                    key={option}
                    label={option}
                    selected={answers.timeline === option}
                    onClick={() => setAnswer('timeline', answers.timeline === option ? '' : option)}
                  />
                ))}
              </div>
            ) : null}

            {step.id === 'you' ? (
              <div className="space-y-5">
                <Field label="Your name" htmlFor="guided-name" required error={errorFor('name')}>
                  <input
                    id="guided-name"
                    className={inputClasses}
                    value={answers.name}
                    maxLength={ENQUIRY_LIMITS.name}
                    autoComplete="name"
                    onChange={(event) => setAnswer('name', event.target.value)}
                  />
                </Field>

                <Field label="Email" htmlFor="guided-email" required error={errorFor('email')}>
                  <input
                    id="guided-email"
                    type="email"
                    className={inputClasses}
                    value={answers.email}
                    maxLength={ENQUIRY_LIMITS.email}
                    autoComplete="email"
                    onChange={(event) => setAnswer('email', event.target.value)}
                  />
                </Field>
              </div>
            ) : null}

            {step.id === 'reach' ? (
              <div className="space-y-5">
                <Field label="Phone" htmlFor="guided-phone" error={errorFor('phone')}>
                  <input
                    id="guided-phone"
                    type="tel"
                    className={inputClasses}
                    value={answers.phone}
                    maxLength={ENQUIRY_LIMITS.phone}
                    autoComplete="tel"
                    onChange={(event) => setAnswer('phone', event.target.value)}
                  />
                </Field>

                <Field label="Company" htmlFor="guided-company" error={errorFor('company')}>
                  <input
                    id="guided-company"
                    className={inputClasses}
                    value={answers.company}
                    maxLength={ENQUIRY_LIMITS.company}
                    autoComplete="organization"
                    onChange={(event) => setAnswer('company', event.target.value)}
                  />
                </Field>
              </div>
            ) : null}

            {step.id === 'review' ? (
              <dl className={`${panelClass} p-5`}>
                <ReviewRow label="What you want built" value={answers.message} />
                <ReviewRow label="Kind of work" value={answers.interest} />
                <ReviewRow label="Budget" value={answers.budgetRange} />
                <ReviewRow label="Timeline" value={answers.timeline} />
                <ReviewRow label="Name" value={answers.name} />
                <ReviewRow label="Email" value={answers.email} />
                <ReviewRow label="Phone" value={answers.phone} />
                <ReviewRow label="Company" value={answers.company} />
              </dl>
            ) : null}
          </div>
        </StepShell>
      </div>

      <Honeypot id="guided-website" value={draft.honeypot} onChange={draft.setHoneypot} />

      {submit.isError ? (
        <div className="mt-6">
          <SubmitError error={submit.error} isRateLimited={isRateLimited} />
        </div>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row-reverse sm:items-center">
        {step.id === 'review' ? (
          <button
            type="submit"
            disabled={submit.isPending}
            className={buttonClasses(
              'primary',
              'w-full disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-hover disabled:text-muted disabled:shadow-none sm:w-auto',
            )}
          >
            {submit.isPending ? 'Sending…' : 'Send enquiry'}
          </button>
        ) : (
          <button type="submit" className={buttonClasses('primary', 'w-full sm:w-auto')}>
            Next
          </button>
        )}

        {step.skippable ? (
          <button
            type="button"
            onClick={skip}
            className="min-h-11 px-2 text-sm text-muted underline underline-offset-4 transition-colors hover:text-accent"
          >
            Skip this
          </button>
        ) : null}

        {index > 0 ? (
          <button
            type="button"
            onClick={() => goTo(index - 1, true)}
            className={buttonClasses('secondary', 'w-full sm:mr-auto sm:w-auto')}
          >
            Back
          </button>
        ) : null}
      </div>
    </form>
  );
}
