# Project State

Active memory for unfinished work, deferred decisions, risky areas, and follow-up tasks. Completed durable changes belong in `CHANGELOG.md`; current system behavior belongs in `docs/`.

## 2026-07-04 00:48 Asia/Kolkata — Manual browser verification for EvilArchives reader polish

Status: NEEDS REVIEW

Area:
- reader
- admin

Files touched:
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

Summary:
- Mojibake strings were corrected in active reader/admin files.
- Site identity was changed to `EvilArchives` and persisted in `site_settings.site_identity`.
- Reader cover art now prefers real story cover URLs and falls back to generated SVG art on image load failure.
- Admin settings now has a Reader Identity form for production-facing site metadata.
- `site_settings.setting_key` now has a unique index to avoid duplicate global settings.

Remaining work:
- Open the reader in a normal browser session and confirm the header, updates feed, chapter metadata, and support pages show proper punctuation/emoji with no mojibake.
- Open Admin CMS Settings and confirm the Reader Identity form saves/refreshes as expected.
- Open the Chapter Catalog page (from the story view) and verify that the chapters are displayed in a clean grid format, sorted newest first by default, with locked chapters highlighted in a gold/orange glowing card border. Verify clicking anywhere on the card opens/unlocks the chapter correctly.
- Open a story details page (Story Hub) on desktop and confirm that the two-column layout renders correctly: left sidebar containing cover, title, progress bar, follow button; right column containing tagline, Continue CTA, quicklinks, detailed progress card, latest chapters, and cast & glossary. Confirm that the Cast displays characters added in the DB.
- Confirm word counts are shown instead of reading minutes on all screens (story detail latest chapters, tonights reading, catalog cards, reader headers, end-of-chapter next card, and sheets settings).
- Verify the Library page has all quick select chips and Collections link removed.

Risks / notes:
- The in-app browser could not complete localhost verification due browser-side blocking/refusal, so manual browser verification is still needed.
- Supabase cover URL was directly verified with HTTP 200.

Verification needed:
- Reader: redesigned home layout, library/story/chapter/vault/support pages.
- Admin: Settings page Reader Identity form.

## 2026-07-03 23:03 Asia/Kolkata — Patreon webhook/native update follow-up

Status: TODO

Area:
- database
- reader

Files touched:
- `js/subscription/site-config.js`
- `supabase/functions/_shared/patreon.ts`
- `docs/DATABASE_CONTEXT.md`
- `CHANGELOG.md`

Summary:
- Patreon OAuth/connect was enabled and title-based tier matching was deployed for `Resident Licker` and `Resident Tyrant`.
- The generic `provider-webhook` function was intentionally not reworked yet because the user asked to check item 6 after the rest was done.

Remaining work:
- Review whether Patreon-native webhook payloads should be parsed directly instead of requiring the current normalized `provider`, `provider_user_id`, `provider_tier_id`, and `status` payload shape.
- If needed, update `provider-webhook` to verify Patreon signatures and map Patreon webhook events to entitlement grants/revokes.

Risks / notes:
- OAuth + manual resync should use `patreon-oauth-*` and `sync-provider-entitlements`.
- Automatic Patreon revokes/pledge changes may still need webhook adaptation if no external normalizer sends the expected generic payload.

Verification needed:
- Perform a real reader OAuth connect with a Patreon account in `Resident Licker` or `Resident Tyrant`.
- Confirm `/vault` shows the entitlement and gated chapters unlock.

## 2026-06-29 01:06 Asia/Kolkata - Clean up `aether-data.js`

Status: DONE

Area:
- reader
- docs

Files touched:
- `index.html`
- `js/subscription/config.js`
- `js/subscription/aether-app.js`
- `js/subscription/views/account-access.js`
- `js/subscription/views/story-reader.js`
- `js/subscription/views/studio-preview.js`
- `deleted/js/subscription/aether-data.js`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/SUBSCRIPTION_FUNCTION_INDEX.md`

Summary:
- Legacy `js/subscription/aether-data.js` was removed from runtime loading and moved into `deleted/js/subscription/aether-data.js`.
- `config.js` now owns an empty runtime data contract that starts with no bundled stories, updates, calendar, notifications, quotes, milestones, figures, or studio analytics.
- Mock studio dashboard/access/announcement/analytics/settings routes were replaced with Admin CMS redirect/empty states.
- Hardcoded recap/extras/story-update fallback content was replaced with backend-only empty states.

Remaining work:
- None for the `aether-data.js` runtime dependency.

Risks / notes:
- Manual browser smoke testing is still recommended because this was a runtime script-order/data-contract cleanup.

Verification needed:
- Open `index.html` and verify home/library/story/chapter routes load from Supabase.
- Visit `/updates`, `/calendar`, `/collections`, story recap/extras/updates, and `/studio/*` as applicable to confirm no sample content appears.
- Check the browser console for missing `D.*` or `DATA` errors.

## 2026-06-29 00:54 Asia/Kolkata — Decide final fate of `/deleted`

Status: DEFERRED

Area:
- shared
- docs

Files touched:
- `deleted/` archive

Summary:
- Stale/reference files were moved into `/deleted` to keep the runtime root clean.
- `/deleted` is currently an in-repo archive, not runtime code.

Remaining work:
- After the site is verified, decide whether to keep `/deleted` temporarily, commit it as an archive, or remove it permanently.

Risks / notes:
- Parent reference docs under `/deleted/context` and `/deleted/docs` may still be useful for comparison during cleanup.

Verification needed:
- Confirm no active runtime file imports or links to `/deleted`.

## 2026-06-29 00:54 Asia/Kolkata — `.codegraph` cleanup blocked by locked DB

Status: DEFERRED

Area:
- shared

Files touched:
- `.codegraph/` (partially attempted earlier)

Summary:
- `.codegraph/` is not needed for the site runtime.
- Windows had the codegraph DB locked, so it was not moved during stale cleanup.

Remaining work:
- Stop the process using `.codegraph/codegraph.db` if cleanup is still desired.
- Move/delete `.codegraph/` or ensure it is ignored.

Risks / notes:
- Do not kill unknown processes without user approval.

Verification needed:
- Confirm `git status --short` does not include unintended codegraph files.
