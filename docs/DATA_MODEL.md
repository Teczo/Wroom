# Wroom — Data Model (v0.2)

**Stack assumed:** MongoDB Atlas · Express 5 / Node 24 · React 18 + Vite + Tailwind v4 · Azure App Service (backend) · Vercel (both frontends) · Azure Blob (media) · Auth0 · Stripe · Claude API

**Two frontends, one backend, one database.** The portfolio never reads the operational collections — it reads only `publishedProjects`, `siteContent.published`, and public blob URLs. See "Publishing" at the end.

**This document is authoritative.** If a prompt seems to require a field or collection that is not here, stop and report. Do not invent schema.

---

## Collection map

| Collection | Purpose | Version |
|---|---|---|
| `users` | People who log in | v1 |
| `projectTypes` | Schema-driven form definitions | v1 |
| `products` | Product group (parent of several projects) | v1 |
| `projects` | The core record | v1 |
| `accounts` | Vendor accounts you own (incl. secondary test accounts) | v1 |
| `environments` | dev / staging / prod per project | v1 |
| `services` | A hosted thing inside an environment | v1 |
| `projectLinks` | Relationships between projects | v1 |
| `features` | Kanban cards / feature ledger | v1 |
| `costs` | Every charge | v1 |
| `assets` | Screenshots, videos, files | v1 |
| `mediaLibrary` | Reusable marks — tech, platform, client, social | v1 |
| `notes` | Free notes per project or enquiry | v1 |
| `credentials` | Where a key lives + when it expires (never the key) | v1 |
| `decisions` | ADR-lite | v1 |
| `timeEntries` | Hours logged per project/feature | v1 |
| `siteContent` | Portfolio's own copy, draft/published | v1 |
| `enquiries` | Inbound contact from the public form | v1 |
| `publishedProjects` | Portfolio snapshot | v1 |
| `revenue` | Money in, Stripe-synced or manual | v2 |
| `vendorConnections` | API creds for cost/revenue sync | v2 |
| `deployments` | Release history from GitHub | v2 |
| `auditLog` | Who changed what | v2 |
| `memberships` | Per-project access for team + clients | v2 |

---

## v1 collections

### `users`
```js
{
  _id, authProviderId,          // Auth0 sub
  name, email, avatarUrl,
  globalRole,                   // "owner" | "developer" | "viewer"
  defaultHourlyRateAud: 0,      // used to value timeEntries; 0 = don't cost my own hours
  active: true,
  createdAt, updatedAt
}
```
`globalRole` is enough for v1. Per-project access moves to `memberships` in v2 without changing this shape.

---

### `projectTypes`
This is what makes "first question: what type of project is this?" work without a code change every time you add a type.

```js
{
  _id, key,                     // "web" | "mobile-rn" | "unity" | "api" | "xr" | "internal-tool"
  label, icon, sortOrder, active: true,

  fieldDefs: [
    {
      key: "targetPlatforms",
      label: "Target platforms",
      type: "multiselect",      // text|textarea|number|select|multiselect|url|date|boolean
      options: ["iOS", "Android"],
      required: true,
      group: "Build",
      helpText: "",
      showIf: null              // { field: "usesOTA", equals: true }
    }
  ],

  expectedServiceRoles: ["backend", "database", "storage"],
  defaultTechStack: { frontend: [], backend: [] }
}
```

`key` is an unconstrained `String` in the model. `PROJECT_TYPE_KEYS` in `packages/shared` is the real list.

---

### `products`
```js
{
  _id, name, slug, description,
  isClientWork: false,          // no clients collection — a flag is enough
  clientName: null,             // free text, display only
  clientMediaKey: null,         // → mediaLibrary.key, kind "client"; null unless approved
  ndaRestricted: false,         // blocks portfolio publishing for all children
  status,                       // "active" | "paused" | "archived"
  createdAt, updatedAt
}
```

`clientMediaKey` exists so a client logo can appear on a case study. It is **only** populated when `mediaLibrary.usageApproved` is true for that key. An NDA-restricted product never publishes at all, so the two never conflict.

---

