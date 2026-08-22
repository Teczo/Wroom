# Wroom

A development war room. Two frontends, one backend, one database.

Wroom is where Teczo's projects are run and where the public showcase of that
work comes from. The **portal** is the private management app — projects,
infrastructure, costs, features, time, media and inbound enquiries. The
**portfolio** is the public site, built from a published snapshot of that same
data. It never reads the operational collections.

| App | Who uses it | Auth | Local port |
|---|---|---|---|
| **Portal** (`apps/portal`) | Jaya and the Teczo team | Auth0, required | 5173 |
| **Portfolio** (`apps/portfolio`) | Public — clients, employers | None | 5174 |
| **API** (`apps/api`) | Both frontends | Split by route namespace | 4000 |

---

## Stack

**Frontend** — React 18, Vite, Tailwind CSS v4 (via `@tailwindcss/vite`, no
config file — tokens live in each app's `src/index.css` under `@theme`), React
Router, TanStack Query for server state.

**Backend** — Node 24, Express 5, Mongoose. REST.

**Database** — MongoDB Atlas. **Auth** — Auth0, portal only. **Storage** —
Azure Blob Storage. **Hosting** — frontends on Vercel, API on Azure App
Service.

Request bodies are validated by a hand-rolled validator in
`packages/shared/src/validate.ts` against the schemas in
`packages/shared/src/schemas/`. There is no validation library, and
`packages/shared` has zero dependencies by design.

The stack is locked. `CLAUDE.md` §3 lists what is deliberately not used and why.

---

## Repo layout

```
/apps
  /api          Express 5 backend
  /portal       React — authenticated management app
  /portfolio    React — public showcase
/packages
  /shared       Types, constants, validation schemas, publish gates, run-rate maths
/docs
  DATA_MODEL.md   Authoritative schema
  ENV_SETUP.md    One-time guide to obtaining credentials
CLAUDE.md         How work is done in this repo
FEATURES.yaml     Feature ledger — maintained by hand
CHANGELOG.md      Honest history, one entry per session
```

Inside `apps/api/src`: `config` (env, db), `models` (one file per collection),
`routes`, `controllers` (thin — validate, call a service, shape a response),
`services` (all business logic), `middleware`, `jobs`, `utils`.

Inside each frontend `src`: `pages` (one folder per route), `components`,
`features` (feature-scoped components and hooks), `lib` (the single API
client), and in the portal, `providers`.

Anything used by both apps belongs in `packages/shared` — publish gates
(`publish.ts`), run-rate maths (`runRate.ts`) and the feature CSV template
(`featureCsvTemplate.ts`) already live there.

---

## Running locally

```bash
npm install                                      # workspace root

npm run dev:api                                  # http://localhost:4000
npm run dev:portal                               # http://localhost:5173
npm run dev:portfolio                            # http://localhost:5174
```

Each app has its own `.env`, copied from its `.env.example` and gitignored.
`docs/ENV_SETUP.md` walks through obtaining the values. Only
`apps/api/src/config/env.ts` reads `process.env`.

On a fresh environment, run these once:

```bash
npm run seed --workspace @wroom/api              # project types
npm run ensure-indexes --workspace @wroom/api    # additive; safe to re-run
```

Production does not build indexes on start-up, by design — until
`ensure-indexes` has run, every query reads the whole collection. It only adds
what is missing and never removes an index.

### Checks

```bash
npm run lint
npm run typecheck
npm run build
```

All three must pass in every app touched. There are no automated tests in this
repo — see `CLAUDE.md` §12.

---

## The API

Two namespaces, and the split is a security boundary.

**`/api/*`** — Auth0 JWT required, applied at the router rather than per route.
Full access to all collections. Resources are plural and nested where they
belong: `/api/projects`, `/api/projects/:id/features`, plus `/api/products`,
`/api/accounts`, `/api/revenue`, `/api/integrations`, `/api/credentials`,
`/api/project-links`, `/api/notes`, `/api/decisions`, `/api/content`,
`/api/enquiries`, `/api/dashboard`, `/api/project-types` and
`/api/uploads/sas`.

**`/public/*`** — no auth. This is a closed allowlist, not a prohibition:

```
GET   /public/projects         → publishedProjects            (read)
GET   /public/projects/:slug   → publishedProjects            (read)
GET   /public/content/:key     → siteContent.published only   (read)
POST  /public/enquiries        → enquiries                    (write, reads nothing)
```

A `/public` handler may never query `projects`, `costs`, `revenue`, `accounts`,
`credentials`, `services`, `timeEntries` or `users`, and never returns the
`draft` half of a `siteContent` record. Adding a route here is an edit to
`CLAUDE.md` §6, not a decision made in a session.

`GET /health` sits outside both namespaces, is unauthenticated, and reports the
mongoose connection state only.

**Responses** are `{ data }` on success — with `{ meta: { total, page, limit } }`
on collections — and `{ error: { code, message, details } }` on failure, with a
real status code. Services throw typed errors; one middleware maps them to
responses.

`projects.rollup` is denormalised and recomputed in the service layer whenever a
feature, cost, revenue entry or time entry changes for that project.

---

## Security model

**The three publish gates.** An asset appears in the portfolio only if all three
are true:

1. `asset.visibility === "public"`
2. `project.portfolio.visibility === "public"`
3. `product.ndaRestricted === false`

This is implemented once, in `packages/shared/src/publish.ts`. Call
`checkPublishGates`, `isAssetPublishable` or `isProjectPublishable` — never
re-implement the comparison. The gate code fails closed: a missing product is
treated as NDA-restricted.

**Defaults are private.** New projects and assets are created private.
Publishing is an explicit action that writes `publishedProjects`.

**The `credentials` collection stores locations, never values.** `storedIn` is a
human-readable pointer like `"Azure Key Vault"`. The API refuses a body carrying
a key, token, password or connection string.

**Uploads** are validated for mime type and size server-side, and handed back a
short-lived SAS URL. The storage connection string never reaches a client.

**`POST /public/enquiries` is the only unauthenticated write in the system.**
Its middleware chain — body cap, rate limit, bot checks, schema validation — is
load-bearing: it validates the whole body against the shared schema (rejecting a
non-string where a string is expected, which is what closes NoSQL injection),
sets server-side fields itself, rate limits per IP, rejects honeypot and
implausibly-fast submissions, and reads no collection at all.

---

## Working in this repo

**Read `CLAUDE.md` first.** It is the constitution: the locked stack, the API and
frontend conventions, the security rules, and how a session starts and reports.

The short version:

- Build only what the prompt asks for. No adjacent improvements.
- Never add a dependency without asking.
- Never invent schema — `docs/DATA_MODEL.md` is authoritative.
- Never edit `FEATURES.yaml`. Its statuses are not reliable; the code is.
- Never commit a secret. `.env.example` holds names only.
- No mock data in committed code — an unbuilt endpoint means an empty state.
- Stop and report rather than retry.

Most work is a `now/short-description` branch straight from the prompt. Six
things need a ticket first — a schema change, a dependency, a new `/public`
route, a change to auth or the publish gates or the enquiry chain, a change to
money or rollup maths, and deleting or renaming something with callers. Size is
not the trigger; `CLAUDE.md` §2.2 has the list.

Every session appends to `CHANGELOG.md` under a dated heading, in plain language
— what a user can now do, not which files changed.
