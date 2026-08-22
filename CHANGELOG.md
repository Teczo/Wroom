# Changelog

## 2026-08-22

- The portal's navigation now sits in a sidebar down the left of the screen
  instead of across the top. On a phone nothing changes — the bottom bar is
  still there — and the name and sign out move into the sidebar on wider
  screens, so the top bar disappears there entirely.
- The repository now has a README at the root. Anyone landing on the repo can
  see what Wroom is, which of the three apps does what, how to install and run
  it locally, which one-off commands a fresh environment needs, what the two API
  namespaces are and why the split matters, and the rules that govern changes —
  without opening the constitution first.

## 2026-08-21

- Work can now start two ways. A ticket, as before — or a prompt tagged
  `developnow`, which skips the ticket entirely and treats the prompt itself as
  the scope. Meant for bug fixes and small changes to things that already
  exist. `hotfix` is the same thing for when production is broken. The stack,
  security and definition-of-done rules are untouched by either tag, and a
  `developnow` that turns out to need schema, a dependency, a new route or more
  than a handful of files stops and asks for a ticket instead.
- The context document now describes the two ways a session can start, instead
  of only the ticket, and records the backend as Node 24 to match the
  constitution.
- The branch-naming example in the constitution used a ref prefix from a
  different project. It now reads WRM.
- The API deploy to Azure now builds only the API and the shared package, so a
  deploy no longer waits on the two frontends or fails because of something
  that has nothing to do with the server.
- What gets shipped to Azure is now just the built API, the shared package and
  the production dependencies. Development tooling — TypeScript, Vite, ESLint —
  no longer travels to the server, and the whole repository is no longer
  packaged up on every deploy.
- The shared package is copied into the deployment as a real folder rather than
  a workspace link, because links do not survive the trip to App Service.
- The deploy only runs when something the API actually depends on changes.
- Deep links now work on both public sites. Loading a project page or a case
  study straight from the address bar, a bookmark or a shared link gives you
  the page instead of a 404.
- The constitution now records the backend as Node 24. Node 20 reached end of
  life in April 2026 and Azure no longer offers it, so the rule could not be
  followed as written.
- There is now a one-command way to build the database indexes on a new
  environment: `npm run ensure-indexes --workspace @wroom/api`. Production does
  not build indexes on start-up, by design, so until this runs every query
  reads the whole collection. It only adds what is missing and never removes
  an index, so anything set up by hand in Atlas survives it, and running it
  twice does nothing the second time.

## 2026-08-19 (evening, last)

- WRM-063 — Enquiries now have somewhere to live. Inbox lists everything that
  has come in, newest first, and the shell carries a count of how many nobody
  has looked at yet, wherever you are in the app.
- Opening one shows the whole thing: who wrote, how to reach them, what they
  said, and which case study they were reading when they decided to write.
- The message is shown exactly as it was typed and never as markup, so a
  message containing a script tag reads as the text someone sent, which is all
  it will ever be.
- What arrived cannot be edited — not the name, the address, the message or
  where it came from. An enquiry is a record of what someone sent, and the
  parts you decide about it afterwards are kept separate from the parts they
  wrote.
- Status moves through new, read, qualified, quoted, then won or lost, with
  spam for the rest. Marking something spam takes it out of the list without
  throwing it away, and it is still there when you filter for it.
- What someone needs — budget, timeline, kind of work — is editable as you
  learn more, rather than frozen at whatever they typed in a hurry.
- Notes work against an enquiry exactly as they do against a project, using the
  same thread, kinds and pinning. Project notes are untouched.
- A won enquiry can be linked to the product it became, and that link shows
  from both ends: the enquiry names the product, and the product says which
  enquiry it started as. Nothing was added to the product to make that work.
- The link can only be made once an enquiry is won, because that is what
  winning means. It does not trap the record, though — one that went wrong
  later can still be moved on.
- The menu on a phone now scrolls sideways instead of squeezing every entry
  into a share of the screen, which had started breaking the longer labels
  across two lines.

## 2026-08-19 (evening, later still)

- WRM-049 — Anyone looking at the portfolio can now get in touch. /contact
  takes a name, email, message and, if they want to give them, a phone, a
  company, a budget, a timeline and what kind of work it is.
