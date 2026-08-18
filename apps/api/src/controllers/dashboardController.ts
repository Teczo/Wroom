import type { RequestHandler } from 'express';

import { getDashboardSummary } from '../services/dashboardService.js';
import { sendData } from '../utils/http.js';

/** The portal's home screen, in one request. */
export const summary: RequestHandler = async (_req, res) => {
  sendData(res, await getDashboardSummary());
};
