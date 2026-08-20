import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { startPublishedProjectCache } from './services/publishedProjectCache.js';

async function main(): Promise<void> {
  await connectDatabase();

  // Filled here, and refreshed on a timer, so the public enquiry route can
  // check a project id without reading a collection inside a request.
  await startPublishedProjectCache();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`[api] listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = (signal: string) => {
    console.log(`[api] ${signal} received, shutting down`);
    server.close(() => {
      void disconnectDatabase().then(() => process.exit(0));
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error: unknown) => {
  console.error('[api] failed to start', error);
  process.exit(1);
});