- Every message is stored as an enquiry the moment it is sent, so nothing
  depends on email being set up and nothing is lost while it is not. Reading
  and managing them is the next ticket.
- Sending from a case study records which project prompted it, so you know what
  someone had just been looking at when they decided to write.
- The form says clearly that the message arrived, and repeats the address it
  will reply to. If the form is being hammered and has to turn someone away, it
  says so in a way that makes plain it is not their fault and that their words
  are still on screen.
- The page's own words come from the contact record when you have published
  one, and the form stands on its own when you have not — an unwritten page
  cannot take the form away.
- Nothing a sender puts in the body can set who owns the enquiry, what state it
  is in, where it came from or when it arrived. Those are the server's to write,
  and a message that tries to set them is stored with the right values anyway
  rather than being refused.
- The form is the only place on the whole site that writes anything, so it is
  the one thing that had to be hard to abuse: a message shaped like a database
  query is refused outright, too many from one place in a short time are turned
  away, there is a cap on the day as a whole, an oversized message is refused
  before it is read, and a submission filled in faster than a person could type
  is not stored at all.
- The handler reads nothing. Not a project, not a duplicate, not a count — the
  only thing it does to the database is insert the enquiry.

## 2026-08-19 (evening, later)

- WRM-047 — The portfolio now has an about page at /about, and its words come
  from the record you edit in the portal. Rewrite it from your phone, publish,
  refresh — no deploy.
- The page title and the description a search result shows also come from the
  record, so those are editable too rather than fixed in the code.
- Editing the draft without publishing changes nothing on the public page.
  Unpublishing turns it back into the ordinary not-found page rather than an
  empty shell.
- The body renders as real markdown — headings, lists, links, bold — with any
  HTML in it stripped before it reaches the page. A link that tried to run
  script does not survive, which was checked with a deliberately hostile page.
- The public site now has a small header on every page with the Teczo name,
  Work and About, so the about page is reachable from anywhere including a
  case study.

## 2026-08-19 (evening)

- WRM-021 — The words on the portfolio's about and contact pages are now
  something you edit in Wroom, under Content. Changing a sentence no longer
  means a code change and a deploy.
- Editing writes a draft and nothing else. You can leave a page half-written
  for a week and the public site keeps showing what it showed before, or
  nothing at all if you have never published it.
- Publishing is a separate, confirmed action. The confirmation names the page
  and says what it will do to the live site, so it is clear whether you are
  replacing words that are already public or putting a page up for the first
  time.
- Each page says whether its draft is ahead of what is live, so you can tell at
  a glance that something is written but not yet published without having to
  compare the two yourself.
- Unpublishing takes the page off the public site and keeps your draft exactly
  as it is, ready to publish again.
- Publishing sends the draft you saved, not the text sitting in the boxes, so
  the button is unavailable until you save. It says why.
- Nothing unpublished can escape. The public route serves only the published
  copy, never loads the draft from the database, and returns nothing at all for
  a page that has never been published. A save that tries to write the
  published half is refused outright rather than quietly ignored.
- The about and contact records are created by the seed script, both
  unpublished. Running it again never touches a record that already exists, so
  it cannot cost you a page you wrote.

## 2026-08-19 (later still)

- WRM-050 — Stripe invoices now import themselves as revenue. Connect Stripe
  under Sync, press "Sync now", and every invoice tagged with a project slug
  lands against that project, with whether it was paid and when taken from
  Stripe rather than assumed.
- Running the same sync twice changes nothing. An invoice whose amount moved in
  Stripe is updated where it sits rather than added a second time, so the
  numbers can be trusted after any number of runs.
- An invoice Stripe cannot be attributed to a project is listed back with its
  id and customer, so the metadata can be fixed at the Stripe end. Nothing is
  written for it and nothing is guessed at.
- A sync that fails imports nothing at all — not half a period. The reason is
  kept against the connection and shown on the page, including whatever Stripe
  itself said.
- An invoice in a currency other than AUD stops the run and says so, rather
  than storing a converted figure with no exchange rate recorded behind it.
- Synced rows are marked in the revenue list and cannot be edited by hand,
  because the next sync would overwrite the edit without saying so. They can
  still be removed.
