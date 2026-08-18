import type { RequestHandler } from 'express';

import { validated } from '../middleware/validate.js';
import * as productService from '../services/productService.js';
import { parsePagination, queryString, sendData, sendList } from '../utils/http.js';

export const list: RequestHandler = async (req, res) => {
  const pagination = parsePagination(req);
  const { items, total } = await productService.listProducts(
    { status: queryString(req, 'status'), search: queryString(req, 'q') },
    pagination,
  );

  sendList(res, items, { total, page: pagination.page, limit: pagination.limit });
};

export const get: RequestHandler = async (req, res) => {
  sendData(res, await productService.getProduct(req.params.id as string));
};

export const create: RequestHandler = async (req, res) => {
  const product = await productService.createProduct(validated(req));
  sendData(res, product, 201);
};

export const update: RequestHandler = async (req, res) => {
  const product = await productService.updateProduct(req.params.id as string, validated(req));
  sendData(res, product);
};

export const remove: RequestHandler = async (req, res) => {
  await productService.deleteProduct(req.params.id as string);
  res.status(204).end();
};
