import {
  ENQUIRY_LIMITS,
  ENQUIRY_MIN_SUBMIT_MS,
  ENQUIRY_STATUSES,
  MANUAL_ENQUIRY_SOURCES,
} from '../constants.js';
import {
  enumOf,
  nullable,
  number,
  object,
  objectId,
  optional,
  partial,
  string,
  withDefault,
  type Validator,
} from '../validate.js';

/**
 * The body of `POST /public/enquiries` — the only unauthenticated write in the
 * system (CLAUDE.md §8).
 *
 * Every field is a capped string, and that is the whole NoSQL injection defence:
 * a body sending `{ "email": { "$ne": null } }` fails on "must be a string"
 * before anything reaches a query. Nothing here accepts an object, an array or
 * a number, and unknown keys are dropped rather than stored.
 *
 * The fields a caller may not set — `status`, `source`, `ownerUserId`,
 * `convertedToProductId`, `meta` and the timestamps — are absent by design.
 * There is no schema in this package that would accept one, so the only way
 * they can be written is by the server writing them.
 */
export const enquiryRequirementShape = {
  budgetRange: withDefault(
    string({ max: ENQUIRY_LIMITS.requirement, allowEmpty: true }),
    '',
  ),
  timeline: withDefault(string({ max: ENQUIRY_LIMITS.requirement, allowEmpty: true }), ''),
  interest: withDefault(string({ max: ENQUIRY_LIMITS.requirement, allowEmpty: true }), ''),
};

export const enquiryCreateShape = {
  name: string({ min: 1, max: ENQUIRY_LIMITS.name }),
  /**
   * Loose on purpose. A stricter pattern rejects addresses that genuinely
   * work, and the cost of a typo here is an enquiry you cannot reply to —
   * which you can see and fix — rather than a lost enquiry you never knew about.
   */
  email: string({
    min: 3,
    max: ENQUIRY_LIMITS.email,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  }),
  phone: withDefault(string({ max: ENQUIRY_LIMITS.phone, allowEmpty: true }), ''),
  company: withDefault(string({ max: ENQUIRY_LIMITS.company, allowEmpty: true }), ''),
  message: string({ min: 1, max: ENQUIRY_LIMITS.message }),
  requirement: withDefault(object(enquiryRequirementShape), {
    budgetRange: '',
    timeline: '',
    interest: '',
  }),
  /**
   * A hint, not a claim. It is stored only when it names a project that is
   * currently published, and anything else becomes null — so a wrong or
   * invented value costs nothing and is never rejected.
   */
  relatedProjectId: withDefault(string({ max: 64, allowEmpty: true }), ''),
};

export const enquiryCreateSchema = object(enquiryCreateShape);

/**
 * The anti-bot half of the same body, validated separately because it is never
 * stored as enquiry content. `submittedInMs` is how long the form was open;
 * anything under `ENQUIRY_MIN_SUBMIT_MS` was not typed by a person.
 *
 * Both are optional: a submission that omits them is treated as failing the
 * checks rather than skipping them, which is decided by the server.
 */
export const enquiryBotCheckSchema: Validator<{
  honeypot: string | undefined;
  submittedInMs: number | undefined;
}> = object({
  honeypot: optional(string({ max: 200, allowEmpty: true })),
  submittedInMs: optional(number({ min: 0, max: 86_400_000 })),
});

/** True when the elapsed time is too short to have been a person typing. */
export function isImplausiblyFast(submittedInMs: number | undefined): boolean {
  return submittedInMs === undefined || submittedInMs < ENQUIRY_MIN_SUBMIT_MS;
}

/**
 * The body of `PATCH /api/enquiries/:id`.
 *
 * What someone actually wrote — name, email, message, source — is not editable
 * and never will be: an enquiry is a record of what arrived, and a pipeline
 * that lets you rewrite the message is a pipeline you cannot trust. What is
 * editable is everything you decide about it afterwards.
 */
export const enquiryUpdateShape = {
  status: enumOf(ENQUIRY_STATUSES),
  ownerUserId: nullable(objectId()),
  requirement: object(enquiryRequirementShape),
  /** Only ever set alongside a `won` status — the service enforces that. */
  convertedToProductId: nullable(objectId()),
};

export const enquiryUpdateSchema = partial(enquiryUpdateShape);

/**
 * The body of `POST /api/enquiries` — an enquiry that arrived some other way,
 * typed in by hand. `portfolio-form` is absent on purpose: that source means
 * "came through the public form", and only the public form may claim it.
 */
export const enquiryManualCreateShape = {
  ...enquiryCreateShape,
  source: enumOf(MANUAL_ENQUIRY_SOURCES),
};

export const enquiryManualCreateSchema = object(enquiryManualCreateShape);