### `projects`
```js
{
  _id, productId, projectTypeKey,
  name, slug, shortDescription,

  status,                       // "idea" | "in-development" | "live" | "on-hold" | "archived"
  phase,                        // free text, e.g. "Phase 6"
  ownerUserId,
  startedAt, launchedAt,

  repo: {
    provider: "github",
    fullName: "teczo/holoxr-web",
    defaultBranch: "main",
    webhookConfigured: false
  },

  techStack: {                  // operational record — free text, for your own reference
    frontend: ["React", "Vite", "Tailwind CSS"],
    backend: ["Express 5", "Node.js"],
    database: ["MongoDB Atlas"],
    other: ["Auth0", "Claude API"]
  },

  details: { /* validated against projectTypes.fieldDefs */ },

  tags: ["xr", "bim"],

  featuresExport: {
    repoPath: "FEATURES.yaml",
    lastExportedAt: null,
    exportVersion: 0,
    offlineEditsDetected: false
  },

  portfolio: { /* see below */ },

  rollup: {
    featureCounts: { backlog: 0, todo: 0, inProgress: 0, blocked: 0, done: 0 },
    percentComplete: 0,
    monthlyCostAud: 0,
    totalSpendAud: 0,
    totalRevenueAud: 0,
    totalHours: 0,
    timeCostAud: 0,
    lastActivityAt: null
  },

  createdAt, updatedAt, archivedAt
}
```

**A published portfolio entry is a project, not a product.** A product may have several published projects under it. This is deliberate — a visitor understands "FusionSite360XR Web" faster than a product group containing web, mobile and XR builds. A product-level landing page may come later; it is not in this model.

---

### `projects.portfolio`

Everything the public site renders about a project. Authored in the portal, snapshotted on publish.

```js
portfolio: {
  visibility: "private",        // "private" | "client-only" | "public"
  featured: false,
  sortOrder: 0,

  // --- header ---
  category: "XR / Web Platform",   // the chip above the title
  tagline: "XR Digital Twin Platform for AECO & Energy",
  overview: "",                    // one paragraph under the tagline
  liveUrl: null,                   // "Visit Platform" target — authored, not derived

  // --- body sections; each hides entirely when empty ---
  featureCards: [                  // "Built for Complex Projects"
    { iconKey: "cube", title: "Immersive 3D / XR", body: "" }
  ],
  keyModules: [                    // "Key Modules"
    { title: "3D Model Viewer", body: "" }
  ],
  headlineMetric: { value: "40%", label: "Faster Decision Making" } | null,
  testimonial: { quote: "", attribution: "" } | null,

  demoVideo: {
    provider: "blob",              // "blob" | "youtube" | "vimeo"
    assetId: null,                 // required when provider is "blob"
    externalId: null,              // required when provider is "youtube" | "vimeo"
    posterAssetId: null            // REQUIRED for every provider
  } | null,

  caseStudies: [
    {
      slug: "offshore-platform",   // unique within this project
      sector: "Oil & Gas",
      title: "Offshore Platform Project",
      summary: "",                 // the card blurb on the carousel
      heroAssetId: null,
      problem: "", role: "", approach: "", outcome: "",
      metrics: [{ label: "", value: "" }],
      testimonial: { quote: "", attribution: "" } | null,
      sortOrder: 0
    }
  ],

  // --- reference data ---
  techStackKeys: ["react", "threejs", "webxr", "nodejs", "mongodb", "azure"],
  platformKeys: ["web", "desktop", "vr", "mobile"],
  appIconMediaKey: null,           // → mediaLibrary.key, kind "app"; the project's own icon

  // --- media ---
  heroAssetId: null,
  ogAssetId: null,                 // 1200x630; falls back to heroAssetId if null
  publishedAt: null
}
```

**Notes.**

`liveUrl` is authored rather than read from the primary environment's `publicUrl`, because the "Visit Platform" target and the deployed app URL are not always the same thing — one may be a marketing page.

`featureCards` and `keyModules` are optional. A thin project renders without those sections rather than rendering an empty heading. The same applies to `headlineMetric`, `testimonial`, `demoVideo` and `caseStudies`.

