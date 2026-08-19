# Changelog

## 2026-08-19 (later)

- WRM-031 — Wroom now answers what everything costs a month. A project shows
  its run rate and its total spend, each labelled so it is clear that annual
  costs are spread over twelve months and that one-offs and usage are not part
  of the recurring figure.
- The cost list marks the entries that do not count toward the run rate, so a
  one-off invoice no longer looks like it was missed.
- The dashboard shows the whole portfolio: run rate, total spend, and what each
  vendor takes. Archived projects are left out of those totals.

## 2026-08-19 (later)

- WRM-040 — Screenshots and videos can be uploaded to a project from the
  portal, including straight from a phone camera. The file goes to Azure
  directly from the browser with a progress bar; it never passes through the
  API, and the storage key never leaves the server.
- The file's type and size are checked before anything is signed, so a file
  Wroom will not accept is turned away without uploading a byte — and the
  message tells you which limit it broke, separately from an upload that
  started and failed.
- Uploaded files are private. Nothing in this release makes one public.
- Deleting a file removes it from Azure as well as from Wroom.

## 2026-08-19

- WRM-029 — A blank CSV template is one tap from the features page, with the
  column headers already correct and one example row showing the format. The
  help text next to it says to delete that row before importing.
- WRM-028 — Features can be imported from a CSV. Pick the file and Wroom shows
  exactly what it would do before touching anything: what gets added, what gets
  updated with the old and new value side by side, what it cannot read and why,
  and what it will leave alone.
- Rows match on their ref, so re-running the same file updates rather than
  duplicating, and a feature missing from the file is never deleted.
- A bad row fails on its own — the rest still import, once you confirm you are
  happy to skip it — and either the whole import lands or none of it does.
- Adds papaparse to the API for reading the files.

- WRM-027 — A feature can record what it waits on, and the board shows it: a
  card with something outstanding says what it is waiting for, and the panel on
  each card lists both what blocks it and what it blocks.
- Moving a card to blocked now asks what is blocking it and will not move until
  you say. Moving it anywhere else clears that reason again.
- Wroom refuses a dependency that would have two features waiting on each other,
  and says which two rather than failing obscurely.
- WRM-026 — A project's features are a board at `/projects/:id/board`: six
  columns with counts, cards showing ref, title, priority, size and labels.
- Drag a card to another column or to a new position within one and it sticks.
  The card moves the moment you drop it and snaps back with an explanation if
  the server refuses. Moving a card into done stamps it complete; moving it out
  clears that again, and the project's progress figure follows on its own.
- On a phone the columns swipe one at a time and every card carries a "move to"
  menu, because browsers do not send drag events from a finger.
- WRM-019 — A project carries its own reasoning. Record what was decided, the
  context that forced it, the choice made and what was turned down, with a date
  and a status.
- When a decision is replaced, marking it superseded records what replaced it in
  one action, and both decisions link to each other. Superseded ones drop out of
  the list until you ask to see the trail.
- A decision cannot supersede itself, cannot be replaced by one from another
  project, cannot be marked superseded without naming its replacement, and
  cannot be deleted while another decision points at it.
- WRM-018 — Projects have notes. Write down a client remark, a half-made
  decision or a bug you saw once, label it as a note, meeting, idea or issue,
  and filter the section by that label.
- Pin the ones that matter and they stay at the top of the section regardless of
  how old they are; unpinning drops them back into date order.
- Notes are private by default and record who wrote them, taken from who is
  signed in rather than anything the request claims.
- WRM-016 — Projects can be linked to each other — a mobile app to the API it
  calls, a component to the product it belongs to — and each project page shows
  both directions: what it points at, and what points back at it.
- When something depends on a project, the page says so up front and counts how
  many, so "what breaks if I kill this" is answered before you delete anything.
- A project cannot be linked to itself, the same link cannot be added twice, and
  deleting a project takes its links with it rather than leaving rows pointing
  at something that no longer exists.
- WRM-017 — Every expiring thing is now recorded: certificates, domains, API
  keys and subscriptions, with where each one is kept, when it dies, what
  renewing costs, and how much warning you want. The list sorts by urgency, so
  whatever lapses next is at the top.
- Each credential is judged against its own warning window, so a certificate you
  want three months' notice on and a key you want a week's notice on both get
  flagged at the right moment. Anything already expired is flagged in red and
  sorts above everything else.
- Credentials also appear on the project page, and the value itself is never
  stored anywhere: the API refuses a request carrying a key, token, password or
  connection string and says why, rather than quietly dropping it.
- WRM-015 — The project page now answers what runs where and on whose card.
  Each hosted thing is recorded against its environment with its role, vendor,
  resource name, plan, region and the account it bills to, grouped under the
  environment it runs in.
- Anything sitting on a secondary account is flagged in the row, so the test
  subscription paying for production is visible without opening the record.
- Suspended and deleted services stay listed and greyed rather than vanishing.
- A service can no longer point at an account or an environment that does not
  exist, and the error names which field was wrong.
- WRM-014 — A project records where it actually runs. Add a dev, staging and
  production environment, each with its branch and public URL, and the project
  page lists them with the live URL as a link that opens in a new tab.
- The first environment you add becomes the primary one on its own, and "make
  primary" moves it — only ever one at a time.
- The project list card now shows the primary environment's URL, so checking a
  live site from a phone is one tap from the list.
- Deleting an environment says up front what it will do to the project's card,
  and the section warns while a project has no primary set.

## 2026-08-18

- WRM-013 — Vendor accounts are a record in the portal. You can add, edit and
  delete them, see which vendor and login each one is, and filter by vendor.
- Secondary accounts are marked in the list with an amber stripe and a badge, so
  the test tenant no longer looks identical to the one that pays the bills.
- Deleting an account needs its label typed to confirm, and is refused while any
  service still points at it.
- WRM-012 — The project list can be narrowed by status, product, type and tag,
  picking more than one of each, and searched by name as you type. Everything
  you pick lands in the URL, so a filtered view can be bookmarked or sent to
  yourself and comes back exactly as it was.
- Active filters show as chips you can remove one at a time or clear at once,
  with a count of what matched. A filter combination with no results now says so
  and offers to clear, rather than looking like you have no projects.
- A filter value the API does not recognise comes back as a plain error naming
  the field, instead of an empty list that looks like nothing matched.
- WRM-011 — A project is no longer write-once. You can edit every field on it,
  including the type-specific ones, and switching a project's type re-renders
  those fields and warns you which entered values it cannot carry over.
- Archiving is its own action, not a status buried in a dropdown. Archived
  projects drop out of the project list until you tick "show archived", where
  they appear greyed out. Un-archiving asks which status to bring it back as.
- Deleting a project needs its name typed to confirm, and is refused outright
  while any features, costs, time entries, media, environments, services,
  credentials, notes or decisions still point at it — the message says how many.
- WRM-003 — The portal opens on a real home screen. It shows how many projects
  sit in each status, what they cost in total and to date, and which projects
  have gone quietest, all in one request rather than one per project.
- Each status tile links straight to that slice of the project list.
- With no projects yet, the dashboard says to create one instead of showing a
  row of zeroes.

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
