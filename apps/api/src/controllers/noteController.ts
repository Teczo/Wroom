import type { RequestHandler } from 'express';
import type { Types } from 'mongoose';

import { currentUser } from '../middleware/auth.js';
import { validated } from '../middleware/validate.js';
import * as noteService from '../services/noteService.js';
import { queryString, sendData, sendList } from '../utils/http.js';

export const list: RequestHandler = async (req, res) => {
  const items = await noteService.listNotes(req.params.projectId as string, {
    kind: queryString(req, 'kind'),
    featureId: queryString(req, 'featureId'),
  });

  sendList(res, items, { total: items.length, page: 1, limit: items.length });
};

export const create: RequestHandler = async (req, res) => {
  const note = await noteService.createNote(
    req.params.projectId as string,
    validated(req),
    currentUser(req)._id as Types.ObjectId,
  );

  sendData(res, note, 201);
};

export const update: RequestHandler = async (req, res) => {
  sendData(res, await noteService.updateNote(req.params.id as string, validated(req)));
};

export const remove: RequestHandler = async (req, res) => {
  await noteService.deleteNote(req.params.id as string);
  res.status(204).end();
};