`caseStudies` replaces the single `caseStudy` object from v0.1. `problem`, `role`, `approach` and `outcome` now live on each case study, not on the project. The project-level narrative is `tagline` + `overview` + `featureCards` + `keyModules`.

`caseStudies[].slug` is unique **within a project**, not globally. The eventual route is `/work/:projectSlug/case/:caseSlug`. Case study routes are not built yet; until they are, the carousel cards render without links.

`techStackKeys` and `platformKeys` reference `mediaLibrary.key`. They are keys, not labels — the label and the icon come from the library so one edit updates every project.

---

### `mediaLibrary`

Reusable marks, managed once in the portal instead of re-uploaded per project.

```js
{
  _id,
  kind,                         // "tech" | "platform" | "client" | "social" | "app"
  key: "react",                 // stable, lowercase, referenced from projects and siteContent
  label: "React",
  svg: "<svg viewBox=…>…</svg>",// inline markup, sanitised server-side on write
  blobUrl: null,                // alternative to svg for raster marks
  usageApproved: true,          // false blocks it from every published surface
  sortOrder: 0,
  createdAt, updatedAt
}
```

**Why inline SVG rather than a blob URL.** These render at 24–40px in grids of five to eleven. Inline markup costs no request, scales cleanly, and inherits `currentColor`, so one asset works on a light and a dark surface without a second file. `blobUrl` exists for marks only available as raster.

**`svg` is markup entering a public page.** It is sanitised server-side on write — no `<script>`, no `on*` attributes, no external `href` or `xlink:href`. This is a write-time gate, not a render-time one.

**`usageApproved`** is the trademark gate. Brand marks used for "built with" attribution are fine; a client's mark is not, without permission. `false` means the mark never reaches a published surface — the publish action drops it silently rather than failing, and the portal shows why.

Seed `kind: "platform"` with `web`, `desktop`, `vr`, `mobile`, `tablet`. Seed `kind: "social"` with `github`, `linkedin`, `email`.

`kind: "app"` is a project's own icon, as it appears on a phone's home screen. A project points at one through `portfolio.appIconMediaKey`, and it is what the landing page's app shelf draws.

---

### `accounts`
```js
{
  _id, vendor,                  // "azure" | "mongodb-atlas" | "vercel" | "render" |
                                // "auth0" | "stripe" | "anthropic" | "openai" |
                                // "apple" | "google-play" | "namecheap" | "other"
  label: "Teczo Dev (Azure)",
  loginEmail: "teczodevelopment@gmail.com",
  accountRef: "sub-id / org-id / team-slug",
  isPrimary: false,             // flags your secondary test accounts
  billingOwner: "Teczo Pty Ltd",
  notes,
  createdAt, updatedAt
}
```

---

### `environments`
```js
{
  _id, projectId,
  name,                         // "dev" | "staging" | "production"
  branch: "main",
  publicUrl: "https://holoxr.onrender.com",
  isPrimary: true,              // the one shown on the project card
  healthCheckUrl: null,
  createdAt, updatedAt
}
```

`publicUrl` is operational. It is never snapshotted and never reaches the portfolio — the public "Visit Platform" link is `portfolio.liveUrl`.

---

### `services`
```js
{
  _id, projectId, environmentId,
  role,                         // "frontend" | "backend" | "database" | "storage" |
                                // "auth" | "ai" | "email" | "payments" | "domain" | "other"
  vendor,                       // matches accounts.vendor
  accountId,                    // → accounts
  resourceName: "holoxr-api",
  region: "australiaeast",
  url,
  plan: "B1",
  status: "active",             // "active" | "suspended" | "deleted"
  externalRef: "/subscriptions/.../sites/holoxr-api",  // for cost API matching
  createdAt, updatedAt
}
```

`externalRef` is how an Azure cost line gets attributed to the right project automatically.

---

### `projectLinks`
```js
{
  _id,
  fromProjectId, toProjectId,
  type,                         // "component-of" | "depends-on" | "shares-backend" | "related"
  note: "Explorer App calls the Expedition API",
  createdAt
}
```

---

