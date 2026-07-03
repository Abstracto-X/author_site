# AI Developer Guide

This file is for future AI agents working on this repo.

## First actions for any AI agent

1. Read this `docs/` folder, especially:
   - `PROJECT_OVERVIEW.md`
   - `SECURITY.md`
   - `CONFIGURATION.md`
   - `DATABASE.md`
2. Inspect the active root files, not just historical folders:
   - `index.html`
   - `styles.css`
   - `admin.html`
   - `js/subscription/aether-app.js`
   - `js/subscription/site-config.js`
3. Run after changes:
   ```powershell
   ./tools/check_independence.ps1
   node --check js/subscription/aether-app.js
   node --check js/subscription/aether-data.js
   node --check js/subscription/site-config.js
   ```

## Non-negotiable constraints

- Keep the app plain HTML/CSS/JS.
- Do not add a framework or build step unless the human explicitly approves.
- Do not expose service-role keys in frontend code.
- Do not log OAuth access/refresh tokens.
- Do not store plaintext access keys in the database or docs.
- Do not fetch locked bodies directly from `chapters.content` in browser code.
- Locked/full chapter content must only come through `get_reader_chapter` after DB-side authorization.

## Active path assumptions

The current site was moved to repo root:

- public entrypoint: `index.html`
- stylesheet: `styles.css`
- admin: `admin.html`
- config: `js/subscription/site-config.js`

Do not reintroduce `subscription.html` or `subscription.css` paths unless intentionally adding compatibility redirects.

## How to make changes safely

### Frontend

- Patch `aether-app.js` carefully; it is a large monolith.
- Prefer small targeted edits over broad rewrites.
- Keep feature flags in `site-config.js`.
- Do not hardcode Supabase URLs/keys in app code.

### Database

- Use SQL migrations in `database/sql/` plus documented bootstrap notes in `DATABASE.md`.
- If using direct DB credentials, do not print them.
- Verify with RPC calls and RLS behavior.

### Admin

`admin.html` is currently a temporary/full CMS. It is acceptable for now, but future cleanup should extract a smaller subscription-only admin.

Minimum admin features to preserve:

- story CRUD
- chapter CRUD
- chapter required tier
- public release date
- preview text
- access tiers
- access keys
- manual entitlements
- provider tier mappings

## Expected command checks

```powershell
./tools/check_independence.ps1
node --check js/subscription/aether-app.js
node --check js/subscription/aether-data.js
node --check js/subscription/site-config.js
```

Optional local browser smoke:

```powershell
python -m http.server 4174
Open http://127.0.0.1:4174/index.html in a browser.
```

Expected good signs:

- real backend story appears
- old fixture story names do not appear when backend works
- no console errors from local missing JS/CSS
