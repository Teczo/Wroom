# CLAUDE.md — Wroom

This file is the **constitution** for this repo. It defines the stack, the rules, and how work is done here.

It does not contain the feature list. That lives in `FEATURES.yaml`, which Jaya maintains by hand (§9). Never plan work from either file — plan it from the prompt you were given.

---

## 1. What this is

**Wroom** is a development war room. Two frontends, one backend, one database.

| App | Who uses it | Auth |
|---|---|---|
| **Portal** (`apps/portal`) | Jaya and the Teczo team | Required |
| **Portfolio** (`apps/portfolio`) | Public — clients, employers | None |
| **API** (`apps/api`) | Both frontends | Split by route namespace |

The portal manages projects, infrastructure, costs, features, time, media and enquiries. The portfolio is a public showcase built from a **published snapshot** of that data — it never reads the operational collections.

The data model is specified in `docs/DATA_MODEL.md`. **That document is authoritative.** If a prompt seems to require a schema change, stop and report — do not invent collections or fields.

Wroom is built. The work now is changing, fixing and extending a running system, not standing one up.

---

## 2. Golden rules

These override anything else in this file.

1. **Build only what the prompt asks for.** No adjacent improvements, no "while I was in there". If you spot something worth doing, write it in the report — do not do it.
2. **Never add a dependency without asking.** Report what you want and why, then stop.
3. **Never edit `FEATURES.yaml`.** Not the status, not the ordering, not a new entry. There is no mode in which you may (§9).
4. **Never invent schema.** Fields and collections come from `docs/DATA_MODEL.md`.
5. **Never write a secret into the repo**, including `.env`, test fixtures, comments, or seed data. `.env.example` holds names only.
6. **Stop and report rather than retry.** If you're blocked, or a fix hasn't worked after two attempts, stop. Do not try a third approach, do not work around it, do not stub it out silently.
7. **No mock data in committed code.** If an endpoint isn't built yet, the frontend shows an empty state, not a fake array.

### 2.1 How work starts

**The default is: the prompt is the work order.** No ticket, no ref, no ceremony. Read it, build exactly what it says, report.

This covers most of what happens in this repo — UI changes, layout and copy, bug fixes, flow changes, new screens over data that already exists, new `/api` routes over collections that already exist.

**Branch** `now/short-description`. Commit and push. A PR is optional — say in your report that the branch is up.

**Report** in the short form:

```
CHANGED  — what is different now, in one sentence
CHECK    — the screen or URL to look at, so it can be confirmed on a phone
NOTICED  — anything worth doing later — do not do it now
```

Add the CHANGED line to `CHANGELOG.md` under today's dated heading.

### 2.2 When a ticket is required

**Stop and ask for a ticket** — build nothing — the moment the work turns out to need any of:

1. A change to `docs/DATA_MODEL.md` — a new collection, a new field, a changed type, a removed field
2. A new dependency, or a version bump of an existing one
3. A new route in `/public`, or any change to the `/public` allowlist in §6
4. A change to auth, the three publish gates, upload handling, or the enquiry intake chain
5. A change to any money, FX, run-rate or `projects.rollup` calculation
6. Deleting or renaming an existing collection, field, or route that has callers

These are the six places where a decision is permanent, invisible from the screen, or expensive to reverse. Everything else you just build.

The words are: *"This wants a ticket. Here is what the ticket would say."* Then stop. Do not build a smaller version of it instead.

**A ticket does not relax anything either.** Ticket or not, §3 (stack), §6 (API), §7 (frontend), §8 (security) and §10 (definition of done) apply unchanged. A ticket branch is `feat/WRM-014-short-description` and its report uses the long form in §11.

**`hotfix`** is the default mode with production broken. Same rules, plus: the smallest diff that stops the bleeding, branch `hotfix/short-description`, and the report must say whether the cause is fixed or only the symptom.

**Size is not a trigger.** A Tailwind class change across ten files is fine. A one-line change that adds a field to `costs` is not. The question is never how big — it is whether the decision belongs in a session or in front of Jaya.

---

## 3. Stack — locked

Do not substitute any of these.

**Frontend (both apps)** — React 18, Vite, **Tailwind CSS v4 via `@tailwindcss/vite`**, React Router, TanStack Query for server state, plain React state locally.

