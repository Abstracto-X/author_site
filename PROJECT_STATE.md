# Project State

Active memory for unfinished work, deferred decisions, risky areas, and follow-up tasks. Completed durable changes belong in `CHANGELOG.md`; current system behavior belongs in `docs/`.

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
