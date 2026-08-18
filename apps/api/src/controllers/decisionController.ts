import type { RequestHandler } from 'express';
import type { Types } from 'mongoose';

import { currentUser } from '../middleware/auth.js';
import { validated } from '../middleware/validate.js';
import * as decisionService from '../services/decisionService.js';
import { queryString, sendData, sendList } from '../utils/http.js';

export const list: RequestHandler = async (req, res) => {
  const items = await decisionService.listDecisions(req.params.projectId as string, {
    status: queryString(req, 'status'),
  });

  sendList(res, items, { total: items.length, page: 1, limit: items.length });
};

export const get: RequestHandler = async (req, res) => {
  sendData(res, await decisionService.getDecision(req.params.id as string));
};

export const create: RequestHandler = async (req, res) => {
  const decision = await decisionService.createDecision(
    req.params.projectId as string,
    validated(req),
    currentUser(req)._id as Types.ObjectId,
  );

  sendData(res, decision, 201);
};

export const update: RequestHandler = async (req, res) => {
  sendData(res, await decisionService.updateDecision(req.params.id as string, validated(req)));
};

/** One action, one save — see the service. */
export const supersede: RequestHandler = async (req, res) => {
  const { supersededByDecisionId } = validated<{ supersededByDecisionId: string }>(req);

  sendData(
    res,
    await decisionService.supersedeDecision(req.params.id as string, supersededByDecisionId),
  );
};

export const remove: RequestHandler = async (req, res) => {
  await decisionService.deleteDecision(req.params.id as string);
  res.status(204).end();
};
