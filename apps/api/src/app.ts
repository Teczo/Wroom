import cors from 'cors';
import express, { type Express } from 'express';

import { env } from './config/env.js';
import { databaseState } from './config/db.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { apiRouter } from './routes/api.js';
import { publicRouter } from './routes/public.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.use(
    cors({
      origin: env.corsOrigins.length > 0 ? env.corsOrigins : false,
      credentials: false,
    }),
  );

  app.get('/health', (_req, res) => {
    res.json({ data: { status: 'ok', database: databaseState() } });
  });

  // Two namespaces, and the split is the security boundary.
  app.use('/api', apiRouter);
  app.use('/public', publicRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
