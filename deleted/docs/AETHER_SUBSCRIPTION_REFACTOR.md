# Aether Subscription Reader Refactor

This bundle mechanically splits the uploaded `js/subscription/aether-app.js` monolith into classic browser scripts loaded by `index.html`.

No framework, bundler, or runtime dependency was added. The final `js/subscription/aether-app.js` is now only the init/bootstrap section and must be loaded last.

## Module map

- `js/subscription/config.js`: safe storage (sandbox-proof), site config / data refs
- `js/subscription/state.js`: persona / access model, store
- `js/subscription/auth.js`: Supabase auth bridge (temporary until full module split)
- `js/subscription/backend.js`: Supabase story/catalog bridge
- `js/subscription/utils.js`: site themes, access-state resolver, icons, cover art generator, UI primitives, small helpers, shared card builders
- `js/subscription/chrome.js`: shared partials, toasts
- `js/subscription/router.js`: router, views registry
- `js/subscription/views/home-library.js`: HOME, LIBRARY, HOME (override: book-centered living feed)
- `js/subscription/views/story-reader.js`: STORY HUB, CHAPTER SHELF, READER, RECAP, EXTRAS, STORY UPDATES
- `js/subscription/views/account-access.js`: UPDATES FEED, CALENDAR, COLLECTIONS, VAULT, MY SHELF, NOTIFICATIONS, BENEFITS, ONBOARDING
- `js/subscription/views/help-support.js`: HELP, SUPPORT
- `js/subscription/sheets.js`: sheets, SHEETS (builders)
- `js/subscription/events.js`: ACTIONS, reader-only re-render (keep scroll), after-render hooks, global listeners
- `js/subscription/views/studio-preview.js`: AETHER STUDIO (author CMS) views
- `js/subscription/aether-app.js`: init

## Script order

The updated `index.html` loads `site-config.js`, Supabase, `aether-data.js`, then the extracted modules in dependency order, ending with `js/subscription/aether-app.js`.

## Contracts intentionally preserved

- Hash routes are preserved.
- `data-nav`, `data-read`, `data-preview`, `data-lock`, `data-sheet`, `data-act`, and other delegated action attributes are preserved.
- Supabase RPC names are preserved: `get_chapter_catalog`, `get_reader_chapter`, `get_my_entitlements`, `redeem_access_key`.
- The production reader still avoids local sample/mock fallback content when Supabase is unavailable or empty.
- Visual markup was not redesigned.

## Apply

Copy the contents of this bundle over the repo root, preserving the `js/subscription/` paths.

## Validate

Run:

```powershell
node --check js/subscription/config.js
node --check js/subscription/state.js
node --check js/subscription/auth.js
node --check js/subscription/backend.js
node --check js/subscription/utils.js
node --check js/subscription/chrome.js
node --check js/subscription/router.js
node --check js/subscription/views/home-library.js
node --check js/subscription/views/story-reader.js
node --check js/subscription/views/account-access.js
node --check js/subscription/views/help-support.js
node --check js/subscription/sheets.js
node --check js/subscription/events.js
node --check js/subscription/views/studio-preview.js
node --check js/subscription/aether-app.js
```
