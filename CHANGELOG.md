# Changelog

Completed durable project changes only. Unfinished/deferred/risky work belongs in `PROJECT_STATE.md`.

## 2026-07-04 00:48 Asia/Kolkata - Fixed reader mojibake, site identity, and cover images

Area: reader / admin / database / docs

Summary:
- Corrected mojibake in active reader/admin strings so punctuation, bullets, emoji, and separators render properly.
- Renamed the reader/admin identity to `EvilArchives` in local config and saved the production identity in `site_settings.site_identity`.
- Added reader-side loading of `site_settings.site_identity` for site name, tagline, page title, and meta description.
- Improved Admin CMS Site Settings with a production-oriented Reader Identity form backed by `site_settings`.
- Added an idempotent unique index on `site_settings.setting_key` so production settings remain one-row-per-key.
- Fixed reader cover rendering so `stories.cover_image_url` / `cover_url` images display before falling back to generated SVG art.
- Verified the current Supabase cover URL returns HTTP 200.
- Updated architecture, function index, and database context docs.

Files changed:
- `index.html`
- `admin.html`
- `styles.css`
- `js/subscription/config.js`
- `js/subscription/backend.js`
- `js/subscription/utils.js`
- `js/subscription/chrome.js`
- `js/subscription/events.js`
- `js/subscription/sheets.js`
- `js/subscription/views/account-access.js`
- `js/subscription/views/help-support.js`
- `js/subscription/views/home-library.js`
- `js/subscription/views/story-reader.js`
- `js/subscription/site-config.js`
- `database/sql/2026-07-04_site_settings_identity_unique.sql`
- `supabase/migrations/20260704004800_site_settings_identity_unique.sql`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/SUBSCRIPTION_FUNCTION_INDEX.md`
- `docs/ADMIN_FUNCTION_INDEX.md`
- `docs/DATABASE_CONTEXT.md`
- `CHANGELOG.md`

## 2026-07-03 23:03 Asia/Kolkata - Enabled Patreon connect and configured reader tiers

Area: reader / database / provider access

Summary:
- Enabled Patreon in the subscription reader runtime config.
- Updated Patreon entitlement sync so provider mappings can match either actual Patreon tier IDs or exact Patreon tier titles.
- Redeployed `patreon-oauth-start`, `patreon-oauth-callback`, and `sync-provider-entitlements` Edge Functions.
- Verified required deployed secret names are present except optional campaign/webhook values.
- Created/updated active `Resident Licker` and `Resident Tyrant` reader access tiers and Patreon mappings in the linked Supabase project.
- Updated database context with the configured Patreon access tiers and title-matching contract.

Files changed:
- `js/subscription/site-config.js`
- `supabase/functions/_shared/patreon.ts`
- `docs/DATABASE_CONTEXT.md`
- `CHANGELOG.md`

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
