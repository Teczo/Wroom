# Teczo Dev Portal + Portfolio — Data Model (draft v0.1)

**Stack assumed:** MongoDB Atlas · Express 5 / Node · React + Vite + Tailwind · Azure App Service (backend) · Render or Vercel (frontends) · Azure Blob (media) · Auth0 · Stripe · Claude API

**Two frontends, one backend, one database.** The portfolio never reads the operational collections — it reads only `publishedProjects`. See "Publishing" at the end.

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
| `notes` | Free notes per project | v1 |
| `credentials` | Where a key lives + when it expires (never the key) | v1 |
| `decisions` | ADR-lite | v1 |
| `timeEntries` | Hours logged per project/feature | v1 |
| `revenue` | Money in, Stripe-synced or manual | v2 |
| `vendorConnections` | API creds for cost/revenue sync | v2 |
| `deployments` | Release history from GitHub | v2 |
| `publishedProjects` | Portfolio snapshot | v2 |
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
`globalRole` is enough for v1 (just you). Per-project access moves to `memberships` in v2 without changing this shape.

---

### `projectTypes`
This is what makes the "first question: what type of project is this?" work without a code change every time you add a type.

```js
{
  _id, key,                     // "web" | "mobile-rn" | "unity" | "api" | "xr" | "desktop"
  label, icon, sortOrder, active: true,

  // Fields rendered on top of the shared project fields
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

  // Which service roles this type expects — drives env setup prompts
  expectedServiceRoles: ["backend", "database", "storage"],

  defaultTechStack: { frontend: [], backend: [] }
}
```

Seed with: `web`, `mobile-rn`, `unity`, `api`, `xr`, `internal-tool`.

---

### `products`
Your product groups. FusionSite360XR, Brewpass, Explorers, LOCUM, VoxForm, Vaanam, HoloXR, Vynaa AI, MindApp, SWMS.

