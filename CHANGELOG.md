# Changelog

## 2026-08-17

- Stood the repo up as a working monorepo — the API, the portal and the portfolio
  all install, lint and build from a single `npm install`.
- The API now serves the two namespaces the design calls for: an authenticated
  one for the team, and a public one that can only ever read the published
  portfolio snapshot.
- You can create products and projects, and a project's form changes based on
  the type you pick — adding a new field to a project type is a data change, not
  a code change.
- You can run a project's Kanban board: add features, move them between columns,
  and the project's progress figure updates by itself.
- You can record what a project costs and log hours against it, and both feed
  the run-rate and hours shown on the dashboard and project cards.
- You can publish a project to the portfolio as a deliberate action, and unpublish
  it again. Saving a project never publishes it.
- The public site lists published work and shows a case study page for each one,
  reading only the published snapshot.
- Every list screen handles loading, empty, error and populated explicitly, and
  the whole portal works at 390px.
