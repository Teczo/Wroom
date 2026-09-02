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
 * The tools, declared as plain JSON Schema.
 *
 * The SDK's `registerTool` helper wants Zod schemas; this server uses the
 * low-level `Server` instead, which takes JSON Schema objects, because
 * CLAUDE.md §3 says there is no Zod in this repo. Zod still arrives as a
 * transitive dependency of the SDK — that is unavoidable — but none is written
 * here, and nothing in Wroom validates against it.
 *
 * **These schemas describe the payload; they do not enforce it.** The gate is
 * the matching schema in `packages/shared` — `bootstrapImportSchema` for the
 * bootstrap pair, `projectPortfolioUpdateSchema` for the portfolio pair —
 * checked server-side by the API on every route. What is below is what Claude
 * reads to know the shape, so it mirrors those schemas and has to be kept in
 * step with them — the enum values are imported rather than typed out for
 * exactly that reason.
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

/**
 * The portfolio half: the public page's copy, and only the copy.
 *
 * This mirrors `projectPortfolioUpdateShape` in `packages/shared`, minus six
 * keys that are deliberately not settable from a chat window:
 *
 * - `visibility`, `featured` and `sortOrder` are publish decisions. Making a
 *   project public is an explicit action taken in front of a screen (CLAUDE.md
 *   §8), and a connector that could set it would be a publish path.
 * - `heroAssetId`, `ogAssetId` and `demoVideo` need real uploaded files. A
 *   demo video requires a poster asset whatever its provider, so none of the
 *   three can be filled by anything that has no bytes to give.
 * - `appIconMediaKey` validates but is not written by the save path today, so
 *   offering it here would be offering a field that quietly does nothing.
 *
 * Case study heroes are left out for the same reason as the project's own.
 */

const testimonialSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['quote', 'attribution'],
  properties: {
    quote: { type: 'string', minLength: 1, maxLength: 1000 },
    attribution: { type: 'string', minLength: 1, maxLength: 140 },
  },
} as const;

const metricSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['label', 'value'],
  properties: {
    label: { type: 'string', minLength: 1, maxLength: 80 },
    value: { type: 'string', minLength: 1, maxLength: 80 },
  },
} as const;

const portfolioInputSchema = {
  type: 'object' as const,
  additionalProperties: false,
  required: ['projectSlug'],
  properties: {
    projectSlug: {
      type: 'string',
      description:
        'Which project this page belongs to. Must be a slug from wroom_list_context.',
    },

    // --- header ---
    category: { type: 'string', maxLength: 80, description: 'The chip above the title.' },
    tagline: { type: 'string', maxLength: 200 },
    overview: {
      type: 'string',
      maxLength: 4000,
      description: 'One paragraph under the tagline.',
    },
    liveUrl: {
      type: ['string', 'null'],
      description: 'The "Visit platform" target. Authored, not the deployed app URL.',
    },

    // --- body sections; each one hides entirely on the public page when empty ---
    featureCards: {
      type: 'array',
      maxItems: 24,
      description: 'The "Built for Complex Projects" grid.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title'],
        properties: {
          iconKey: {
            type: 'string',
            maxLength: 80,
            description:
              'A mediaLibrary key from wroom_list_context. A key that is not in the library is dropped at publish without an error.',
          },
          title: { type: 'string', minLength: 1, maxLength: 140 },
          body: { type: 'string', maxLength: 1000 },
        },
      },
    },
    keyModules: {
      type: 'array',
      maxItems: 24,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 140 },
          body: { type: 'string', maxLength: 1000 },
        },
      },
    },
    headlineMetric: {
      type: ['object', 'null'],
      additionalProperties: false,
      required: ['value', 'label'],
      description: 'One big number. Null removes the callout.',
      properties: {
        value: { type: 'string', minLength: 1, maxLength: 40 },
        label: { type: 'string', minLength: 1, maxLength: 140 },
      },
    },
    testimonial: { ...testimonialSchema, type: ['object', 'null'] },
    caseStudies: {
      type: 'array',
      maxItems: 24,
      description: 'Slugs have to be unique within this project.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['slug'],
        properties: {
          slug: { type: 'string' },
          sector: { type: 'string', maxLength: 80 },
          title: { type: 'string', maxLength: 200 },
          summary: { type: 'string', maxLength: 1000, description: 'The carousel card blurb.' },
          problem: { type: 'string', maxLength: 4000 },
          role: { type: 'string', maxLength: 4000 },
          approach: { type: 'string', maxLength: 4000 },
          outcome: { type: 'string', maxLength: 4000 },
          metrics: { type: 'array', maxItems: 12, items: metricSchema },
          testimonial: { ...testimonialSchema, type: ['object', 'null'] },
          sortOrder: { type: 'integer' },
        },
      },
    },

    // --- reference data ---
    techStackKeys: {
      type: 'array',
      maxItems: 40,
      items: { type: 'string' },
      description: 'mediaLibrary keys of kind "tech", from wroom_list_context. Keys, not labels.',
    },
    platformKeys: {
      type: 'array',
      maxItems: 40,
      items: { type: 'string' },
      description: 'mediaLibrary keys of kind "platform", from wroom_list_context.',
    },
  },
};

export const LIST_CONTEXT = 'wroom_list_context';
export const BOOTSTRAP_PREVIEW = 'wroom_bootstrap_preview';
export const BOOTSTRAP_COMMIT = 'wroom_bootstrap_commit';
export const PORTFOLIO_PREVIEW = 'wroom_portfolio_preview';
export const PORTFOLIO_COMMIT = 'wroom_portfolio_commit';

export const tools: Tool[] = [
  {
    name: LIST_CONTEXT,
    title: 'List Wroom context',
    description:
      'The products, project type keys, project slugs and mediaLibrary keys that already exist in Wroom. Call this before building a bootstrap payload — reusing an existing slug updates that record instead of creating a new one — and before writing a portfolio page, because every icon, tech and platform key has to come from this list.',
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
  {
    name: PORTFOLIO_PREVIEW,
    title: 'Preview a project page draft',
    description:
      "Work out what writing this copy onto a project's public page would change, and return it field by field. Writes nothing. Always call this and let the person read the plan before committing.",
    inputSchema: portfolioInputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: PORTFOLIO_COMMIT,
    title: 'Commit a project page draft',
    description:
      "Write this copy onto the project's page. Only call this after the person has read the plan from wroom_portfolio_preview and asked for it. It does not publish anything: the project stays private until somebody publishes it in the portal. Running the same payload twice changes nothing the second time.",
    inputSchema: portfolioInputSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
];
