## Project Configuration

- **Language**: None
- **Package Manager**: npm
- **Add-ons**: vitest, sveltekit-adapter

---

# Inventaire — Inheritance Inventory App

## Purpose

A mobile-first web app to create, update, and manage an inventory of belongings
in the context of an inheritance/succession. Family members can browse items,
express their desire to receive each one (1–5 stars), leave comments, record
estimated value, and eventually record the final attribution of each item.

The inventory data lives entirely in a **Google Spreadsheet** owned by the
user's Gmail account — this app is a purpose-built UI on top of that
spreadsheet, not a separate database. The spreadsheet remains the single
source of truth and stays editable directly in Google Sheets if needed.

## Architecture

- **Static, client-side-only app.** No backend server, no database, no
  Docker. Everything runs in the browser and talks directly to Google APIs.
- **Stack:** SvelteKit configured for static output (`adapter-static`),
  built with Vite. Plain CSS or a lightweight utility approach — keep it
  simple, mobile-first (design for phone screens first, enhance for larger
  screens).
- **Hosting:** any static file host (e.g. GitHub Pages, Netlify, Cloudflare
  Pages, or just opened locally) — the build output is a folder of static
  assets.
- **Auth:** Google Identity Services (GIS) OAuth 2.0, client-side only
  (implicit/PKCE flow with a public OAuth client ID — no client secret in
  the app). The user signs in with their Gmail account and grants scopes for
  Google Sheets and Google Drive (photo storage). The access token is kept
  in memory / `sessionStorage` only,
  never persisted long-term, and the user re-authenticates when it expires.
  There is no server-side token refresh — this is a deliberate tradeoff for
  keeping the app fully static.
- **Data access:** Google Sheets API v4, called directly from the browser
  with the OAuth access token. No other backend calls.

## App structure — three parts

### 1. Settings

- Sign in / sign out with a Google account.
- Specify which spreadsheet to use (by URL or picker/ID).
- Specify which tab(s) of that spreadsheet represent inventory
  categories/rooms (by default, every tab is treated as a category).
- Define the **column mapping** for the sheet: the app must not hard-code
  column names. Users can specify which column header corresponds to each
  logical field the app understands:
  - `designation` — item description
  - `photo` — item picture
  - one or more **desire columns** — a configurable list of person names,
    each holding that person's desire for the item on a 1–5 star scale
    (default: `Marion`, `Florent`, `Fanny`, `Antoine`)
  - `commentaires` — free-text comments
  - `estimation` — estimated price (€)
  - `attribution` — final attribution (must be one of the configured
    person names)
- Settings (spreadsheet ID, tab list, column mapping, person list) are
  persisted locally in the browser (`localStorage`), not in the spreadsheet
  itself, since they're per-device UI configuration.
- The default structure to support out of the box (used to pre-fill
  settings, not hard-coded elsewhere):

  | designation | photo | Marion | Florent | Fanny | Antoine | Commentaires | estimation | attribution |
  |---|---|---|---|---|---|---|---|---|

  One tab per category/room.

### 2. Listing

- Browse inventory items across tabs/categories, filterable by tab.
- View, edit, and delete items directly against the source spreadsheet
  (writes go straight to Google Sheets via the API — no local copy of
  record data is kept as a source of truth).
- Desire fields render as a 1–5 star control per configured person.
- Mobile-first list/card UI; must be usable one-handed on a phone.

### 3. Adding

- Take a picture with the phone camera (or pick from gallery) using the
  browser's native file input / `capture` attribute.
- Fill in the remaining fields (designation, desires, comments,
  estimation) and pick the target tab/category.
- Submit appends a new row to the selected tab in the source spreadsheet.

## Photo handling

- Photos are stored in **Google Drive**, in a dedicated folder (created/used
  by the app) on the same Google account. The `photo` column stores a
  reference to the Drive file, not the image bytes.
- Two ways to attach a photo:
  - **Capture/upload new**: resize/compress the photo client-side
    (canvas-based downscale + JPEG compression, e.g. max dimension
    ~1600px) to keep uploads fast on mobile, then upload it to the app's
    Drive folder via the Drive API
    (`https://www.googleapis.com/upload/drive/v3/files`).
  - **Pick an existing photo**: use the **Google Picker API** to let the
    user browse and select an existing file from their Drive. Picker
    grants the app access to only the specific file(s) picked, which is
    compatible with the narrow `drive.file` scope (no broader Drive access
    needed).
- After upload, set the file's sharing permission to **"Anyone with the
  link can view"**. This is required because Google Sheets' `=IMAGE()`
  formula is fetched by Google's own servers, unauthenticated — it cannot
  read a private Drive file even if the sheet owner has access to it.
