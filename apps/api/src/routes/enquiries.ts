import { Router } from 'express';

import { submit } from '../controllers/enquiryController.js';
import {
  botChecks,
  capBodySize,
  rateLimit,
  validateEnquiryBody,
} from '../middleware/enquiryIntake.js';

/**
 * The only unauthenticated write in the system, on its own router with its own
 * chain (CLAUDE.md §8).
 *
 * Kept separate from the rest of `/public` so the guards below cannot be
 * inherited by a read route by accident, and so nothing can be added to this
 * router without seeing the chain it will run behind.
 *
 * The order is deliberate: refuse an oversized body first, count the attempt
 * before validating it so malformed floods still trip the limit, then the bot
 * checks, then the schema. Nothing before the handler reads a collection, and
 * neither does the handler.
 */
export const publicEnquiriesRouter: Router = Router();

publicEnquiriesRouter.post(
  '/',
  capBodySize,
  rateLimit,
  botChecks,
  validateEnquiryBody,
  submit,
);
