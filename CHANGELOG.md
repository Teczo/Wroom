# Changelog

## 2026-08-30

- The landing page is laid out the way the new design draws it. The words are on
  the left, your portrait stands in the middle, and the terminal sits on the
  right with the Currently Building note pinned under it. On a phone the picture
  and the terminal both go, as they did before, and the words carry the page.
- Home is in the navigation now, and the current page is marked with a lit dot
  under its name rather than a line. Home lights only on the front page — a
  project page lights Work.
- The wordmark has its `</>` mark beside it, in the bar and at the top of the
  phone menu.
- The featured work has a proper heading — a My Work label, the title at full
  size, your intro line under it, and a View all projects button that goes to the
  full list. On a phone the button sits under the heading at full width.
- The project cards keep their screenshot across the top of the card, and now
  carry the project's icon beside its name and an arrow in the picture's corner.
  A project with no icon simply starts at its name.
- Three things the new design has no place for are gone from the page: the code
  pane, the BUILD / READY readout and the phone of app icons. Nothing you wrote
  has been deleted — all of it is still on the landing record, so any of them can
  come back.

- The landing page can now say the things the new design shows and the portal
  had nowhere to write. All of it is edited on the landing tab and published the
  usual way — none of it is typed into the site.
- There is a pill above the headline for what you are, separate from the
  disciplines list, which is what you do.
- Two buttons under the statement. The first goes to the work list. The second
  hands over your CV: upload a PDF on the same tab, mark it public, and the
  button appears. Without both a label and a published file there is no second
  button, because a download that downloads nothing is worse than none.
- A row of tech marks under the buttons, with a line above it you write, drawn
  from the media library in the order you set.
- A band of counts between the hero and the work — a glyph, a number and what it
  counts, up to six of them. Nothing here is measured: Wroom counts no clients
  and times no career, so these say what you type until you type something else.
  Two per row on a phone.
- The terminal has a window bar now, with three lights and the session name you
  write beside them.
- The site header has a button on the right whose words you write, going to the
  contact page. On a phone it sits at the foot of the menu rather than squeezing
  into the bar beside the hamburger.
- Every one of these disappears completely when it has nothing written in it —
  no empty heading, no placeholder.
- The media library has a new group, stat glyphs, for the icons beside those
  counts. Nothing is seeded into it; add the marks you want in the portal.
- Swapping the CV or the portrait for a different file, or unpublishing the page,
  now takes the old file out of public storage — and checks every published page
  before it does, so a picture two pages share does not vanish from one because
  the other stopped using it.

## 2026-08-29

- The portrait on the landing page is much larger and now sits as part of the
  composition rather than beside it: it rises into the foot of the terminal
  panel, has a soft light behind it, and its lower edge fades into the page
  instead of stopping at a straight line. Where a project has an app icon, the
  phone sits over its lower right corner instead of squeezing it sideways. The
  phone-width layout is unchanged — the whole composite is still dropped there.

## 2026-08-26

- Wroom can now be connected to Claude as a custom connector, so a brainstorm
  ends with "put this into Wroom" instead of a form. Claude first asks what
  already exists — the products, the project type keys and the slugs in use —
  then shows you a plan of exactly what it would create and change, and writes
  nothing until you say go. Running the same brainstorm twice will not
  duplicate anything.
- The connector can only do those three things. It cannot read costs, revenue,
  time, credentials, infrastructure or enquiries, and the list of what it can
  reach is fixed in code rather than left to a setting.
- Anyone connecting has to sign in through Auth0 first; the connector's address
  on its own gets you nothing.
- A service signing in to the API no longer appears in the team as a person.
  Previously the first thing to authenticate against an empty database became
  the owner, which would have handed that role to a robot.
- The connector deploys itself when its code changes on main, the same way the
  API already does. It is not a Vercel project — Vercel still hosts the two
  websites and nothing else.
- A whole brainstorm can now become a real project in one call. Send a product,
  a project and its features together and the API creates all three — instead of
  filling in the portal's create form after the thinking is already done. There
  is a preview that shows exactly what would be created and what already exists
  without writing anything, and a commit that does the work. Running the same
  payload twice does not duplicate anything: the second run updates what
  changed and leaves everything else alone. Nothing is ever deleted.