- Store the cell value as
  `=IMAGE("https://drive.google.com/thumbnail?id=FILE_ID&sz=w1600")` so the
  photo renders natively as a thumbnail directly in Google Sheets, not just
  inside the app. The `thumbnail` endpoint is used rather than the more
  commonly seen `uc?export=view`, because the latter can respond with a
  redirect/attachment disposition that Firefox aborts when embedded in an
  `<img>` tag (`NS_BINDING_ABORTED`); `thumbnail` is Drive's endpoint built
  for embedding and doesn't have that problem in either `<img>` tags or
  Sheets' `IMAGE()`. The app always re-derives this URL from the Drive file
  id at render time (`resolvePhotoUrl`) rather than trusting whatever URL
  happens to be stored, so photos saved under the old format still display
  correctly without needing to be re-uploaded.
- When replacing a photo, delete (or leave orphaned, TBD) the previous
  Drive file to avoid unbounded storage growth — prefer deleting the old
  file after a successful re-upload.

## Non-goals / constraints

- No backend server, no serverless functions, no database, no Docker.
- No server-side OAuth token refresh — session-based re-auth is acceptable.
- Don't hard-code column names or the person list anywhere in app logic —
  always resolve through the Settings-configured mapping.
- Keep the spreadsheet human-editable and authoritative; the app should
  degrade gracefully if a cell/column is missing or a tab doesn't match
  the expected shape.

## Dev environment

- Lightweight local dev setup, Windows-first, **no Docker**.
- Prerequisite: Node.js + npm installed on the machine.
- PowerShell scripts (`.ps1`) in a `scripts/` folder wrapping standard npm
  commands, e.g.:
  - `scripts/dev.ps1` → `npm install` (if needed) + `npm run dev`
  - `scripts/build.ps1` → `npm run build` (produces static output)
  - `scripts/preview.ps1` → `npm run preview` (serve the static build
    locally)
  - `scripts/test.ps1` → `npm run test`
- Testing: keep it minimal — component/unit tests for column-mapping
  logic and image compression, run via Vitest. No heavy e2e infrastructure
  unless the project grows to need it.

## Google Cloud setup (required once, outside this repo)

### What is a Google Cloud project?

A **Google Cloud project** is a container that groups credentials, enabled
APIs, and quotas under one identity at Google. It's free to create and
doesn't require enabling billing for the APIs this app uses (Sheets,
Drive, Picker all have a free tier that's more than enough for personal
use). This app needs exactly one project — it's where we'll:

1. Enable the specific Google APIs the app calls.
2. Create the credentials (OAuth Client ID + API key) the app uses to
   authenticate as the signed-in user and call those APIs.
3. Configure the OAuth "consent screen" — the permission dialog the user
   sees when signing in — including which Google account(s) are allowed to
   use it while the app is unpublished/in testing.

None of this touches this repo directly; it's account/console
configuration that produces a few string values (Client ID, API key) that
get pasted into the app's config (e.g. an `.env` file, not committed).

### Step-by-step setup

1. **Create the project**
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
     and sign in with the Gmail account that will own the inventory
     spreadsheet.
   - Click the project dropdown (top bar) → **New Project**.
   - Give it a name (e.g. `inventaire-succession`) and click **Create**.
   - Once created, select it from the project dropdown so it's the active
     project for the next steps.

2. **Enable the required APIs**
   - In the left menu, go to **APIs & Services → Library**.
   - Search for and enable, one at a time:
     - **Google Sheets API**
     - **Google Drive API**
     - **Google Picker API**

3. **Configure the OAuth consent screen**
   - Go to **APIs & Services → OAuth consent screen**.
   - User type: **External** (Internal is only available for Google
     Workspace organizations).
   - Fill in the required fields: app name (e.g. "Inventaire"), user
     support email, developer contact email.
   - Add the scopes used by the app:
     - `.../auth/spreadsheets`
     - `.../auth/drive.file`
   - Under **Test users**, add the Gmail account(s) of everyone who will
     use the app (yourself and family members). While the app is
     unpublished (the default, and fine for this private use case), only
     these listed accounts can sign in — this avoids needing Google's
     public app verification review.

