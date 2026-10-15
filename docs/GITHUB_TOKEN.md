# GitHub token — one-time setup

The **Create repo & push** button on a hands-off project's CLAUDE.md tab needs
a GitHub token on the API. Without it the button answers *"GitHub is not
connected on this environment yet"* and nothing is created.

What the token is allowed to be used for is fixed in `CLAUDE.md` §8 ("GitHub
writes"). Only the API uses it, only from that portal button, and only to
create a new private repo in your personal account and push the first
`CLAUDE.md` into it. It never writes into a repo that already exists, and it
never reaches the portal or any response.

Do the steps in order. Nothing here is a value to copy from this file — the
only value is the token, and you make it in step 1.

---

## 1. Make the token on GitHub

1. Sign in to GitHub as **yourself** — the personal account the repos should
   belong to.
2. Click your avatar (top right) → **Settings**.
3. In the left sidebar, at the bottom: **Developer settings**.
4. **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
5. Fill in the form:
   - **Token name** — something you will recognise later, e.g. `Wroom API —
     create hands-off repos`.
   - **Resource owner** — your **personal account**, not an organisation.
   - **Expiration** — your choice. Write the date down; step 4 records it.
   - **Repository access** — **All repositories**. It has to be *all*: the
     token must be able to write the first file into a repo that does not
     exist yet when the token is made.
   - **Permissions → Repository permissions**:
     - **Administration** → **Read and write** (creates the repo, sets its
       default branch)
     - **Contents** → **Read and write** (commits `CLAUDE.md`)
     - **Metadata** turns to **Read-only** by itself. Leave it.
     - Leave every other permission at **No access**.
   - **Account permissions** — leave all at **No access**.
6. **Generate token**. GitHub shows the token **once**. Copy it now and keep it
   on the clipboard for step 2 — do not paste it into a file, a chat, a ticket
   or a commit.

## 2. Put it on the API in Azure App Service

The API is the App Service called **`wroom-api`** (the deploy workflow,
`.github/workflows/main_wroom-api.yml`, names it), slot **Production**.

1. Sign in to the Azure portal.
2. Open **App Services** → **`wroom-api`**.
3. In the left menu, under **Settings**: **Environment variables**, tab
   **App settings**. (On older versions of the portal this page is
   **Configuration** → **Application settings**.)
4. **+ Add** (older portal: **+ New application setting**):
   - **Name**: `GITHUB_TOKEN` — exactly this, capitals and underscore.
   - **Value**: paste the token from step 1.
   - Leave **Deployment slot setting** unticked.
5. **Apply** (older portal: **OK**, then **Save**), then confirm. Azure
   restarts the API to pick the setting up; it takes about a minute.
6. If an old setting called `GITHUB_APP_TOKEN` is listed, delete it. Nothing
   reads it any more.

## 3. Check it works

1. In the portal, open a project that is **Hands-off** and has at least one
   CLAUDE.md version on its **CLAUDE.md** tab.
2. Press **Create repo & push**, check the repo name it shows, and confirm.
3. On GitHub, the new repo should be **Private**, on branch **main**, and hold
   one file: `CLAUDE.md`.
4. Back in the portal, the project header shows the repo, and the tab says the
   version was pushed. Pressing the button again is not offered, and the API
   refuses it if called directly.

If it fails, the message on screen says why — an expired or revoked token, a
missing permission, or a repo name already taken. Fix that one thing and try
again.

## 4. Record where it lives

In the portal, **Credentials** → add one for the token:

- **Label** — e.g. `GitHub token — Wroom API`
- **Kind** — `api-key`
- **Stored in** — `Azure App Service wroom-api → Environment variables → GITHUB_TOKEN`
- **Expires** — the date from step 1

Never the token itself — the credentials page refuses a value, by design.

## 5. When it expires

GitHub emails before a fine-grained token expires. Then:

1. GitHub → **Settings** → **Developer settings** → **Personal access
   tokens** → **Fine-grained tokens** → open the token → **Regenerate token**,
   with a new expiration. Copy the new value.
2. Repeat step 2 with the new value (edit the existing `GITHUB_TOKEN` setting
   rather than adding a second one).
3. Update the expiry date on the credential from step 4.

To stop Wroom creating repos altogether, delete the `GITHUB_TOKEN` setting in
Azure and revoke the token on GitHub.

## Local development (optional)

To press the button against a local API, put the same kind of token in
`apps/api/.env` as `GITHUB_TOKEN=`. If that file still has a line called
`GITHUB_APP_TOKEN`, rename it — that name is no longer read. Leave it blank
and the button reports GitHub as not connected, which is fine for everything
else. Pressing it locally creates a **real** repo on your account.
