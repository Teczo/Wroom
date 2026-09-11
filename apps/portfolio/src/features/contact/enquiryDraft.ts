import { ENQUIRY_LIMITS } from '@wroom/shared';
import { useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { ApiRequestError } from '../../lib/api';
import { useSubmitEnquiry } from '../content/enquiryApi';

/**
 * The answers behind the contact page, held above both forms.
 *
 * There are two ways to fill the same enquiry — the guided one and the plain
 * one — and a visitor may swap between them halfway through. Keeping the
 * answers here rather than inside either form is what makes that swap free:
 * nothing is retyped, and the two forms cannot drift into having different
 * ideas of what an enquiry is.
 *
 * Every answer is a string, because every field on the wire is a string. The
 * budget slider and the timeline chips choose their wording before it is
 * stored, not after — the server has one `requirement` shape (§8) and this
 * page does not get to invent a second one.
 */

export interface EnquiryAnswers {
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
  budgetRange: string;
  timeline: string;
  interest: string;
}

const EMPTY: EnquiryAnswers = {
  name: '',
  email: '',
  phone: '',
  company: '',
  message: '',
  budgetRange: '',
  timeline: '',
  interest: '',
};

export type FieldErrors = Partial<Record<keyof EnquiryAnswers, string>>;

/**
 * The client's copy of the shared schema, so the server rarely has to be the
 * one to say no. It checks the three required fields only — everything else is
 * capped by `maxLength` on the input it is typed into.
 */
export function validateAnswers(answers: EnquiryAnswers): FieldErrors {
  const errors: FieldErrors = {};

  if (answers.name.trim() === '') errors.name = 'Please tell me your name.';
  else if (answers.name.length > ENQUIRY_LIMITS.name) errors.name = 'That is too long.';

  if (answers.email.trim() === '') errors.email = 'I need an address to reply to.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.email.trim())) {
    errors.email = 'That does not look like an email address.';
  }

  if (answers.message.trim() === '') errors.message = 'Say a little about what you need.';
  else if (answers.message.length > ENQUIRY_LIMITS.message) errors.message = 'That is too long.';

  return errors;
}

export interface EnquiryDraft {
  answers: EnquiryAnswers;
  setAnswer: <K extends keyof EnquiryAnswers>(field: K, value: EnquiryAnswers[K]) => void;
  honeypot: string;
  setHoneypot: Dispatch<SetStateAction<string>>;
  submit: ReturnType<typeof useSubmitEnquiry>;
  send: () => void;
  /** Field messages the server sent back, keyed the same way as `validateAnswers`. */
  serverErrors: FieldErrors;
  isRateLimited: boolean;
}

export function useEnquiryDraft(relatedProjectId: string): EnquiryDraft {
  const submit = useSubmitEnquiry();

  /*
   * When the page was first shown, not when a form was. A submission far too
   * soon after this was not typed by a person and the server refuses it — and
   * because it is measured from the page rather than from either form, swapping
   * between them cannot restart the clock or be used to game it.
   */
  const openedAt = useRef(Date.now());

  const [answers, setAnswers] = useState<EnquiryAnswers>(EMPTY);
  const [honeypot, setHoneypot] = useState('');

  const setAnswer = <K extends keyof EnquiryAnswers>(field: K, value: EnquiryAnswers[K]) => {
    setAnswers((current) => ({ ...current, [field]: value }));
  };

  const send = () => {
    submit.mutate({
      name: answers.name.trim(),
      email: answers.email.trim(),
      phone: answers.phone.trim(),
      company: answers.company.trim(),
      message: answers.message.trim(),
      requirement: {
        budgetRange: answers.budgetRange.trim(),
        timeline: answers.timeline.trim(),
        interest: answers.interest.trim(),
      },
      ...(relatedProjectId ? { relatedProjectId } : {}),
      website: honeypot,
      submittedInMs: Date.now() - openedAt.current,
    });
  };

  /*
   * The client check above catches almost everything, so this is for the cases
   * where the two disagree — without it a 422 naming a field would surface only
   * as a general "that did not send" and the visitor would have no idea which
   * box to fix. The bot refusals carry no details and fall through to the
   * panel, which is the point of them saying nothing specific.
   */
  const serverErrors =
    submit.error instanceof ApiRequestError ? (submit.error.fieldErrors as FieldErrors) : {};

  return {
    answers,
    setAnswer,
    honeypot,
    setHoneypot,
    submit,
    send,
    serverErrors,
    isRateLimited: submit.error instanceof ApiRequestError && submit.error.status === 429,
  };
}
