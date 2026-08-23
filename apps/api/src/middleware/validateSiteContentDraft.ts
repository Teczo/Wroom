import { SITE_CONTENT_KEYS, siteContentDraftUpdateSchemaFor, type SiteContentKey } from '@wroom/shared';
import type { RequestHandler } from 'express';

import { NotFoundError } from '../utils/errors.js';
import { validateBody } from './validate.js';

/**
 * Validates a draft save against the schema for *that page*.
 *
 * `data` is a different shape per key, so the schema cannot be chosen when the
 * route is declared — only once the key is known. Resolving it here keeps the
 * rule in `packages/shared` where every other write's rules live, rather than
 * spreading a switch through the controller.
 *
 * An unknown key is a 404 before any validation runs: there is nothing to
 * validate against, and "no such page" is the honest answer rather than a
 * complaint about the body.
 */
export const validateSiteContentDraft: RequestHandler = (req, res, next) => {
  const key = req.params.key as string;

  if (!(SITE_CONTENT_KEYS as readonly string[]).includes(key)) {
    next(new NotFoundError('That content record'));
    return;
  }

  validateBody(siteContentDraftUpdateSchemaFor(key as SiteContentKey))(req, res, next);
};