- Features that arrive this way can wait on each other by name, the same way
  they can in a features spreadsheet, and the two importers now share one piece
  of code for working that out rather than having a copy each.
- There is no screen for this yet — it is the API the assistant integration will
  call.

## 2026-08-25

- A project's public page has been rebuilt to the new design. The hero is now a
  two-column split: the category chip, the name with its last word in green, the
  tagline, the overview and the buttons on the left, and a large screen shot on
  the right with a strip of thumbnails under it. Tapping a thumbnail changes the
  big picture. On a phone the picture goes edge to edge and the thumbnails
  become a row you swipe.
- The capabilities cards you write in the portal now actually appear on the
  page, each with its icon from the library. The grid narrows to fit however
  many cards there are, down to one column on a phone.
- The demo video, the key modules, the headline number and the quote now sit in
  one row together, with the number and the quote in a single card the way the
  design shows. Any of them missing and that part simply is not there.
- Case study cards now lead somewhere. Each one opens its own page with the
  problem, your role, the approach, the outcome, whatever numbers you recorded
  and the quote — at /work/<project>/case/<case-study>. A card whose study has
  been taken down says so and points back at the project.
- The whole public site has been rethemed to the darker, lime-green look: a
  near-black page with a faint grid behind it, panels lit from one corner, and
  a header that now stays at the top of the screen as you scroll.
- A project that has a short description but no portfolio paragraph yet now
  shows the short description under its title, instead of a bare heading.
- Fixed a bug that was quietly erasing project data. Changing a project's
  portfolio visibility — the dropdown you use right before publishing — was
  wiping its short description, tech stack, tags, phase, repo and every
  portfolio field, because the save sent one field and the API filled in all
  the others at their blank defaults. Any edit you made before flipping that
  dropdown was lost, which is why published pages kept coming out empty.
- The same fault affected every "save one field" action in the portal, not just
  that one. Saving a single field now changes that field and nothing else.
- The portfolio editor is reachable again. The screen where you write a
  project's category, tagline, overview, capability cards, key modules, demo
  video, case studies and tech marks had no link anywhere in the portal — the
  page existed but you could only get to it by typing the address. There is now
  an "Edit the portfolio page" link in the Portfolio box on the project page.
- Every card on a project's feature board has a "Copy ticket" button. Pressing
  it puts a full, written-out ticket on the clipboard — the ref and title, the
  project, its repo and stack, the branch name to work on, the card's priority,
  size and labels, the scope and exit criteria as you wrote them, what the
  feature waits on, and every other feature on the project marked as not to be
  built. That is the text you were retyping by hand before starting a feature.
- If a dependency is not finished, the ticket says so by name and tells whoever
  picks it up to stop rather than build around it.
- A card with no description or acceptance criteria still copies, with
  "(none written)" where the words should be — the gap is meant to be visible.
- The button says "Copied" for a couple of seconds so you know it worked, and
  says so plainly if the browser refuses to copy instead of doing nothing.

## 2026-08-24

- A link to the site pasted into LinkedIn, Slack, WhatsApp, iMessage or an
  email now unfurls as a real card. A project link shows that project's name,
  its short description and its image; the front page shows the title and
  description you wrote on the landing record. Before this, every link showed
  the same "Teczo — Work" with no picture, because the people unfurling it do
  not run the site's JavaScript.
- The card follows what is published. Change a project's short description,
  publish, and the next unfurl says the new words — within about five minutes,
  which is how long the edge holds the old one.
- A project with no image of its own falls back to its hero shot, and a project
  with neither unfurls as a plain text card rather than an empty grey box.
- If the API is slow or down, the page still loads exactly as before with the
  default wording. Nothing about this can make the site fail to open.

- Signing in to the portal lands you on a working dashboard. It used to show
  "That did not load — sign in to continue" the first time and only work
  after you pressed Try again.
- About, Skills and Contact are live pages now, and every word on all three is
  something you write in the portal and publish. The about page shows its
  headline and its narrative; the skills page shows your groups, each with its
  tiles; the contact page shows its headline, its intro line, your address as a
  link that opens a mail app, and your social links.
