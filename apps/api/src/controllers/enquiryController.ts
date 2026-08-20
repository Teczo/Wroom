import type { RequestHandler } from 'express';

import { clientIp } from '../middleware/enquiryIntake.js';
import { validated } from '../middleware/validate.js';
import { createEnquiry } from '../services/enquiryService.js';
import { sendData } from '../utils/http.js';

/**
 * The one public write.
 *
 * It reads no collection — not to check for a duplicate, not to look up a
 * project, not to count anything. The only database call it causes is the
 * insert (CLAUDE.md §8).
 *
 * What comes back is a receipt, not the record. Echoing the stored enquiry
 * would hand an anonymous caller its id and the meta written about them, and
 * nothing on the form needs either.
 */
export const submit: RequestHandler = async (req, res) => {
  await createEnquiry(validated(req), {
    ip: clientIp(req),
    userAgent: String(req.headers['user-agent'] ?? '').slice(0, 500),
    submittedInMs: req.submittedInMs ?? null,
  });

  sendData(res, { received: true }, 201);
};