### `features`
```js
{
  _id, projectId,
  ref: "HOLO-014",
  title, description,
  acceptanceCriteria: "",

  status,                       // "backlog" | "todo" | "in-progress" | "blocked" | "review" | "done"
  priority,                     // "low" | "medium" | "high" | "critical"
  size,                         // "xs" | "s" | "m" | "l" | "xl"
  order: 1000,                  // manual sort within a column (gaps of 1000)

  assigneeUserId: null,
  labels: ["frontend", "auth"],
  dependsOnFeatureIds: [],

  branch: null,
  prUrl: null,
  completedAt: null,
  blockedReason: null,

  source: "manual",             // "manual" | "csv" | "repo-sync"
  externalKey: null,
  createdAt, updatedAt
}
```

**CSV template columns:** `ref, title, description, acceptanceCriteria, status, priority, size, labels, dependsOn`
Import rule: match on `ref` within the project → update; no match → insert. Never delete on import. Show a diff preview before commit.

---

### `costs`
```js
{
  _id, projectId, serviceId,    // serviceId optional — some costs are project-wide
  accountId, vendor,
  description: "Azure App Service B1",
  amount: 18.50,
  currency: "AUD",
  amountAud: 18.50,             // converted at entry; store fxRate if not AUD
  fxRate: null,
  billingCycle,                 // "monthly" | "annual" | "one-off" | "usage"
  periodStart, periodEnd,
  source: "manual",             // "manual" | "azure-api" | "atlas-api" | "stripe"
  externalId: null,
  createdAt, updatedAt
}
```

Run-rate rule: monthly + annual/12. One-off and usage excluded.

---

### `assets`
```js
{
  _id, projectId, featureId: null,
  kind,                         // "screenshot" | "video" | "logo" | "diagram" | "document"
  blobName, blobUrl,            // private container — read requires a SAS token
  thumbnailUrl,
  filename, mimeType, sizeBytes,
  width, height, durationSec,

  variants: {                   // written at upload; null for video and document
    thumb: { blobName, url, width: 400 },
    card:  { blobName, url, width: 800 },
    hero:  { blobName, url, width: 1600 }
  },

  publicBlobName: null,         // set when copied to the public container on publish
  publicBlobUrl: null,          // stable, cacheable, no SAS token
  publicVariants: null,         // same shape as variants, public URLs

  title, caption, altText,
  device: "iPhone 15 Pro",
  visibility: "private",        // "private" | "client-only" | "public"
  sortOrder: 0,
  capturedAt, uploadedByUserId, createdAt, updatedAt
}
```

**Rule:** an asset is publishable only if `asset.visibility === "public"` **and** `project.portfolio.visibility === "public"` **and** `product.ndaRestricted === false`. Three gates, all must pass. Implemented once in `packages/shared/src/publish.ts`.

**Variants** are generated at upload from the original, at 400 / 800 / 1600px wide, in WebP with the original format as a fallback. The portfolio picks a variant per surface: `thumb` for the thumbnail strip and tech grids, `card` for carousel and index cards, `hero` for the main image. Serving a 2400px original into a 135px slot is the single largest performance loss available on this site.

**`publicBlobUrl` and `publicVariants` are null until the project is published.** The publish action copies the blob into the public container; unpublishing deletes the copies and nulls the fields. A SAS-signed URL never appears in `publishedProjects` — see "Publishing".

---

### `notes`
```js
{
  _id,
  projectId: null,              // one of projectId or enquiryId is set
  featureId: null,
  enquiryId: null,
  body,                         // markdown
  kind: "note",                 // "note" | "meeting" | "idea" | "issue" | "follow-up"
  visibility: "private",
  pinned: false,
  authorUserId, createdAt, updatedAt
}
```

Enquiry follow-ups reuse this collection rather than getting their own. A note carries exactly one of `projectId` or `enquiryId`.

---

### `credentials`
Registry only. **No secret values ever stored here.**

```js
{
  _id, projectId, serviceId: null, accountId,
  label: "SWMS Claude API key",
  kind,                         // "api-key" | "certificate" | "domain" | "subscription" | "signing-key"
  storedIn: "Azure Key Vault / 1Password / Render env",
  expiresAt: ISODate("2026-11-01"),
  renewalCostAud: 149,
  alertDaysBefore: 30,
  lastRotatedAt, notes,
  createdAt, updatedAt
}
```

