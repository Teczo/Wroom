import { MEDIA_KINDS, type MediaKind } from '@wroom/shared';
import type { RequestHandler } from 'express';

import { validated } from '../middleware/validate.js';
import * as mediaLibraryService from '../services/mediaLibraryService.js';
import { queryString, sendData, sendList } from '../utils/http.js';

function mediaKind(value: string | undefined): MediaKind | undefined {
  return (MEDIA_KINDS as readonly string[]).includes(value ?? '')
    ? (value as MediaKind)
    : undefined;
}

export const list: RequestHandler = async (req, res) => {
  const items = await mediaLibraryService.listMediaLibrary({
    kind: mediaKind(queryString(req, 'kind')),
  });

  sendList(res, items, { total: items.length, page: 1, limit: items.length });
};

export const create: RequestHandler = async (req, res) => {
  sendData(res, await mediaLibraryService.createMediaItem(validated(req)), 201);
};

export const update: RequestHandler = async (req, res) => {
  sendData(
    res,
    await mediaLibraryService.updateMediaItem(req.params.id as string, validated(req)),
  );
};

export const remove: RequestHandler = async (req, res) => {
  await mediaLibraryService.deleteMediaItem(req.params.id as string);
  res.status(204).end();
};
