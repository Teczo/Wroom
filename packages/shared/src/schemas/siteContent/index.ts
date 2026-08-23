import type { SiteContentKey } from '../../constants.js';
import {
  object,
  partial,
  string,
  strictObject,
  withDefault,
  type Infer,
  type Issue,
  type Validator,
} from '../../validate.js';
import { aboutDataSchema } from './about.js';
import { contactDataSchema } from './contact.js';
import { landingDataSchema } from './landing.js';
import { skillsDataSchema } from './skills.js';

export * from './about.js';
export * from './contact.js';
export * from './landing.js';
export * from './shared.js';
export * from './skills.js';

/**
 * The editable half of a `siteContent` record.
 *
 * Only the draft is described here, and that is the point: `published`,
 * `publishedAt` and `publishedByUserId` are written by the publish action
 * alone, so there is no schema anywhere that would accept one in a request
 * body. Every field tolerates empty — a half-written page is a normal state
 * for a draft, and refusing to save one would be the wrong kind of strict.
 */
export const siteContentMetaShape = {
  title: withDefault(string({ max: 70, allowEmpty: true }), ''),
  description: withDefault(string({ max: 200, allowEmpty: true }), ''),
};

/**
 * `data` is validated per key, so which schema applies depends on which record
 * is being written. One page's shape posted to another's key is rejected rather
 * than dropped — a landing record that silently saved as empty because it was
 * sent a skills object is the failure this prevents.
 */
export const SITE_CONTENT_DATA_SCHEMAS = {
  landing: landingDataSchema,
  about: aboutDataSchema,
  skills: skillsDataSchema,
  contact: contactDataSchema,
} as const satisfies Record<SiteContentKey, Validator<Record<string, unknown>>>;

export function siteContentDataSchemaFor(
  key: SiteContentKey,
): (typeof SITE_CONTENT_DATA_SCHEMAS)[SiteContentKey] {
  return SITE_CONTENT_DATA_SCHEMAS[key];
}

/**
 * The fields themselves, with no opinion about what an absent one means.
 *
 * A create fills defaults; an update must not. Building the PATCH schema from
 * these rather than from the defaulted shape is what stops an empty body
 * writing empty strings over a page somebody wrote.
 */
const siteContentDraftFields = {
  title: string({ max: 200, allowEmpty: true }),
  /** Markdown, rendered with react-markdown + rehype-sanitize. */
  body: string({ max: 20_000, allowEmpty: true }),
  meta: object(siteContentMetaShape),
};

export const siteContentDraftShape = {
  title: withDefault(siteContentDraftFields.title, ''),
  body: withDefault(siteContentDraftFields.body, ''),
  meta: withDefault(siteContentDraftFields.meta, { title: '', description: '' }),
};

export const siteContentDraftSchema = object(siteContentDraftShape);

/**
 * The body of `PATCH /api/content/:key`, for one key.
 *
 * Key-specific because `data` is: the route resolves the key first and asks for
 * the matching schema, so the wrong shape never reaches a record.
 */
export function siteContentDraftUpdateSchemaFor(
  key: SiteContentKey,
): Validator<Partial<Infer<typeof siteContentDraftFields> & { data: Record<string, unknown> }>> {
  return partial({
    ...siteContentDraftFields,
    data: siteContentDataSchemaFor(key),
  }) as Validator<
    Partial<Infer<typeof siteContentDraftFields> & { data: Record<string, unknown> }>
  >;
}

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