- The contact form sits under that copy. It tells you which box needs attention
  before it sends anything, says "Sending…" while it works, and on success
  replaces itself with a thank-you while the rest of the page stays exactly
  where it was.
- Sending several messages in a short time now says so in plain words, in its
  own colour, and tells you nothing was lost — everything you typed is still in
  the boxes. It no longer looks like a form that silently broke.
- A page you have not published yet says "Page not found" rather than showing a
  shell with nothing in it. That is true of all three pages.
- The skills tiles sit three to a row on a phone. A group you left empty does
  not render its heading.
- The skill and social marks themselves are not drawn yet — the icons you picked
  in the portal cannot reach the public site until publishing resolves them, and
  the same is true of the about portrait. Both need a decision from you first.
- The site opens on a landing page again, built entirely from the published
  landing record: the greeting, the name in the accent colour, the statement,
  the disciplines, the badge and the words on the button are all things you
  write in the portal. Changing the greeting and publishing changes the live
  page — there is no deploy in that loop.
- Beside the hero at desktop width there is a terminal that types out the lines
  you wrote on the same page. It is decoration: a phone never sees it, and with
  reduced motion on, every line is simply there.
- Under that, the projects you have published, as many of them as the landing
  record asks for. One card per screen on a phone that you swipe, with dots
  showing where you are; a snapping row at desktop width.
- Nothing in the hero fades or slides in when the page opens, so the headline is
  on screen as soon as the words arrive rather than a moment after.
- A landing record that has not been published yet takes the hero away and
  leaves the work — no empty headings, no placeholder text. With nothing
  published at all, the row says so.
- The Teczo wordmark in the header now goes to the landing page rather than
  straight to the work list.

## 2026-08-23

- The publish rewrite now sits on top of the current main, so it can go in
  without a hand-merge. Nothing it does changed — the case study page keeps the
  dark colours from the public site rewrite while reading the new snapshot
  shape, where a project can have several case studies and a tech mark is a
  record rather than a word.
- The log entries for the media library and the resized image copies are back.
  Both shipped, but the lines describing them were lost in an earlier merge.
- The four-page site content work now sits on top of the current main, so it
  can go in without a hand-merge. Nothing it does changed — the landing,
  about, skills and contact records keep their per-page structured fields
  alongside the media library and publish work already on main.
- The Marks screen now sits on top of the current main, so it can go in without
  a hand-merge. Nothing it does changed — it still lists, adds, edits and
  refuses to delete an in-use mark, now alongside the rewritten project
  portfolio fields and the site content work already on main.
- The portfolio editor now sits on top of the current main, so it can go in
  without a hand-merge. Nothing it does changed — the portfolio tab still
  authors the chip, tagline, overview, feature cards, key modules, metric,
  testimonial and demo video, now alongside the site content, marks screen and
  resized image work already on main.
- The content editor now sits on top of the current main, so it can go in
  without a hand-merge. Nothing it does changed — the tabs, markdown preview
  and per-page forms still author the landing, about, skills and contact
  records, now alongside the case studies editor, portfolio editor, marks
  screen and public site rewrite already on main.

- A project page now shows the rest of what a project has to say: the demo
  video, the key modules beside it, the headline number, the quote, the case
  studies, the tech and platform marks, and the call to action at the foot.
- The demo video no longer loads YouTube or Vimeo until it is played. Until
  then it is the poster image and a play button, so opening a project page
  fetches nothing from either of them. One of your own uploads plays in place
  with its poster showing and only the first moment of the file fetched.
- Case studies are cards you swipe through on a phone — sector, title, blurb
  and picture. Each card has a Read case study button that is deliberately
  greyed out: those pages are not built yet.
- A project with only two case studies no longer shows arrows under the row.
  Nothing to scroll, nothing to press.
- Any of these sections with nothing behind it does not appear at all — no
  empty heading, no placeholder card.
- The call to action at the foot of a project page uses the wording from the
  landing page's call to action, so it changes with an edit and a publish
  rather than a deploy. It has no heading or sentence above it yet, because
  there is no field to write those in.

## 2026-08-22

- The content editor now has a tab per page — landing, about, skills, contact —
  so switching between them is one tap instead of going back to a list.