There is **no `tailwind.config.js`** and there will not be one. Tailwind v4 is configured from CSS: design tokens go in each app's `src/index.css` inside an `@theme` block. A prompt that asks you to create a Tailwind config file is asking for the wrong thing — say so.

**Backend** — Node 24, Express 5, Mongoose. REST, not GraphQL.

Node 20 reached end of life in April 2026 and Azure no longer offers it. CI targets `24.x`. The root `package.json` still declares `"engines": { "node": ">=20.19" }` — this is known and is not yours to change without saying so.

**Database** — MongoDB Atlas.

**Auth** — Auth0 (portal only; portfolio is unauthenticated).

**Storage** — Azure Blob Storage for all uploads.

**Hosting** — Portal and portfolio on Vercel. API on Azure App Service, deployed by `.github/workflows/main_wroom-api.yml`.

### Dependencies in use beyond the above

These are approved and already installed. Do not remove them, and do not treat them as precedent for adding more.

| Package | Where | For |
|---|---|---|
| `cors`, `dotenv` | api | Express infrastructure |
| `express-oauth2-jwt-bearer` | api | Auth0 JWT verification |
| `@azure/storage-blob` | api | Blob uploads and SAS signing |
| `papaparse` | api | Feature CSV import |
| `@auth0/auth0-react` | portal | Auth0 SPA login |
| `react-markdown`, `rehype-sanitize` | portfolio | Rendering `siteContent` body markdown |

### Validation — read this before writing a schema

**There is no Zod in this repo and there will not be.** `packages/shared` has **zero dependencies**, deliberately.

Request bodies are validated by the hand-rolled validator in `packages/shared/src/validate.ts`, against the schemas in `packages/shared/src/schemas/`. Every write endpoint uses one. Follow the existing pattern in that folder — do not introduce a validation library, and do not write inline validation in a controller.

### Explicitly not used

Next.js · Postgres or any SQL database · Firebase · Prisma · Redux · GraphQL · Zod or any other validation library · any component library that ships its own design system (build components on Tailwind).

If a prompt appears to need one of these, stop and report.

---

## 4. Repo structure

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
/.github/workflows
  main_wroom-api.yml
CLAUDE.md
FEATURES.yaml   Maintained by Jaya — never edit
CHANGELOG.md
```

Inside `apps/api`:

```
/src
  /config       env loading, db connection
  /models       Mongoose schemas — one file per collection
  /routes       Express routers — mirrors the resource name
  /controllers  request/response handling only
  /services     business logic — all of it
  /middleware   auth, validation, error handling
  /jobs         npm-script entrypoints: seed, ensureIndexes
  /utils
```

Inside each frontend:

```
/src
  /pages        one folder per route
  /components   shared UI
  /features     feature-scoped components + hooks
  /lib          api client, helpers
  /providers    portal only — Auth0 and Query providers
