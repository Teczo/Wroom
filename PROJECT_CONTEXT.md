# Wroom — Project Context

Read this first. `CLAUDE.md` says *what the rules are*; this says *why*, and where the build currently stands.

Last updated: 21 August 2026

---

## 1. The problem this solves

Jaya's previous workflow: describe an app in chat → get a `CLAUDE.md` containing a phased plan → new repo → Claude Code builds the whole thing over several sessions.

It worked, but produced two failures. He understood the resulting codebase less than he wanted, and the app drifted from his original intent because scope decisions happened inside sessions rather than in front of him.

The replacement: build a thin base, deploy it, then add one feature per session under his direction. Deployed early so he can check it on real devices — catching layout and flow bugs is the point, and he checks work on a phone.

---

## 2. The three-file pattern

The old `CLAUDE.md` did three jobs at once — described the product, planned the work, set the rules. That ambiguity is what let scope move. Split into:

| File | Job | Changes |
|---|---|---|
| `CLAUDE.md` | Constitution — stack, conventions, guardrails, definition of done | Rarely |
| `FEATURES.yaml` | Ledger — what to build, what's built | Constantly |
| `CHANGELOG.md` | What actually happened, plain language | Every session |

Plus a per-session **work order** — the only thing pasted into Claude Code each time. Usually a **ticket**: one ref, scope, out-of-scope, exit criteria. For a bug fix or a small change to something already built, a prompt tagged `developnow` instead, where the prompt itself is the scope and no ticket gets written. `CLAUDE.md` §2.1 decides which applies.

This pattern is intended for all of Jaya's projects, not just Wroom.

---

## 3. What Wroom is

Two frontends, one backend, one database.

- **Portal** — authenticated. Manages projects, infrastructure, costs, features, time, media.
- **Portfolio** — public. Showcases work for clients and employers.

Name is a wordplay on "war room", and reads as fast.

The portfolio never queries operational collections. Publishing writes a flattened snapshot to `publishedProjects`, and `/public/*` routes read that collection only. This is a security boundary, not a performance choice — some of Jaya's work is client work.

---

## 4. Decisions already made — do not relitigate

1. **Mobile counterparts are separate projects**, linked `component-of` to the same product. Own repo, stack, lifecycle.
2. **All money in AUD**, converted at entry, `fxRate` stored when the source wasn't AUD.
3. **Time tracking in v1** — day granularity, rate snapshotted per entry. No start/stop timer.
4. **No clients collection.** `isClientWork` + `clientName` on products covers work you already have. Inbound contact is a different problem and gets its own collection — `enquiries` — closing with `convertedToProductId` when an enquiry becomes a product. This is not a reversal: still no clients collection, no client role, no client login.
5. **Option B — the database is the source of truth**, `FEATURES.yaml` is an export.
6. **Monorepo** — `apps/api`, `apps/portal`, `apps/portfolio`, `packages/shared`. Chosen over three repos because both frontends share one backend and one set of types.
7. **Auth0 included in the walking skeleton** rather than deferred, because retrofitting auth across two frontends and a route split is worse than including it.
8. **The portfolio's own copy is managed content.** About and contact page text lives in `siteContent` with a draft/published split, editable from the portal. Hardcoding it in the portfolio app was rejected: an app whose purpose is managing a portfolio should not require a deploy to change a sentence on it.
9. **`/public/*` is an allowlist, not a prohibition.** It now carries two reads and one write. The security property is unchanged because the list is short, explicit and lives in `CLAUDE.md` §6 — a route not on it doesn't exist.

### Why Option B

Option A was: repo file is the source of truth, dashboard reads it. Rejected because it makes the Kanban read-only, which defeats the reason for building Wroom.

Option B's risk is staleness — the exported file drifting from the database. Mitigated by coupling export to the "generate ticket" action, capping drift at one session.

**Offline mode** covers the case where Wroom is unreachable: Claude Code may then edit `status` and `completedAt`, and must set `offlineEdits: true` in the header. Wroom surfaces reconciliation on import rather than overwriting.

Side effect worth preserving: every repo holds a git-tracked ledger and changelog, so losing the Wroom database loses the editing surface, not the history.

---

## 5. Current state

**Done:** WRM-000, the walking skeleton. Monorepo, API on Azure App Service, portal and portfolio deployed, Auth0 login, project create and list, schema-driven type forms, project types seeded.

**Bootstrap caveat:** `FEATURES.yaml` for Wroom is hand-written, because Wroom doesn't exist yet to generate it. Jaya edits it manually; Claude Code still must not. This ends at WRM-052, after which Wroom manages its own ledger like any other project.

**Suggested order:** WRM-010 → 011 → 013 → 014 → 015 → 025 → 026 → 001 → 003 → 021 → 047 → 049 → 063 → 052 → 053.

WRM-001 (rollups) must come after features and costs exist — it has nothing to aggregate before that. WRM-052 and 053 (export and ticket generator) are deliberately early despite sitting in the integrations block: once they ship, Wroom generates its own tickets.

**Refs carrying disproportionate risk:** WRM-042 (three publish gates — must precede WRM-044), WRM-051 (Azure cost sync — depends on `externalRef` being populated correctly in WRM-015), WRM-054 (import and reconcile — where Option B holds or fails).

---

## 6. How to help in this project

**Writing tickets.** Follow the format in `WRM-010-products-crud.md`: goal, scope by app, out-of-scope, numbered verifiable exit criteria, stop conditions. Roughly one page. Never restate `CLAUDE.md` conventions inside a ticket. Never invent a field — if a feature seems to need one that isn't in `DATA_MODEL.md`, say so instead of writing the ticket.

Exit criteria must be checkable by using the deployed app, not descriptions of the work.

**The out-of-scope section is the one that matters.** It's what stops "while I was in there".

**Working without a ticket.** Once something is deployed, most changes to it are bug fixes and small adjustments, and a one-page ticket for a status pill that wraps costs more than the fix does. A prompt tagged `developnow` skips the ticket; `hotfix` is the same for a broken production. Neither relaxes the stack, security or definition-of-done rules.

A `developnow` prompt has no out-of-scope section, so the escalation list in `CLAUDE.md` §2.1 does that job instead: schema, a dependency, a new route, auth, publish gates, money, or more than a handful of files, and the session stops and asks for a ticket. That list is the whole reason the shortcut is safe to have. Without it, "just fix the spacing" becomes a feature built without anyone deciding to build it — which is failure the second one in §1.

**Style.** Jaya wants concise and direct. No preamble. Coding-agent prompts need explicit scope boundaries and completion criteria; status reports in plain language — what a user can now do, not which files changed.

**Stack is locked.** React 18 + Vite + Tailwind + React Router + TanStack Query, Express 5 + Node 24 + Mongoose, MongoDB Atlas, Auth0, Azure Blob, Stripe, Claude API. Not used: Next.js, any SQL database, Firebase, Prisma, Redux, GraphQL, component libraries shipping their own design system.

---

## 7. Still open

- Whether to keep the Teczo project-control workbook in sync with Wroom, or retire it once WRM-003 (dashboard) ships
- Whether the portfolio gets its own domain or a subpath
- Where Wroom itself is hosted — same pattern as everything else, but the accounts aren't yet chosen