```js
{
  _id, name, slug, description,
  isClientWork: false,          // no clients collection — a flag is enough
  clientName: null,             // free text, display only
  ndaRestricted: false,         // blocks portfolio publishing for all children
  status,                       // "active" | "paused" | "archived"
  createdAt, updatedAt
}
```

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

  techStack: {
    frontend: ["React", "Vite", "Tailwind CSS"],
    backend: ["Express 5", "Node.js"],
    database: ["MongoDB Atlas"],
    other: ["Auth0", "Claude API"]
  },

  details: { /* validated against projectTypes.fieldDefs */ },

  tags: ["xr", "bim"],

  // Option B — DB is the editing surface, git is the durable record
  featuresExport: {
    repoPath: "FEATURES.yaml",
    lastExportedAt: null,
    exportVersion: 0,           // increments each export; written into the file header
    offlineEditsDetected: false // set on import if the file's header says offlineEdits: true
  },

  portfolio: {
    visibility: "private",      // "private" | "client-only" | "public"
    featured: false,
    caseStudy: {
      problem: "", role: "", approach: "",
      outcome: "", metrics: [{ label, value }],
      testimonial: { quote, attribution } | null
    },
    heroAssetId: null,
    publishedAt: null
  },

  // denormalised, recomputed on write — cheap dashboard reads
  rollup: {
    featureCounts: { backlog: 0, todo: 0, inProgress: 0, blocked: 0, done: 0 },
    percentComplete: 0,
    monthlyCostAud: 0,
    totalSpendAud: 0,
    totalRevenueAud: 0,
    totalHours: 0,
    timeCostAud: 0,             // hours × rate; excluded from Net unless you opt in
    lastActivityAt: null
  },

  createdAt, updatedAt, archivedAt
}
```

**Note:** `portfolio.visibility` defaults to `private`. Nothing is ever public by accident.

---

### `accounts`
Your recurring pain point — "which account is this on, and is it my secondary?"

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

Seed from your Infrastructure sheet: `teczodevelopment@`, `testingjaya26@`, `admin@teczo.co`, `winarmstudios@`, `testingjaya7@`.

---

### `environments`
One project has several. This is the fix for the flattened Infrastructure sheet.

```js
{
  _id, projectId,
  name,                         // "dev" | "staging" | "production"
  branch: "main",
  publicUrl: "https://holoxr.onrender.com",
  isPrimary: true,              // the one shown on the project card
  healthCheckUrl: null,         // used by uptime monitoring in v3
  createdAt, updatedAt
}
```

---

### `services`
A single hosted thing inside an environment. This replaces the "Frontend Hosting / Backend Hosting / MongoDB Account" columns and stops them going stale.

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

`externalRef` matters — it's how an Azure cost line gets attributed to the right project automatically.

---

### `projectLinks`
Two edge types, as discussed.

```js
{
  _id,
  fromProjectId, toProjectId,
  type,                         // "component-of" | "depends-on" | "shares-backend" | "related"
  note: "Explorer App calls the Expedition API",
  createdAt
}
```

Query "what breaks if I kill this?" = all links where `toProjectId = X` and `type = depends-on`.

---

### `features`
Your Kanban board and the CSV import target.

```js
{
  _id, projectId,
  ref: "HOLO-014",              // human-readable, used in branch names and PR titles
  title, description,
  acceptanceCriteria: "",       // one or two lines — becomes the ticket exit criteria

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
  externalKey: null,            // dedupe key for re-imports
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
  externalId: null,             // idempotency key for API sync
  createdAt, updatedAt
}
```

Run-rate rule (same as your workbook): monthly + annual/12. One-off and usage excluded.

---

### `assets`
```js
{
  _id, projectId, featureId: null,
  kind,                         // "screenshot" | "video" | "logo" | "diagram" | "document"
  blobUrl, thumbnailUrl,
  filename, mimeType, sizeBytes,
  width, height, durationSec,

  title, caption, altText,
  device: "iPhone 15 Pro",      // useful for portfolio device framing
  visibility: "private",        // "private" | "client-only" | "public"
  sortOrder: 0,
  capturedAt, uploadedByUserId, createdAt
}
```

**Rule:** an asset is publishable only if `asset.visibility === "public"` **and** `project.portfolio.visibility === "public"` **and** `product.ndaRestricted === false`. Three gates, all must pass.

---

### `notes`
```js
{
  _id, projectId, featureId: null,
  body,                         // markdown
  kind: "note",                 // "note" | "meeting" | "idea" | "issue"
  visibility: "private",
  pinned: false,
  authorUserId, createdAt, updatedAt
}
```

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

One indexed query on `expiresAt` drives a "expiring soon" dashboard panel. This is where your SWMS API-key note belongs.

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
  date: ISODate("2026-08-18"),  // day granularity — avoids a start/stop timer UI
  hours: 2.5,
  activity,                     // "build" | "debug" | "design" | "meeting" | "research" | "admin"
  note,
  rateAud: 0,                   // snapshot of user rate at entry; 0 = uncosted
  billable: false,
  createdAt, updatedAt
}
```

Day-granularity entries with a rate snapshot. Two reasons: a timer UI is a project of its own and you won't use it, and snapshotting the rate means changing your rate later doesn't silently rewrite history.

`timeCostAud` stays out of the Net figure by default — you want "am I burning money on hosting" separate from "what would this have cost a client".

---

## v2 collections (shape them now, build later)

### `revenue`
```js
{
  _id, projectId,
  source: "stripe",             // "stripe" | "invoice" | "manual"
  externalId: "in_1P...",       // Stripe invoice/charge id — idempotency
  customerRef, description,
  amount, currency, amountAud,
  paid: true, paidAt, dueAt,
  periodStart, periodEnd,
  createdAt
}
```

### `vendorConnections`
```js
{
  _id, vendor, accountId,
  authType: "service-principal", // "service-principal" | "api-key" | "oauth"
  secretRef: "kv://teczo/azure-cost-sp",  // pointer, not the secret
  scope: { subscriptionId, orgId, teamId },
  syncEnabled: true,
  lastSyncAt, lastSyncStatus, lastSyncError,
  createdAt, updatedAt
}
```

