import {
  object,
  partial,
  string,
  strictObject,
  withDefault,
  type Issue,
  type Validator,
} from '../validate.js';

/**
 * The editable half of a `siteContent` record.
 *
 * Only the draft is described here, and that is the point: `published`,
 * `publishedAt` and `publishedByUserId` are written by the publish action
 * alone, so there is no schema anywhere that would accept one in a request
 * body. Every field defaults to empty — a half-written page is a normal state
 * for a draft, and refusing to save one would be the wrong kind of strict.
 */
export const siteContentMetaShape = {
  title: withDefault(string({ max: 70, allowEmpty: true }), ''),
  description: withDefault(string({ max: 200, allowEmpty: true }), ''),
};

export const siteContentDraftShape = {
  title: withDefault(string({ max: 200, allowEmpty: true }), ''),
  /** Markdown. Nothing renders it yet — WRM-047 does that. */
  body: withDefault(string({ max: 20_000, allowEmpty: true }), ''),
  meta: withDefault(object(siteContentMetaShape), { title: '', description: '' }),
};

export const siteContentDraftSchema = object(siteContentDraftShape);

/** The body of `PATCH /api/content/:key`. Writes the draft and nothing else. */
export const siteContentDraftUpdateSchema = partial(siteContentDraftShape);

/**
 * The body of `POST /api/content/:key/publish` and its unpublish counterpart.
 *
 * Both take no arguments: publishing copies the draft that is already stored,
 * so a body carrying content would be content nobody had reviewed in the
 * editor. An empty body is accepted, anything in it is refused by name.
 */
const noFields = strictObject({});

export const siteContentPublishSchema: Validator<Record<string, never>> = {
  run(input: unknown, path: string, issues: Issue[]) {
    if (input === undefined || input === null) return {};
    return noFields.run(input, path, issues) as Record<string, never>;
  },
};
