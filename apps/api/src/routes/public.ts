import { Router } from 'express';

import * as portfolio from '../controllers/portfolioController.js';
import * as content from '../controllers/siteContentController.js';
import { publicEnquiriesRouter } from './enquiries.js';

/**
 * The unauthenticated namespace.
 *
 * Every route here must appear in the allowlist in CLAUDE.md §6, and adding
 * one is an edit to that file rather than a decision made in a session. Reads
 * are limited to `publishedProjects` and the `published` sub-document of
 * `siteContent`. Do not add a route that touches projects, costs, revenue,
 * accounts, credentials, services, timeEntries or users — that is the rule
 * that makes a bug in this file incapable of leaking a client project or a
 * cost figure. The `draft` half of a content record never leaves `/api/*`.
 */
export const publicRouter: Router = Router();

publicRouter.get('/projects', portfolio.list);
publicRouter.get('/projects/:slug', portfolio.getBySlug);
publicRouter.get('/content/:key', content.getPublic);

/**
 * The one write. It lives on its own router with its own middleware chain —
 * see routes/enquiries.ts — and reads nothing.
 */
publicRouter.use('/enquiries', publicEnquiriesRouter);
