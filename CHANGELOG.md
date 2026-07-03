# Changelog

Completed durable project changes only. Unfinished/deferred/risky work belongs in `PROJECT_STATE.md`.

## 2026-06-29 01:06 Asia/Kolkata - Removed legacy `aether-data.js` runtime dependency

Area: reader / docs

Summary:
- Removed the `aether-data.js` script from `index.html`.
- Moved legacy bundled sample/mock data to `deleted/js/subscription/aether-data.js`.
- Added an empty runtime data contract in `js/subscription/config.js` so the reader starts with no local sample stories, updates, calendar, notifications, quotes, milestones, or studio analytics.
- Replaced mock studio preview routes with Admin CMS redirects/empty states.
- Replaced remaining hardcoded recap/extras/story-update fallback content with honest backend-only empty states.
- Updated reader docs, AGENTS guidance, and the subscription function index.

Files changed:
- `index.html`
- `js/subscription/config.js`
- `js/subscription/aether-app.js`
- `js/subscription/views/account-access.js`
- `js/subscription/views/story-reader.js`
- `js/subscription/views/studio-preview.js`
- `deleted/js/subscription/aether-data.js`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/SUBSCRIPTION_FUNCTION_INDEX.md`
- `AGENTS.md`
- `CHANGELOG.md`
- `PROJECT_STATE.md`

## 2026-06-29 00:54 Asia/Kolkata — Documentation baseline and project memory workflow

Area: docs / shared

Summary:
- Rebuilt the active documentation set after stale-file cleanup.
- Expanded `docs/CODEBASE_OVERVIEW.md` with detailed subscription reader architecture, script order, module ownership, route groups, reader invariants, admin monolith notes, and verification commands.
- Added dedicated function indexes for subscription and admin code.
- Added a generated Supabase database context snapshot with schemas, policies, storage buckets, and RPC definitions.
- Added `CHANGELOG.md` and `PROJECT_STATE.md` as durable project memory files.
- Updated `AGENTS.md` to require reading/updating the new docs, changelog, and project state files.

Files changed:
- `docs/CODEBASE_OVERVIEW.md`
- `docs/SUBSCRIPTION_FUNCTION_INDEX.md`
- `docs/ADMIN_FUNCTION_INDEX.md`
- `docs/DATABASE_CONTEXT.md`
- `CHANGELOG.md`
- `PROJECT_STATE.md`
- `AGENTS.md`