---

### `decisions`
```js
{
  _id, projectId,
  title: "MongoDB Atlas over Postgres",
  context, decision, alternativesRejected,
  status: "accepted",           // "proposed" | "accepted" | "superseded"
  supersededByDecisionId: null,
  decidedAt, authorUserId, createdAt
}
```

---

### `timeEntries`
```js
{
  _id, projectId, featureId: null, userId,
  date: ISODate("2026-08-18"),  // day granularity — no start/stop timer
  hours: 2.5,
  activity,                     // "build" | "debug" | "design" | "meeting" | "research" | "admin"
  note,
  rateAud: 0,                   // snapshot of user rate at entry; 0 = uncosted
  billable: false,
  createdAt, updatedAt
}
```

`timeCostAud` stays out of the Net figure by default.

---

### `siteContent`

The portfolio's own copy. Draft/published split so changing a sentence never requires a deploy.

```js
{
  _id,
  key,                          // "landing" | "about" | "contact" | "skills"
  draft:     { body: "", data: {} },
  published: { body: "", data: {} } | null,
  publishedAt: null,
  updatedByUserId, createdAt, updatedAt
}
```

`body` is markdown, rendered with `react-markdown` + `rehype-sanitize`. `data` is structured and validated against a per-key schema in `packages/shared/src/schemas/siteContent/`. Markdown alone cannot express a hero with an accent-coloured name, a social row and a CTA label — that is what `data` is for.

**`data` by key:**

```js
// landing
{
  greeting: "Hi, I'm",
  name: "Jayagaren",
  statement: "I build apps that solve real-world problems",
  disciplines: ["Mobile", "Web", "XR", "AI"],
  badge: { title: "CODE. BUILD. SOLVE.", body: "Shipping digital solutions that matter." },
  terminalLines: ["developer@teczo:~$ whoami", "jayagaren"],
  codePanel: { tabs: ["App.jsx", "Scene.tsx"], code: "" },
  statusRows: [{ label: "BUILD", value: "READY" }],
  socials: [{ mediaKey: "github", url: "" }],
  ctaLabel: "Let's build something great",
  featuredIntro: "Selected products and platforms I've built.",
  featuredLimit: 6
}

// about
{ headline: "", portraitAssetId: null }   // narrative lives in body

// skills
{
  groups: [
    { label: "Frontend", items: [{ mediaKey: "react", label: "React" }] }
  ]
}

// contact
{ headline: "", intro: "", email: "", socials: [{ mediaKey: "linkedin", url: "" }] }
```

Skills carries no proficiency level, years, or per-item prose. It is icon and label, grouped. `mediaKey` references `mediaLibrary.key` — the same library the tech grids use.

`terminalLines` is decorative and hidden below `md`. `codePanel` and `statusRows`
are the rail beside it — also decorative, and hidden below `lg`.

`statusRows` is written, not measured. Nothing in Wroom watches a build or a
machine, and the public site is the wrong place for it to start: the rows say
whatever was typed until somebody types something else.

**`published.data` carries one field the draft does not: `marks`.**

```js
// siteContent.published.data, on landing / contact / skills
marks: [{ key: "github", label: "GitHub", svg: "<svg …>" }]
```

The portfolio may not read `mediaLibrary`, so a `mediaKey` has to arrive already
resolved or it arrives as a string nobody can draw. The publish action collects
every key the page names, resolves it through the same `resolveMarks` a project's
tech stack uses, and writes the result here — dropping anything with
`usageApproved: false` silently, exactly as a project publish does.

It is server-owned: `PATCH /api/content/:key` strips `marks` from the body, so
the only markup that reaches a published page comes from a `mediaLibrary` record
the API sanitised on write. Resolution is frozen at publish — editing a mark in
the library changes the live page only when the page is published again.

---

### `enquiries`

Inbound contact from the one public write in the system.