- Wroom never asks for a Stripe key and has nowhere to put one. The connection
  records where the key lives; the key itself is read from the server's
  environment at the moment a sync runs. Nothing here writes to Stripe.

- Portfolio images now load. They were stored as plain storage URLs, which the
  storage account refuses to serve to anyone not signed in, so every published
  picture came out blank. The public API now signs each image URL as it serves
  it, valid for an hour. Nothing else in storage became reachable — an
  unpublished screenshot is still refused.

## 2026-08-19 (later)

- WRM-046 — Each published project has its own page at /work/its-slug, showing
  the case study, the metrics, the testimonial and the gallery in the order it
  was published in. A project with no metrics or testimonial renders without
  empty headings rather than blank sections.
- Gallery images no longer borrow the caption as their alt text. The caption is
  already on the page as real text, so repeating it would have a screen reader
  say everything twice.
- An unknown or unpublished link shows a plain not-found page with a way back
  to the work index. Unpublishing takes a page offline immediately, with no
  deploy.

- WRM-033 — Logged hours are now readable. A project shows what the work took,
  broken down by activity and by feature, with hours logged against nothing in
  particular kept in their own bucket rather than dropped.
- Effort sits in its own section, apart from hosting spend, because the two
  measure different things — time cost is what the hours are worth, not money
  that left an account, and it is in no total by default.
- The Kanban card shows hours; the cost sits behind the card's panel, since
  money is not part of deciding what to pick up next.
- Where Net is shown there is now a tick box to count time cost into it. It is
  off, and it is not saved anywhere — it is a way of looking at the number.
- Hours logged at no rate show a dash rather than $0.00, so uncosted work and
  free work do not look the same.

- WRM-034 — A project can record money in as well as money out. Add an invoice
  or a payment with who it was for, what it was for, the amount and whether it
  has been paid, and mark an outstanding one paid in a single action.
- Paid and outstanding are shown as two separate figures and never added
  together, because one is money that arrived and the other is money someone
  said they would send. Anything past its due date is flagged in red.
- Net is paid revenue minus spend. Logged hours do not move it.
- Revenue is not reachable from the portfolio or any public route, and never
  will be.

- WRM-043 — A project can carry a case study: the problem, your role, the
  approach, the outcome, the metrics worth leading with, and a testimonial that
  can be removed entirely rather than left as blank fields.
- Pick a hero image from the project's own public files. Private ones are not
  offered, and the page says why.
- Marking a project public here makes it eligible for the portfolio and
  publishes nothing — the page says so, and says which gate still blocks it,
  naming the product when an NDA is the reason.
- If the case study has been edited since it was last published, the page says
  that too, and points at the publish action rather than doing it.

- WRM-041 — A project's media is a library at `/projects/:id/assets`. Give each
  file a title, caption, alt text and device, say what kind it is, and put them
  in the order you want with up and down controls.
- Every file shows who can see it without opening it. Private is quiet, public
  is loud, and making something public takes an explicit confirm that says what
  it means.
- Where a file is marked public but the project is not published or the product
  is under NDA, the library says so and names which gate is holding it — so
  "why isn't my screenshot showing" has an answer.
- Marking a file public makes it eligible for the portfolio. It publishes
  nothing; that stays a separate deliberate action.

- WRM-031 — Wroom now answers what everything costs a month. A project shows
  its run rate and its total spend, each labelled so it is clear that annual
  costs are spread over twelve months and that one-offs and usage are not part
  of the recurring figure.
- The cost list marks the entries that do not count toward the run rate, so a
  one-off invoice no longer looks like it was missed.
- The dashboard shows the whole portfolio: run rate, total spend, and what each
  vendor takes. Archived projects are left out of those totals.

- WRM-020 — Project types are editable in the portal at Settings → Project
  types. Define a new kind of project, give it its own form fields, and create a
  project of that type immediately — no seed script, no deploy.
- The field editor shows a live preview built from the same renderer the real
  create-project form uses, so what you see is what someone filling it in gets,
  including fields that only appear when another one matches.
- A type in use cannot be deleted; the message says how many projects block it.
  Deactivating hides it from the create form instead and leaves those projects
  alone.
- Removing a field warns that existing entered values become invisible — they
  stay in the record and reappear if the field comes back.
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