Realistic coverage: **Azure Cost Management** and **Stripe** work well. **Atlas** invoices API works. **Vercel** partial. **Render** thin. Build manual entry first; treat sync as an enhancement per vendor.

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
No client role for now. If you later want to give a client read-only progress, add `"client"` to this enum plus a permission rule hiding costs, revenue and accounts — the `visibility` fields on assets already support it.

### `auditLog`
```js
{
  _id, userId, action: "project.update",
  entityType, entityId,
  before: {}, after: {},        // changed fields only
  ip, userAgent, createdAt
}
```

---

## Publishing — how the portfolio stays safe

The portfolio does **not** query `projects`. Publishing writes a flattened snapshot:

```js
// publishedProjects
{
  _id, projectId, slug,
  name, shortDescription, productName,
  caseStudy: { problem, role, approach, outcome, metrics, testimonial },
  techStack: [],                // flattened labels only, no accounts or URLs
  liveUrl, platforms: [],
  heroImage: { url, alt },
  gallery: [{ url, thumbnailUrl, caption, kind, device }],
  status: "live",
  startedAt, launchedAt,
  featured: false,
  sortOrder,
  publishedAt, publishedByUserId
}
```

Backend routes split by namespace:
- `/api/*` — authenticated, full model
- `/public/*` — unauthenticated, reads `publishedProjects` **only**, no other collection

That single rule means a bug in the public API cannot leak a client project, a cost figure, or an account email. Regenerate the snapshot on an explicit "Publish" action, not on save.

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
credentials:     { expiresAt: 1 }
revenue:         { projectId: 1 }, { source: 1, externalId: 1 } unique sparse
projectLinks:    { fromProjectId: 1 }, { toProjectId: 1 }
publishedProjects: { slug: 1 } unique, { featured: -1, sortOrder: 1 }
```

The unique indexes on `externalId` are what make cost and revenue sync safely re-runnable.

They must be **partial**, not sparse. On a compound index `sparse` only skips a
document when every indexed field is missing; `vendor` (or `source`) is always
present, so a sparse index treats `externalId: null` as a value and permits only
one manually entered row per vendor. Filtering on `externalId` being a string
indexes exactly the synced rows the guarantee is about, and leaves manual entry
unconstrained. `revenue` must do the same when it is built.

---

## Resolved decisions

1. **Mobile counterparts are separate projects**, linked `component-of` to the same product. Own repo, own stack, own lifecycle.
2. **All money stored in AUD**, converted at entry. `fxRate` recorded when the source wasn't AUD.
3. **Time tracking included in v1** — `timeEntries`, day granularity, rate snapshotted per entry.
4. **No clients collection.** `isClientWork` + `clientName` on `products` is enough. No client role.
5. **Option B: the database is the source of truth**, `FEATURES.yaml` is an export.

---

## The Option B sync contract

Wroom is where you edit. Git is what survives.

**Export** — Wroom writes `FEATURES.yaml` to the repo on: the "generate ticket" action, a manual Export button, and a nightly job across all connected repos.

```yaml
# FEATURES.yaml — generated by Wroom. Do not hand-edit unless in offline mode.
source: wroom
project: holoxr-web
exportedAt: 2026-08-18T09:14:00Z
exportVersion: 47
offlineEdits: false
features:
  - ref: HOLO-014
    title: Lesson progress tracking
    status: in-progress
    priority: high
    acceptance: Progress persists per user per lesson; visible on lesson card.
    branch: feat/HOLO-014-progress
```

**Normal mode rule in CLAUDE.md** — never edit `FEATURES.yaml`; report what changed in `CHANGELOG.md` in plain language.

**Offline mode** — when Wroom is unreachable and you say so in the prompt, Claude Code may set `status` and `completedAt`, and must flip `offlineEdits: true` in the header.

**Import back** — same match-on-`ref`, update-or-insert, never-delete logic as the CSV importer, with a diff preview. `offlineEdits: true` makes Wroom surface the reconciliation instead of silently overwriting.

**Drift ceiling:** one session, because export is coupled to ticket generation.

**Backup property:** every connected repo holds a git-tracked ledger and changelog. Losing the Wroom database loses the editing surface, not the history.
