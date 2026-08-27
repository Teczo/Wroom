import { env } from './config/env.js';
import { createApp } from './server.js';

/**
 * `MCP_SERVER_IDENTIFIER` doubles as the public URL in the 401 challenge: the
 * MCP spec wants an absolute URI that identifies this server, and the address
 * Claude connects to is that URI. One value, so the two cannot disagree.
 */
function main(): void {
  const app = createApp(env.mcp.identifier.replace(/\/+$/, ''));

  const server = app.listen(env.port, () => {
    console.log(`[mcp] listening on http://localhost:${env.port} (${env.nodeEnv})`);
    console.log(`[mcp] resource identifier ${env.mcp.identifier}`);
  });

  const shutdown = (signal: string) => {
    console.log(`[mcp] ${signal} received, shutting down`);
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main();
