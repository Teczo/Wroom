import {
  BOOTSTRAP_MAX_FEATURES,
  FEATURE_PRIORITIES,
  FEATURE_SIZES,
  FEATURE_STATUSES,
  PRODUCT_STATUSES,
  PROJECT_STATUSES,
} from '@wroom/shared';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * The three tools, declared as plain JSON Schema.
 *
 * The SDK's `registerTool` helper wants Zod schemas; this server uses the
 * low-level `Server` instead, which takes JSON Schema objects, because
 * CLAUDE.md §3 says there is no Zod in this repo. Zod still arrives as a
 * transitive dependency of the SDK — that is unavoidable — but none is written
 * here, and nothing in Wroom validates against it.
 *
 * **These schemas describe the payload; they do not enforce it.** The gate is
 * `bootstrapImportSchema` in `packages/shared`, checked server-side by the API
 * on both routes. What is below is what Claude reads to know the shape, so it
 * mirrors that schema and has to be kept in step with it — the enum values are
 * imported rather than typed out for exactly that reason.
 */

const featureSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ref', 'title'],
  properties: {
    ref: {
      type: 'string',
      pattern: '^[A-Za-z][A-Za-z0-9]*-\\d+$',
      description: 'Short human reference, unique within the project, e.g. WRM-1.',
    },
    title: { type: 'string', maxLength: 200 },
    description: { type: 'string', maxLength: 8000 },
    acceptanceCriteria: { type: 'string', maxLength: 2000 },
    status: { type: 'string', enum: [...FEATURE_STATUSES] },
    priority: { type: 'string', enum: [...FEATURE_PRIORITIES] },
    size: { type: 'string', enum: [...FEATURE_SIZES] },
    labels: { type: 'array', maxItems: 20, items: { type: 'string', maxLength: 40 } },
    dependsOn: {
      type: 'array',
      maxItems: 50,
      items: { type: 'string', pattern: '^[A-Za-z][A-Za-z0-9]*-\\d+$' },
      description:
        'Refs of features this one waits on. May name features elsewhere in this payload.',
    },
  },
} as const;

const bootstrapInputSchema = {
  type: 'object' as const,
  additionalProperties: false,
  required: ['product', 'project'],
  properties: {
    product: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'slug'],
      description: 'Matched on slug. An existing slug updates that product rather than adding one.',
      properties: {
        name: { type: 'string', maxLength: 120 },
        slug: { type: 'string' },
        description: { type: 'string', maxLength: 2000 },
        isClientWork: { type: 'boolean' },
        clientName: { type: ['string', 'null'], maxLength: 120 },
        ndaRestricted: { type: 'boolean' },
        status: { type: 'string', enum: [...PRODUCT_STATUSES] },
      },
    },
    project: {
      type: 'object',
      additionalProperties: false,
      required: ['projectTypeKey', 'name', 'slug'],
      description:
        'Matched on slug, and belongs to the product above. Per-type `details` are not settable here — they are filled in the portal.',
      properties: {
        projectTypeKey: {
          type: 'string',
          description: 'Must be one of the keys from wroom_list_context.',
        },
        name: { type: 'string', maxLength: 140 },
        slug: { type: 'string' },
        shortDescription: { type: 'string', maxLength: 400 },
        status: { type: 'string', enum: [...PROJECT_STATUSES] },
        phase: { type: 'string', maxLength: 80 },
        tags: { type: 'array', maxItems: 30, items: { type: 'string', maxLength: 40 } },
        techStack: {
          type: 'object',
          additionalProperties: false,
          properties: {
            frontend: { type: 'array', items: { type: 'string', maxLength: 60 } },
            backend: { type: 'array', items: { type: 'string', maxLength: 60 } },
            database: { type: 'array', items: { type: 'string', maxLength: 60 } },
            other: { type: 'array', items: { type: 'string', maxLength: 60 } },
          },
        },
        repo: {
          type: 'object',
          additionalProperties: false,
          properties: {
            provider: { type: 'string', enum: ['github'] },
            fullName: { type: 'string', maxLength: 140 },
            defaultBranch: { type: 'string', maxLength: 140 },
          },
        },
      },
    },
    features: {
      type: 'array',
      maxItems: BOOTSTRAP_MAX_FEATURES,
      items: featureSchema,
      description: 'Matched on ref within the project. Nothing is ever deleted.',
    },
  },
};

export const LIST_CONTEXT = 'wroom_list_context';
export const BOOTSTRAP_PREVIEW = 'wroom_bootstrap_preview';
export const BOOTSTRAP_COMMIT = 'wroom_bootstrap_commit';

export const tools: Tool[] = [
  {
    name: LIST_CONTEXT,
    title: 'List Wroom context',
    description:
      'The products, project type keys and project slugs that already exist in Wroom. Call this before building a bootstrap payload: reusing an existing slug updates that record instead of creating a new one.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: BOOTSTRAP_PREVIEW,
    title: 'Preview a Wroom bootstrap import',
    description:
      'Work out what creating this product, project and its features would do, and return it as a readable plan. Writes nothing. Always call this and let the person read the plan before committing.',
    inputSchema: bootstrapInputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: BOOTSTRAP_COMMIT,
    title: 'Commit a Wroom bootstrap import',
    description:
      'Write the product, the project and its features. Only call this after the person has read the plan from wroom_bootstrap_preview and asked for it. Running the same payload twice does not duplicate anything.',
    inputSchema: bootstrapInputSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
];
