import {
  FEATURE_CSV_TEMPLATE_FILENAME,
  buildFeatureCsvTemplate,
} from '@wroom/shared';
import type { RequestHandler } from 'express';

import * as featureImportService from '../services/featureImportService.js';

import { validated } from '../middleware/validate.js';
import * as featureService from '../services/featureService.js';
import { queryString, sendData, sendList } from '../utils/http.js';

export const list: RequestHandler = async (req, res) => {
  const items = await featureService.listFeatures(req.params.projectId as string, {
    status: queryString(req, 'status'),
    priority: queryString(req, 'priority'),
    search: queryString(req, 'q'),
  });

  // The board is unpaginated by design, but the envelope stays consistent.
  sendList(res, items, { total: items.length, page: 1, limit: items.length });
};

export const get: RequestHandler = async (req, res) => {
  const feature = await featureService.getFeature(
    req.params.projectId as string,
    req.params.id as string,
  );
  sendData(res, feature);
};

export const create: RequestHandler = async (req, res) => {
  const feature = await featureService.createFeature(
    req.params.projectId as string,
    validated(req),
  );
  sendData(res, feature, 201);
};

export const update: RequestHandler = async (req, res) => {
  const feature = await featureService.updateFeature(
    req.params.projectId as string,
    req.params.id as string,
    validated(req),
  );
  sendData(res, feature);
};

export const move: RequestHandler = async (req, res) => {
  const feature = await featureService.moveFeature(
    req.params.projectId as string,
    req.params.id as string,
    validated(req),
  );
  sendData(res, feature);
};

export const remove: RequestHandler = async (req, res) => {
  await featureService.deleteFeature(req.params.projectId as string, req.params.id as string);
  res.status(204).end();
};

/**
 * The blank importable file. Sent as a file rather than in the `{ data }`
 * envelope, because the browser saves it rather than reading it.
 */
export const csvTemplate: RequestHandler = (_req, res) => {
  res
    .type('text/csv')
    .setHeader(
      'Content-Disposition',
      `attachment; filename="${FEATURE_CSV_TEMPLATE_FILENAME}"`,
    );

  res.send(buildFeatureCsvTemplate());
};

/** Calculates the diff and writes nothing. */
export const importPreview: RequestHandler = async (req, res) => {
  const { csv } = validated<{ csv: string }>(req);
  sendData(res, await featureImportService.previewImport(req.params.projectId as string, csv));
};

export const importCommit: RequestHandler = async (req, res) => {
  const { csv, acknowledgeSkipped } = validated<{ csv: string; acknowledgeSkipped: boolean }>(req);

  sendData(
    res,
    await featureImportService.commitImport(
      req.params.projectId as string,
      csv,
      acknowledgeSkipped,
    ),
  );
};