- The markdown box has a preview under it, rendered the same way the public
  page will render it, so what you see is what the site will show.
- Each page now has its own form for the parts markdown cannot express: the
  landing hero's greeting, name, statement, disciplines, badge, terminal lines,
  social row, CTA and how many projects it lists; the about headline; the
  contact details; and the skills groups. Each page shows only its own fields.
- Skills are groups of icon and label, with the icon picked from the media
  library and shown beside the name. Groups reorder, items add and remove.
- Saving still only writes the draft. The public site changes when you publish,
  and the page says plainly which of the two states you are in.

- A project can now hold several case studies, added, removed and reordered
  from the portfolio tab. They sit collapsed in a list showing the title, slug
  and sector, and open one at a time — three expanded at once is unreadable on
  a phone.
- Each one carries its own slug, sector, title, summary, hero image, the four
  narrative sections, a metrics list and an optional testimonial.
- The slug fills itself in from the title as you type, and stops the moment you
  type your own — it never overwrites something you chose.
- Two case studies on the same project cannot share a slug. The clash is named
  on the offending row before you press save, and shows even while that case
  study is collapsed, so you do not have to open each one to find it. A case
  study with no slug at all is caught the same way.
- The order you arrange them in is the order that gets saved.

- The project's portfolio tab now authors the whole public page, not just the
  case study. The chip, tagline, overview paragraph and the "Visit Platform"
  link sit at the top; feature cards, key modules, a headline metric, a
  testimonial and a demo video follow.
- Feature cards and key modules can be added, removed and reordered with up and
  down buttons. Each card's icon is picked from the media library, shown as the
  actual mark rather than a key you have to remember.
- Tech and platforms are picked from the media library too, with the mark beside
  each label and a note of the order they will appear in.
- Switching a section off saves it as genuinely absent, so the public page drops
  the whole section rather than showing an empty heading.
- A demo video cannot be saved without a poster image, and the form says so
  before you press save rather than after. Choosing YouTube or Vimeo swaps the
  file picker for an id box.
- The tab is now called Portfolio, because that is what it edits.

- The portal has a Marks screen. Every icon the public site can draw lives
  there, grouped by kind, each one drawn at the size it actually is rather than
  squashed into a uniform box.
- Pasting an SVG shows it immediately on a white swatch and a dark one, side by
  side, so you can see at a glance whether it takes the colour of what it sits
  on or keeps its own. A mark that will not inherit says so.
- The preview shows what will actually be saved, not what you pasted: if a paste
  carries a script, an event handler or a link pointing off the site, it names
  what is about to be stripped. A paste that is not an SVG at all is flagged
  before you hit save rather than after.
- A mark that projects are still using cannot be deleted. The refusal spells out
  how many projects list it in their tech stack, how many list it as a platform,
  and how many products use it as a client logo, and suggests unticking
  "approved for use" instead — which drops it from published pages without
  losing the record.
- A mark's key cannot be renamed once it exists, and the field says why rather
  than letting you try.

- The media library exists in the API. Marks — tech logos, platform icons,
  client and social marks — can be listed, added, edited and deleted at
  `/api/media-library`, so the icons the public site uses are records you manage
  rather than files in the code.
- Any SVG saved to a mark is cleaned on the way in: scripts, `onclick` and every
  other event handler, links pointing off the site, embedded stylesheets and
  `<foreignObject>` are all removed before it is stored. This happens on edit as
  well as on create, because the public site renders that markup as-is.
- A mark that is still being used cannot be deleted. Trying it explains which
  projects or products still reference it, and suggests marking it not-approved
  instead, which drops it from published pages while keeping the record.
- A mark's key cannot be renamed once it exists, because projects point at marks
  by key and nothing rewrites those references.
- The seed now creates the five platform marks and three social marks. They come
  in with no artwork — paste that in from the portal — and running the seed
  again leaves anything already there untouched.
- A project's portfolio entry now holds everything the public site needs:
  a category chip, a tagline, an overview paragraph, an authored "Visit
  Platform" link, feature cards, key modules, a headline metric, a testimonial,
  a demo video, and the tech and platform marks it should show.