4. **Create the OAuth 2.0 Client ID**
   - Go to **APIs & Services → Credentials → Create Credentials → OAuth
     client ID**.
   - Application type: **Web application**.
   - Under **Authorized JavaScript origins**, add every URL the app will
     be served from, e.g.:
     - `http://localhost:5173` (SvelteKit's default Vite dev port)
     - the production static hosting URL (e.g. a GitHub Pages/Netlify
       URL), once known
   - Click **Create**. Copy the generated **Client ID** — this is a public
     value, safe to embed in the static app's config.

5. **Create an API key (for the Google Picker API)**
   - Go to **APIs & Services → Credentials → Create Credentials → API
     key**.
   - Copy the generated key.
   - Click **Edit** on the new key and restrict it:
     - **Application restrictions**: HTTP referrers, listing the same
       URLs as the OAuth origins above.
     - **API restrictions**: restrict the key to the **Google Picker API**
       only.
   - This key is also safe to embed client-side once restricted, since it
     only unlocks the Picker UI, not data access on its own.

6. **Record the values for the app**
   - You should now have two values: the **OAuth Client ID** and the
     **Picker API key**. These go into the app's local config (e.g. a
     `.env` file per the Dev environment section) — never commit them
     alongside secrets that aren't meant to be public, though note both
     of these specific values are designed to be client-visible.

- Once this is done, the app itself calls:
  - **Google Sheets API**, **Google Drive API**, and **Google Picker API**
    using the OAuth Client ID above for user sign-in/consent and the API
    key for the Picker widget.
- Required scopes:
  - `https://www.googleapis.com/auth/spreadsheets` — read/write access to
    the target spreadsheet.
  - `https://www.googleapis.com/auth/drive.file` — access limited to files
    created by this app (uploads) or explicitly picked by the user via the
    Google Picker (existing photos), rather than the broader `drive` scope
    which would grant access to the user's entire Drive and require
    Google's OAuth verification review.

## Hosting on GitHub Pages

The app is a static bundle, so GitHub Pages (free, no server) is a natural
fit. GitHub Pages serves a **project site** from a subpath —
`https://<username>.github.io/<repo-name>/`, not the domain root — so the
build needs to know that subpath at build time. This is already wired up:
`vite.config.js` reads a `BASE_PATH` environment variable into
`kit.paths.base`, and all internal links (`BottomNav`, the "go to Settings"
prompts) use SvelteKit's `base` from `$app/paths` instead of hardcoded
`/...` paths, so they resolve correctly under a subpath. A `.nojekyll` file
in `static/` is also required, otherwise GitHub Pages' Jekyll processing
silently drops the build's `_app/` folder (any path starting with `_`).

### Step-by-step setup

1. **Push the repo to GitHub**
   - Create a new (private or public — either works) repository on GitHub.
   - From this project folder: `git init`, `git add .`, commit, then
     `git remote add origin <your-repo-url>` and `git push -u origin main`.

2. **Add your Google credentials as repository secrets**
   - The build needs `VITE_GOOGLE_CLIENT_ID` and `VITE_GOOGLE_API_KEY`
     (see Google Cloud setup above) baked in at build time, but `.env` is
     gitignored and never pushed.
   - In the GitHub repo, go to **Settings → Secrets and variables →
     Actions → New repository secret** and add both:
     - `VITE_GOOGLE_CLIENT_ID`
     - `VITE_GOOGLE_API_KEY`

3. **Enable GitHub Pages with the "GitHub Actions" source**
   - Go to **Settings → Pages**.
   - Under **Build and deployment → Source**, choose **GitHub Actions**
     (not "Deploy from a branch").

4. **Use the included workflow**
   - `.github/workflows/deploy.yml` is already set up: on every push to
     `main` it installs dependencies, builds the app with
     `BASE_PATH=/<repo-name>` (derived automatically from the repository
     name) and the two secrets above, then publishes the `build/` folder
     via GitHub's official Pages deploy actions.
   - Push to `main` (or re-run the workflow manually from the **Actions**
     tab) to trigger the first deployment. Once it finishes, the app is
     live at `https://<username>.github.io/<repo-name>/`.

5. **Authorize the GitHub Pages URL in Google Cloud**
   - Back in Google Cloud Console → **APIs & Services → Credentials**,
     edit the OAuth Client ID and add
     `https://<username>.github.io` to **Authorized JavaScript origins**
     (see Google Cloud setup, step 4). Without this, Google will refuse to
     sign the user in from the deployed URL.
   - Also add `https://<username>.github.io` as an **HTTP referrer** on
     the restricted Picker API key (step 5).
   - If the repo/site is meant to stay private to the family, remember the
     OAuth consent screen is still gated by the **Test users** list (step
     3) — being public doesn't mean anyone can sign in, only the Gmail
     accounts you listed there can.

6. **Repo name changes**
   - If you ever rename the GitHub repository, `BASE_PATH` (derived from
     the repo name) changes too, and the authorized origins above don't
     need to change (they're per-domain, not per-path) — no extra steps
     beyond letting the next deploy run.