```

**Controllers stay thin.** Business logic lives in services. A controller that does anything more than validate, call a service, and shape a response is wrong.

Anything used by more than one app goes in `packages/shared` — and note that publish gates (`publish.ts`), run-rate maths (`runRate.ts`) and the CSV template (`featureCsvTemplate.ts`) already live there. Check before writing a helper.

---

## 5. Running locally

```bash
npm install                                      # workspace root
npm run dev:api                                  # http://localhost:4000
npm run dev:portal                               # http://localhost:5173
npm run dev:portfolio                            # http://localhost:5174
npm run seed --workspace @wroom/api              # project types
npm run ensure-indexes --workspace @wroom/api    # additive; safe to re-run
```

Production does not build indexes on start-up, by design. On a fresh environment `ensure-indexes` has to be run once or every query reads the whole collection.

Each app has its own `.env` based on its `.env.example`. Never commit `.env`. `docs/ENV_SETUP.md` walks through obtaining the values.

API env vars actually read by `src/config/env.ts` — the only file in the repo that touches `process.env`:

```
NODE_ENV
PORT
MONGODB_URI                        required
AUTH0_DOMAIN                       required
AUTH0_AUDIENCE                     required
AZURE_STORAGE_CONNECTION_STRING
AZURE_STORAGE_CONTAINER
STRIPE_SECRET_KEY
CORS_ORIGINS
```

`GITHUB_APP_TOKEN` and `ANTHROPIC_API_KEY` are in `.env.example` and read nowhere. They are reserved for features not built. Leave them.

If a prompt needs a new env var, add it to `.env.example` with a comment and name it in your report.

---

## 6. API conventions

**Two namespaces, and the split is a security boundary.**

- `/api/*` — Auth0 JWT required, applied at the router. Full access to all collections.
- `/public/*` — no auth. **Every route must appear in this allowlist:**

```
GET   /public/projects         → publishedProjects            (read)
GET   /public/projects/:slug   → publishedProjects            (read)
GET   /public/content/:key     → siteContent.published only   (read)
POST  /public/enquiries        → enquiries                    (write, reads nothing)
```

Adding a route to `/public` is an edit to this file and a ticket (§2.2), not a decision made inside a session.

A `/public` handler may never query `projects`, `costs`, `revenue`, `accounts`, `credentials`, `services`, `timeEntries` or `users`. It may never return the `draft` sub-document of `siteContent`. If a prompt seems to ask for any of this, stop and report.

`GET /health` sits outside both namespaces, is unauthenticated, and reports the mongoose connection state only. It queries no collection and must not start.

**Shape.** Resource-based, plural: `/api/projects`, `/api/projects/:id/features`. Standard verbs. Validate every request body against a schema from `packages/shared` (§3).

**Responses.**

```js
// success
{ data: {...} }
{ data: [...], meta: { total, page, limit } }

// error
{ error: { code: "VALIDATION_FAILED", message: "Human readable", details: {...} } }
```

Status codes: 200, 201, 400, 401, 403, 404, 409, 422, 500. No 200-with-error-body.

**Errors.** Throw typed errors from services; a single error middleware maps them to responses. Never `res.status(500).send(err.message)` — that leaks internals.

**Rollups.** `projects.rollup` is denormalised. Recompute it in the service layer whenever a feature, cost, revenue entry or time entry changes for that project. Do not use change streams. Changing what a rollup figure means is a ticket (§2.2).

---

## 7. Frontend conventions

- Server state through TanStack Query. No fetching in `useEffect`.
- One API client in `src/lib/api.ts`. Components never call `fetch` directly.
- Every list view handles four states explicitly: loading, empty, error, populated. An empty state must say what to do next, not just "No data".
- Forms in the portal are **schema-driven** where the data model says so — project type forms render from `projectTypes.fieldDefs`, they are not hardcoded per type.
- Tailwind utility classes inline. No CSS modules, no styled-components. Shared visual patterns become components, not `@apply` blocks. Tokens live in `src/index.css` under `@theme`.
- Mobile-first. Every portal view must be usable at 390px width — the whole point of this app is checking work on a phone.
- Enquiry text and any user-submitted string renders as plain text, never as markup.

---

## 8. Security rules

**The three publish gates.** An asset appears in the portfolio only if all three are true:

1. `asset.visibility === "public"`
2. `project.portfolio.visibility === "public"`
3. `product.ndaRestricted === false`

This is implemented once, in `packages/shared/src/publish.ts`. **Call `checkPublishGates`, `isAssetPublishable` or `isProjectPublishable`. Never re-implement the comparison**, in either app. Reasons shown to a user come from `PUBLISH_GATE_MESSAGES`.

Gate code fails closed: a missing product is treated as NDA-restricted.

**Defaults are private.** New projects and new assets are created private. There is no "publish on save" path — publishing is an explicit action that writes `publishedProjects`.

**Credentials collection stores locations, never values.** `storedIn` is a human-readable pointer like `"Azure Key Vault"`. The API refuses a body carrying a key, token, password or connection string. If a prompt asks you to store a value, stop and report — there is no phrasing that gets past this.

**Uploads.** Validate mime type and size server-side. Generate SAS URLs with expiry; never expose the storage connection string to a client.

**The one public write.** `POST /public/enquiries` is the single unauthenticated write in the system. Its middleware chain — body cap, rate limit, bot checks, body validation — is load-bearing. It must:

- validate the whole body against the shared schema, rejecting any non-string where a string is expected, which is what closes NoSQL injection
- set `status`, `source`, `ownerUserId`, `convertedToProductId`, `meta` and timestamps server-side, stripping them from the body if present
- rate limit per IP, cap total submissions per day, and cap body size
- reject a filled honeypot field or a submission completed implausibly fast
- read no collection at all — `relatedProjectId` is checked against an in-memory cache refreshed outside the request

Any change to this chain is a ticket (§2.2).

**Published content only.** `GET /public/content/:key` returns the `published` sub-document of a `siteContent` record, projected so `draft` is never loaded. If `published` is null the route returns 404.

---

## 9. The feature ledger

`FEATURES.yaml` is a **hand-maintained list**, owned by Jaya. It records roughly what exists and roughly what is next.

- **Never edit it.** Not the status, not the ordering, not a new entry. There is no offline mode, no export mode, no exception.
- Read it for orientation if a prompt names a ref. Otherwise you do not need it.
- **Its statuses are not reliable.** Work has shipped without the file being updated. If the ledger says `backlog` and the code is there, the code is right. Never conclude something is unbuilt because the ledger says so — check the repo.
- Work done without a ref never gets added to the ledger. The `now/` branch prefix and `CHANGELOG.md` are its record.

`CHANGELOG.md` is the honest history. Every session appends to it, in plain language, under a dated heading — what a user can now do, not which files changed.

---

## 10. Definition of done

- It does exactly what the prompt asked for — no more.
- It works against a real MongoDB connection, not mocks.
- Loading, empty and error states are handled in any UI touched.
- It renders correctly at 390px and at desktop width.
- No console errors or warnings introduced.
- No secret, key, or real account email committed.
- `npm run lint`, `npm run typecheck` and `npm run build` pass in every app touched.
- `CHANGELOG.md` has a new entry.

If you cannot satisfy every line, it is not done. Say so.

---

## 11. Stop-and-report protocol

**Stop immediately and report** when any of these happen:

- The work hits any of the six ticket triggers in §2.2
- A credential or external service is missing or rejecting you
- The prompt contradicts a rule in this file
- Two attempts at a fix have failed
- The prompt is ambiguous enough that you'd be guessing at intent

Do not push past any of these. A stopped session with a clear question is a good outcome; a session that guessed and built the wrong thing is not.

**Every session ends with a report, in plain language.** No architecture jargon, no file-by-file narration. Default mode uses the three-line form in §2.1. Ticketed work uses this:

```
DONE
- <what a user can now do that they couldn't before>

NOT DONE
- <anything from the ticket you didn't finish, and why>

BLOCKED
- <what stopped you, and what you need from Jaya to continue>

NOTICED
- <anything worth doing later — do not do it now>
```

---

## 12. Out of scope

Not part of this project unless a prompt explicitly says so: automated tests, CI beyond the existing API deploy workflow, Docker, Kubernetes, server-side rendering, internationalisation, real-time websockets, analytics.

Do not add these speculatively.

---

## 13. Decisions already made — do not relitigate

1. **Mobile counterparts are separate projects**, linked `component-of` to the same product. Own repo, stack, lifecycle.
2. **All money in AUD**, converted at entry, `fxRate` stored when the source wasn't AUD.
3. **Time tracking is day-granularity** with the rate snapshotted per entry. No start/stop timer.
4. **No clients collection.** `isClientWork` + `clientName` on products covers existing work. Inbound contact is `enquiries`, closing with `convertedToProductId`. No client role, no client login.
5. **Monorepo**, not three repos — both frontends share one backend and one set of types.
6. **The portfolio's own copy is managed content.** About and contact text lives in `siteContent` with a draft/published split, edited from the portal. Changing a sentence must never require a deploy.
7. **`/public/*` is an allowlist, not a prohibition.** Two reads and one write. The security property holds because the list is short, explicit, and lives in §6.
8. **The portfolio never queries operational collections.** Publishing writes a flattened snapshot. This is a security boundary, not a performance choice — some of this work is client work.

---

## 14. Known divergences

These are known and already decided. Do not report them again, and do not fix them unprompted.

- `docs/DATA_MODEL.md` lists `deployments`, `memberships` and `auditLog` as v2 shapes. No models exist for them. Correct.
- `vendorConnections.syncEnabled` defaults to `false` in the model where the doc shows `true`. The model is right — a connection that exists should not sync by itself.
- `revenue` carries `updatedAt` where the doc shows `createdAt` only. The model is right.
- `projectTypes.key` is an unconstrained `String`; `PROJECT_TYPE_KEYS` in `packages/shared` is the real list, and the doc's `desktop` entry is stale — the sixth type is `internal-tool`.
- Several `/api` routes have no frontend caller yet. That is not dead code to remove.