- A project can now have several case studies rather than one. Each has its own
  slug, sector, title, summary and hero image alongside the problem, role,
  approach and outcome. Two case studies on the same project cannot share a
  slug — saving that comes back naming the one to change.
- A demo video is refused without a poster image, whichever provider it uses,
  because a video with no poster is a black rectangle until it buffers. One of
  your own uploads needs the file; a YouTube or Vimeo embed needs the id.
- Existing case studies move across on their own: run
  `npm run migrate-case-studies --workspace @wroom/api`. Whatever you wrote is
  kept, the case study takes the project's slug and name, and a project whose
  case study was never filled in ends up with none rather than a blank one.
  Running it twice does the work once, and the old copy is left in the database
  untouched as a backup.
- The case study editor in the portal keeps working exactly as before. It now
  writes the first of the project's case studies; editing the others needs a
  screen that does not exist yet.

- The portal has a Marks screen. Every icon the public site can draw lives
  there, grouped by kind, each one drawn at the size it actually is rather than
  squashed into a uniform box.
- Pasting an SVG shows it immediately on a white swatch and a dark one, side by
  side, so you can see at a glance whether it takes the colour of what it sits
  on or keeps its own. A mark that will not inherit says so.
- The preview shows what will actually be saved, not what you pasted: if a paste
  carries a script, an event handler or a link pointing off the site, it names
  what is about to be stripped. A paste that is not an SVG at all is flagged
  before you hit save rather than after.
- A mark that projects are still using cannot be deleted. The refusal spells out
  how many projects list it in their tech stack, how many list it as a platform,
  and how many products use it as a client logo, and suggests unticking
  "approved for use" instead — which drops it from published pages without
  losing the record.
- A mark's key cannot be renamed once it exists, and the field says why rather
  than letting you try.
- Publishing a project now puts its images on the public site properly. The
  three gates run first, every approved image and its resized copies are copied
  into the public container, and the snapshot is written pointing at those —
  so a portfolio image loads straight from the URL with nothing to sign, and
  caches like any other picture on the internet.
- The published snapshot now carries everything the new project page needs: the
  category chip, tagline, overview, feature cards, key modules, headline metric,
  testimonial, demo video and every case study.
- Tech and platform icons are resolved at publish, so the public site looks
  nothing up. A mark you have not approved for use is left out and the publish
  still goes through — the row shows one fewer icon rather than failing.
- The "Visit Platform" link now comes from what you typed on the project. It
  used to be taken from the primary environment's URL, which is an internal
  detail and should never have been on a public page.
- A project with no OG image of its own gets one made at publish: a 1200x630
  crop of the hero, so a link shared to LinkedIn or Slack unfurls with a proper
  card instead of a cropped-at-random one.
- Unpublishing now deletes the image files before it removes the page. Anyone
  holding an old image URL — a cache, a scraper, a copied link — gets a 404
  rather than the picture.

- Uploading a screenshot, logo or diagram now also produces three resized
  copies — 400, 800 and 1600px wide, in WebP — so the portfolio can send a
  thumbnail-sized file to a thumbnail slot instead of the full-size original.
  Videos and PDFs are left alone, and so are SVGs, which need no resizing.
- A small image is never blown up. A 500px logo gets a 400px copy and two at
  500px, rather than three blurry enlargements.
- An image's real width and height are now read off the file itself, including
  photos and phone screenshots that are stored sideways with a rotation tag.
  What the browser claimed on upload is no longer taken at face value, and
  location data in the file is dropped rather than copied into the resized ones.
- A file that is not really an image is refused with an explanation, instead of
  being registered as a screenshot that never displays.
- Published copies can be moved into the public container and taken out again.
  The public copies get unguessable names, load with no expiring token on the
  URL, and are cacheable. Taking one down deletes the files themselves, which is
  what actually revokes access.
- Deleting an asset now removes its resized copies and any published copies too,
  rather than leaving them behind in storage.
- A new job fills in the resized copies for images uploaded before any of this
  existed: `npm run backfill-asset-variants --workspace @wroom/api`. Running it
  twice does the work once.

