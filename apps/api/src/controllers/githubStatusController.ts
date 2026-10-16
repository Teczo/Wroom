import type { RequestHandler } from 'express';

import { getGitHubStatus } from '../services/githubStatusService.js';
import { sendData } from '../utils/http.js';

/** Read only — a hands-off project's progress, from its repo. */
export const get: RequestHandler = async (req, res) => {
  sendData(res, await getGitHubStatus(req.params.id as string));
};
