import type { RequestHandler } from 'express';

import { validated, validatedQuery } from '../middleware/validate.js';
import * as stripeSync from '../services/stripeSyncService.js';
import { sendData } from '../utils/http.js';

/**
 * Vendor connections and the syncs they drive.
 *
 * Thin, like every controller here: no business logic, and nothing that shapes
 * a response beyond the envelope (CLAUDE.md §4).
 */

/** The connection, or null — the portal renders a "not connected" state from it. */
export const getStripe: RequestHandler = async (_req, res) => {
  sendData(res, await stripeSync.getStripeConnection());
};

export const saveStripe: RequestHandler = async (req, res) => {
  sendData(res, await stripeSync.saveStripeConnection(validated(req)));
};

export const syncStripe: RequestHandler = async (req, res) => {
  const { since } = validatedQuery<{ since?: Date | null }>(req);
  sendData(res, await stripeSync.syncStripeRevenue(since));
};
