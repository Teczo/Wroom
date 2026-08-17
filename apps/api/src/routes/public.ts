import { Router } from 'express';

import * as portfolio from '../controllers/portfolioController.js';

/**
 * The unauthenticated namespace.
 *
 * Every route here reads `publishedProjects` and nothing else. Do not add a
 * route that touches projects, costs, revenue, accounts, credentials, services,
 * timeEntries or users — that is the rule that makes a bug in this file
 * incapable of leaking a client project or a cost figure. No writes, ever.
 */
export const publicRouter: Router = Router();

publicRouter.get('/projects', portfolio.list);
publicRouter.get('/projects/:slug', portfolio.getBySlug);
