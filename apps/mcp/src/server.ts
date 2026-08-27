import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { BootstrapImportDiff, BootstrapImportResult } from '@wroom/shared';
import express, { type Express } from 'express';

import { mcpAuthErrorHandler, verifyMcpToken } from './auth/requireMcpAuth.js';
import {
  PROTECTED_RESOURCE_METADATA_PATH,
  protectedResourceMetadata,
} from './auth/protectedResourceMetadata.js';
import {
  BOOTSTRAP_COMMIT,
  BOOTSTRAP_PREVIEW,
  LIST_CONTEXT,
  tools,
} from './tools/definitions.js';
import { listContext, renderContext } from './tools/listContext.js';
import { renderPlan, renderResult } from './tools/renderPlan.js';
import { WroomApiError, post } from './wroom/client.js';

/**
 * The MCP server, and the Express app that fronts it.
 *
 * Three tools and no more. There is no authorization layer inside the Wroom
 * API — a valid token there reads and writes every collection — so this list is
 * the boundary that decides what the connector can reach at all. Adding to it
 * is a ticket, not a convenience.
 */

function text(body: string, isError = false) {
  return { content: [{ type: 'text' as const, text: body }], isError };
}

/** Turns an API failure into something a person can act on, without leaking internals. */
function describeFailure(error: unknown): string {
  if (error instanceof WroomApiError) {
    return `Wroom refused this (${error.code}): ${error.message}`;
  }

  return 'Could not reach Wroom. Try again, and check the API is up if it keeps failing.';
}

function createMcpServer(): Server {
  const server = new Server(
    { name: 'wroom', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === LIST_CONTEXT) {
        return text(renderContext(await listContext()));
      }

      // The payload is passed through untouched. Validation is the API's job,
      // against the shared schema — checking it a second time here would be a
      // second thing to keep in step, and a looser one.
      if (name === BOOTSTRAP_PREVIEW) {
        const { data } = await post<BootstrapImportDiff>(
          '/api/import/bootstrap/preview',
          args ?? {},
        );
        return text(renderPlan(data));
      }

      if (name === BOOTSTRAP_COMMIT) {
        const { data } = await post<BootstrapImportResult>(
          '/api/import/bootstrap/commit',
          args ?? {},
        );
        return text(renderResult(data));
      }

      return text(`There is no tool called ${name}.`, true);
    } catch (error: unknown) {
      return text(describeFailure(error), true);
    }
  });

  return server;
}

/**
 * `publicUrl` is where Claude reaches this server. It goes in the 401 challenge
 * so a client with no token can find the metadata document and go and get one.
 */
export function createApp(publicUrl: string): Express {
  const app = express();

  app.disable('x-powered-by');

  // Unauthenticated by design: this is the document that tells a caller *how*
  // to authenticate. It names the authorization server and nothing else.
  app.get(PROTECTED_RESOURCE_METADATA_PATH, protectedResourceMetadata);
  app.get(`${PROTECTED_RESOURCE_METADATA_PATH}/mcp`, protectedResourceMetadata);

  app.get('/health', (_req, res) => {
    res.json({ data: { status: 'ok' } });
  });

  // Everything past here needs a token issued for this server.
  app.post('/mcp', verifyMcpToken, express.json({ limit: '1mb' }), async (req, res, next) => {
    try {
      const server = createMcpServer();
      // Stateless: a transport and a server per request, closed when the
      // response ends. Nothing is kept between calls, so there is no session to
      // confuse between callers.
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

      res.on('close', () => {
        void transport.close();
        void server.close();
      });

      await server.connect(transport);

      // `express-oauth2-jwt-bearer` and the MCP SDK both augment `req.auth`,
      // with different shapes, so the two types collide here. Nothing reads it:
      // the token was verified by the middleware above and no tool handler
      // looks at the caller. The cast is at the one point the two libraries
      // meet, rather than weakening the types anywhere it would matter.
      await transport.handleRequest(
        req as unknown as Parameters<typeof transport.handleRequest>[0],
        res,
        req.body,
      );
    } catch (error: unknown) {
      next(error);
    }
  });

  app.use(mcpAuthErrorHandler(publicUrl));

  app.use((_req, res) => {
    res.status(404).json({ error: 'not_found' });
  });

  return app;
}