- The media library exists in the API. Marks — tech logos, platform icons,
  client and social marks — can be listed, added, edited and deleted at
  `/api/media-library`, so the icons the public site uses are records you manage
  rather than files in the code.
- Any SVG saved to a mark is cleaned on the way in: scripts, `onclick` and every
  other event handler, links pointing off the site, embedded stylesheets and
  `<foreignObject>` are all removed before it is stored. This happens on edit as
  well as on create, because the public site renders that markup as-is.
- A mark that is still being used cannot be deleted. Trying it explains which
  projects or products still reference it, and suggests marking it not-approved
  instead, which drops it from published pages while keeping the record.
- A mark's key cannot be renamed once it exists, because projects point at marks
  by key and nothing rewrites those references.
- The seed now creates the five platform marks and three social marks. They come
  in with no artwork — paste that in from the portal — and running the seed
  again leaves anything already there untouched.

- A project's portfolio entry now holds everything the public site needs:
  a category chip, a tagline, an overview paragraph, an authored "Visit
  Platform" link, feature cards, key modules, a headline metric, a testimonial,
  a demo video, and the tech and platform marks it should show.
- A project can now have several case studies rather than one. Each has its own
  slug, sector, title, summary and hero image alongside the problem, role,
  approach and outcome. Two case studies on the same project cannot share a
  slug — saving that comes back naming the one to change.
- A demo video is refused without a poster image, whichever provider it uses,
  because a video with no poster is a black rectangle until it buffers. One of
  your own uploads needs the file; a YouTube or Vimeo embed needs the id.
- Existing case studies move across on their own: run
  `npm run migrate-case-studies --workspace @wroom/api`. Whatever you wrote is
  kept, the case study takes the project's slug and name, and a project whose
  case study was never filled in ends up with none rather than a blank one.
  Running it twice does the work once, and the old copy is left in the database
  untouched as a backup.
- The case study editor in the portal keeps working exactly as before. It now
  writes the first of the project's case studies; editing the others needs a
  screen that does not exist yet.
- The public site is dark. Background, panels, hairlines, text and a green
  accent all come from one place, so changing the look is one file rather than a
  hunt through components. There is no light mode and no toggle — the dark
  values are the values.
- The site's own fonts are served from our own domain rather than Google's, so
  no visitor's browser has to tell a third party they were here. Space Grotesk
  for headings and navigation, Inter for everything else.
- The navigation collapses into a full-screen menu on a phone. It closes on
  Escape, closes when you follow a link, and the page underneath cannot scroll
  while it is open.
- Every page now has a footer.
- Anyone whose device asks for reduced motion gets no transitions and no
  movement anywhere on the site, set once rather than remembered per component.

- The portfolio's own copy is now four pages rather than three: landing, about,
  skills and contact. Each is a record you edit in the portal and publish when
  it is ready, with no deploy in between.
- Each page now carries structured content alongside its markdown — the landing
  hero's greeting, name, disciplines, badge, social row and CTA label; the
  skills groups; the contact details. Markdown alone could not express those as
  separate things.
- Each page's structured content is checked against that page's own field list.
  Sending the skills shape to the landing page is refused, naming the fields
  that do not belong, instead of quietly saving an empty landing page.
- The public site still cannot see an unpublished page. The request asks the
  database for the published half only — the draft is never loaded, not merely
  left out of the reply — and a page that has never been published answers 404.
- Saving with an empty body no longer blanks a page. It used to write empty
  strings over whatever was there.
- The portal's "draft is ahead of live" badge now notices a change to the
  structured content, not just to the words.

- The portal's navigation now sits in a sidebar down the left of the screen
  instead of across the top. On a phone nothing changes — the bottom bar is
  still there — and the name and sign out move into the sidebar on wider
  screens, so the top bar disappears there entirely.
- The repository now has a README at the root. Anyone landing on the repo can
  see what Wroom is, which of the three apps does what, how to install and run
  it locally, which one-off commands a fresh environment needs, what the two API
  namespaces are and why the split matters, and the rules that govern changes —
  without opening the constitution first.
- The API now has the `sharp` image library installed. Nothing calls it yet
  — this only puts the library in place so image resizing can be built on top
  of it. It has been listed as an approved API dependency all along but was
  never actually added to the package.

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