```js
{
  _id,
  name, email, message,         // all required strings
  company: null, phone: null,
  relatedProjectId: null,       // validated against an in-memory cache, not a query

  status: "new",                // "new" | "read" | "replied" | "qualified" | "won" | "lost" | "spam"
  source: "portfolio-contact",  // set server-side
  ownerUserId: null,            // assigned in the portal
  convertedToProductId: null,   // set when an enquiry becomes work

  meta: {                       // set server-side, never from the body
    ip, userAgent, submittedAt, timeToSubmitMs, referrer
  },

  createdAt, updatedAt
}
```

`status`, `source`, `ownerUserId`, `convertedToProductId`, `meta` and both timestamps are **set server-side and stripped from the body if present**. The full write chain is specified in `CLAUDE.md` §8 and any change to it is a ticket.

Follow-up notes live in `notes` with `enquiryId` set. There is no `clients` collection — an enquiry that becomes work points at a product via `convertedToProductId`.

---

### `publishedProjects`

The flattened snapshot. This is the **only** project data the portfolio reads.

```js
{
  _id, projectId, slug,
  name, productName,
  category, tagline, overview, shortDescription,
  liveUrl,

  featureCards: [{ icon: { svg, label }, title, body }],
  keyModules:   [{ title, body }],
  headlineMetric: { value, label } | null,
  testimonial: { quote, attribution } | null,

  demoVideo: {
    provider, url, externalId,
    poster: { url, alt, variants: { thumb, card, hero } }
  } | null,

  caseStudies: [{
    slug, sector, title, summary,
    hero: { url, alt, variants },
    problem, role, approach, outcome,
    metrics: [{ label, value }],
    testimonial, sortOrder
  }],

  techStack: [{ key, label, svg }],     // resolved from mediaLibrary at publish
  platforms: [{ key, label, svg }],
  appIcon: { key, label, svg } | null,  // the landing page's app shelf
  clientLogo: { label, svg } | null,    // only when usageApproved

  heroImage: { url, alt, variants: { thumb, card, hero } },
  ogImage:   { url, width: 1200, height: 630 },
  gallery: [{ url, variants, caption, kind, device, alt }],

  status: "live",
  startedAt, launchedAt,
  featured: false, sortOrder,
  publishedAt, publishedByUserId
}
```

**Every `url` here is a public-container URL with no SAS token.** No account email, no cost figure, no environment URL, no operational collection reference. Icons are resolved to inline `svg` at publish time so the public site makes no library lookup.

---

## v2 collections (shape them now, build later)

### `revenue`
```js
{
  _id, projectId,
  source: "stripe",             // "stripe" | "invoice" | "manual"
  externalId: "in_1P...",
  customerRef, description,
  amount, currency, amountAud,
  paid: true, paidAt, dueAt,
  periodStart, periodEnd,
  createdAt, updatedAt
}
```

### `vendorConnections`
```js
{
  _id, vendor, accountId,
  authType: "service-principal", // "service-principal" | "api-key" | "oauth"
  secretRef: "kv://teczo/azure-cost-sp",  // pointer, not the secret
  scope: { subscriptionId, orgId, teamId },
  syncEnabled: false,
  lastSyncAt, lastSyncStatus, lastSyncError,
  createdAt, updatedAt
}
```

### `deployments`
```js
{
  _id, projectId, environmentId,
  version: "v1.4.0", commitSha, commitMessage,
  triggeredBy, status: "success",
  deployedAt, durationSec, releaseNotes, createdAt
}
```

### `memberships`
```js
{
  _id, userId, projectId,
  role,                         // "owner" | "developer" | "viewer"
  invitedByUserId, acceptedAt, createdAt
}
```

### `auditLog`
```js
{
  _id, userId, action: "project.update",
  entityType, entityId,
  before: {}, after: {},
  ip, userAgent, createdAt
}
```

---

## Publishing — how the portfolio stays safe

The portfolio does **not** query `projects`. Publishing is an explicit action that does four things, in order:

