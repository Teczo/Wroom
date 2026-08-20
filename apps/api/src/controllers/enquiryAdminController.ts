import type { RequestHandler } from 'express';
import type { Types } from 'mongoose';

import { currentUser } from '../middleware/auth.js';
import { validated } from '../middleware/validate.js';
import * as enquiries from '../services/enquiryAdminService.js';
import { parsePagination, queryString, sendData, sendList } from '../utils/http.js';

export const list: RequestHandler = async (req, res) => {
  const pagination = parsePagination(req);

  const { items, total } = await enquiries.listEnquiries(
    { status: queryString(req, 'status') },
    pagination,
  );

  sendList(res, items, { total, page: pagination.page, limit: pagination.limit });
};

export const get: RequestHandler = async (req, res) => {
  sendData(res, await enquiries.getEnquiry(req.params.id as string));
};

export const create: RequestHandler = async (req, res) => {
  const enquiry = await enquiries.createManualEnquiry(
    validated(req),
    currentUser(req)._id as Types.ObjectId,
  );

  sendData(res, enquiry, 201);
};

export const update: RequestHandler = async (req, res) => {
  sendData(res, await enquiries.updateEnquiry(req.params.id as string, validated(req)));
};

export const remove: RequestHandler = async (req, res) => {
  await enquiries.deleteEnquiry(req.params.id as string);
  res.status(204).end();
};
