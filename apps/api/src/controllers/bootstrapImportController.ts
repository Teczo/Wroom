import type { RequestHandler } from 'express';

import { validated } from '../middleware/validate.js';
import * as bootstrapImportService from '../services/bootstrapImportService.js';
import { sendData } from '../utils/http.js';

/**
 * Both routes take the same body. Preview calculates and writes nothing;
 * commit re-plans that same body and then writes, rather than trusting a plan
 * the client sends back.
 */

export const preview: RequestHandler = async (req, res) => {
  sendData(res, await bootstrapImportService.previewBootstrapImport(validated(req)));
};

export const commit: RequestHandler = async (req, res) => {
  sendData(res, await bootstrapImportService.commitBootstrapImport(validated(req)), 201);
};