1. **Runs the three gates** via `packages/shared/src/publish.ts`. Fails closed.
2. **Copies every publishable blob** — hero, OG, gallery, video poster, case study heroes, and all their variants — from the private container into the public container. Sets `publicBlobName`, `publicBlobUrl` and `publicVariants` on each asset.
3. **Resolves `techStackKeys`, `platformKeys` and `clientMediaKey`** against `mediaLibrary`, dropping anything with `usageApproved: false`.
4. **Writes the flattened `publishedProjects` document** using public URLs only.

**Unpublishing reverses step 2 before step 4.** Deleting the snapshot row without deleting the blob copies leaves a public, permanently cacheable URL for content that is no longer published. The blob delete is the operation that actually revokes access.

### Why two containers

Read access to a private container needs a SAS token, which puts the token in the query string. The URL then changes on every request, so the browser cache misses, any CDN misses, and each image needs an API round-trip before it can start loading. A product page carries roughly twenty images. That is twenty signatures and twenty cold downloads on every visit.

The public container holds only what has already passed the three gates. The gate runs once, at publish, rather than on every request — the same reasoning that produced the snapshot in the first place.

Container names come from `AZURE_STORAGE_CONTAINER` and `AZURE_STORAGE_PUBLIC_CONTAINER`.

### Route namespaces

- `/api/*` — authenticated, full model
- `/public/*` — unauthenticated, closed allowlist in `CLAUDE.md` §6

A bug in the public API cannot leak a client project, a cost figure, or an account email, because the public routes read three things and one of them is write-only.

---

## Indexes worth creating on day one

```
projects:        { productId: 1 }, { status: 1 }, { slug: 1 } unique,
                 { "portfolio.visibility": 1 }
features:        { projectId: 1, status: 1, order: 1 },
                 { projectId: 1, ref: 1 } unique
costs:           { projectId: 1, periodStart: -1 },
                 { vendor: 1, externalId: 1 } unique, partial on externalId being a string
services:        { projectId: 1, environmentId: 1 }, { accountId: 1 }
assets:          { projectId: 1, visibility: 1, sortOrder: 1 }
mediaLibrary:    { key: 1 } unique, { kind: 1, sortOrder: 1 }
notes:           { projectId: 1, pinned: -1, createdAt: -1 },
                 { enquiryId: 1, createdAt: -1 }
credentials:     { expiresAt: 1 }
siteContent:     { key: 1 } unique
enquiries:       { status: 1, createdAt: -1 }, { convertedToProductId: 1 },
                 { "meta.ip": 1, createdAt: -1 }
revenue:         { projectId: 1 }, { source: 1, externalId: 1 } unique partial
projectLinks:    { fromProjectId: 1 }, { toProjectId: 1 }
publishedProjects: { slug: 1 } unique, { featured: -1, sortOrder: 1 }
```

The unique indexes on `externalId` are what make cost and revenue sync safely re-runnable.

They must be **partial**, not sparse. On a compound index `sparse` only skips a document when every indexed field is missing; `vendor` (or `source`) is always present, so a sparse index treats `externalId: null` as a value and permits only one manually entered row per vendor. Filtering on `externalId` being a string indexes exactly the synced rows the guarantee is about, and leaves manual entry unconstrained.

`enquiries` on `{ "meta.ip": 1, createdAt: -1 }` backs the per-IP daily cap. It is the one index the public write path depends on.

---

## Resolved decisions

1. **Mobile counterparts are separate projects**, linked `component-of` to the same product. Own repo, own stack, own lifecycle.
2. **All money stored in AUD**, converted at entry. `fxRate` recorded when the source wasn't AUD.
3. **Time tracking in v1** — `timeEntries`, day granularity, rate snapshotted per entry.
4. **No clients collection.** `isClientWork` + `clientName` on `products`. Inbound contact is `enquiries`, closing with `convertedToProductId`.
5. **The database is the source of truth**, `FEATURES.yaml` is a hand-maintained ledger (see `CLAUDE.md` §9).
6. **A published entry is a project.** Products group projects internally; they do not have their own public page.
7. **Case studies belong to a project**, many per project, slug unique within the project.
8. **Published media lives in a second, public container.** The gate runs at publish, not per request.
9. **Icons are data**, not code. `mediaLibrary` is edited in the portal; no icon library is installed.
