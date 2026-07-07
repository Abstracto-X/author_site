# Project State

Active memory for unfinished work, deferred decisions, risky areas, and follow-up tasks. Completed durable changes belong in `CHANGELOG.md`; current system behavior belongs in `docs/`.

## 2026-07-07 00:00 Asia/Kolkata - Manual QA for Supabase-backed Writer demo conversion

Status: NEEDS REVIEW

Area:
- admin
- reader

Files touched:
- `writer.html`
- `js/subscription/backend.js`
- `js/subscription/views/story-reader.js`
- `styles.css`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/ADMIN_FUNCTION_INDEX.md`
- `docs/SUBSCRIPTION_FUNCTION_INDEX.md`
- `CHANGELOG.md`
- `PROJECT_STATE.md`

Summary:
- Writer mock story/tier/chapter data was removed and replaced with Supabase-backed admin loading/writes.
- Writer system-message blocks are now preserved and rendered in the main reader with the SVG system-screen styling.
- Follow-up fix restored visible Writer system-message treatment, editor scrolling, and Draft/Live pills in the editor/list.
- Follow-up compatibility fix converts preexisting `[content]` chapter lines/paragraphs into system-message blocks in Writer and Reader.
- Follow-up layout fix left-aligned the standalone Writer Quill drafting canvas for new chapters.
- Follow-up access fix added a subscription-reader admin override so `profiles.role = 'admin'` can read published gated chapters and sees “Admin access” in home/Vault/account UI without fake entitlement rows. The specific account `abstracto.tales@gmail.com` was verified in the linked DB as `role = admin`.

Remaining work:
- Manual browser QA with a real authenticated admin session and at least one real story.

Risks / notes:
- Syntax checks passed, but no live admin browser session was available in this run.
- `writer.html` currently keeps its active Quill/Supabase logic inline; `js/admin-writer.js` still exists as an unreferenced/alternate helper.

Verification needed:
- Open `writer.html` after signing in via `admin.html`; verify story switching, chapter search, draft creation, the new-chapter cursor/text starts at the left writing margin, autosave/save, publish/update-live, unpublish, tier selection, NSFW external URL validation, cover URL save, and reader display of a `[system message]` block.
- Open the subscription reader as an admin profile with no Patreon/access-key entitlement; verify gated published chapters show Admin Access/read buttons, chapter content loads, Vault shows Admin access, and the account sheet lists Admin reader override separately from entitlements.

## 2026-07-06 01:53 Asia/Kolkata - Manual QA for standalone Writer workspace

Status: NEEDS REVIEW

Area:
- admin
- reader

Files touched:
- `writer.html`
- `js/admin-writer.js`
- `admin.html`
- `js/subscription/router.js`
- `js/subscription/chrome.js`
- `js/subscription/sheets.js`
- `js/subscription/views/home-library.js`
- `js/subscription/views/studio-preview.js`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/ADMIN_FUNCTION_INDEX.md`
- `docs/SUBSCRIPTION_FUNCTION_INDEX.md`
- `CHANGELOG.md`
- `PROJECT_STATE.md`

Summary:
- Created a standalone admin-only Writer page outside the admin monolith and redirected Admin CMS Writer / Chapters plus reader `/studio/write` and `/studio/chapters` to it.
- Writer rail restores full metadata: index, title, word count, live/draft state, tier name, NSFW/external flags, and public release date.
- Editor keeps chapter index/title/content in the main writing surface and access/teaser controls in a compact inspector.

Remaining work:
- Manual authenticated admin-session QA with real chapter/tier data.

Risks / notes:
- Browser smoke verified only the public login gate because no authenticated admin browser session was available.
- No Supabase schema or RLS changes were made.

Verification needed:
- Open `writer.html` as an admin and verify story switching, chapter selection, rail collapse/expand, tier names, release tags, NSFW/external tags, local autosave, Save Draft/Save Changes preserving publish state, and Publish setting `is_published = true`.

## 2026-07-06 01:38 Asia/Kolkata - Manual QA for Writer rail redesign and collapse fix

Status: NEEDS REVIEW

Area:
- admin

Files touched:
- `admin.html`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/ADMIN_FUNCTION_INDEX.md`
- `CHANGELOG.md`
- `PROJECT_STATE.md`

Summary:
- Reworked the Writer / Chapters rail again after visual review: restored tier-name visibility, widened chapter cards, improved hierarchy, and replaced the fragile collapse behavior with an explicit layout class so collapsing the rail gives more room to the editor.

Remaining work:
- Open Writer / Chapters in a real authenticated admin session and confirm the chapter rail, tier labels, and collapsed-editor width now feel correct with long titles and long tier names.

Risks / notes:
- The in-app browser could only verify the public admin login page in this session because no authenticated admin session was available there.
- This was frontend/UI behavior only; no Supabase schema changed.

Verification needed:
- Manual admin-session visual QA of expanded rail, collapsed rail, tier label truncation, chapter selection, and editor width after collapse.

## 2026-07-06 01:22 Asia/Kolkata - Manual QA for simplified Admin Writer controls

Status: NEEDS REVIEW

Area:
- admin

Files touched:
- `admin.html`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/ADMIN_FUNCTION_INDEX.md`
- `CHANGELOG.md`
- `PROJECT_STATE.md`

Summary:
- Simplified the Writer / Chapters UI after visual review: flatter chapter list rows, chapter index beside title in the manuscript header, no separate Details tab, and no visible publish checkbox.

Remaining work:
- Open Admin CMS with a real authenticated admin session and confirm the chapter list is visually cleaner and the inline chapter index works with Save Draft/Save Changes and Publish.

Risks / notes:
- Save Draft/Save Changes now preserves existing published state when publishOverride is null; Publish explicitly sets the chapter live.
- This was frontend/UI behavior only; no Supabase schema changed.

Verification needed:
- Manual browser visual QA of chapter selection, index editing/conflict warning, Access/Teaser tabs, draft save, and publish.

## 2026-07-06 01:15 Asia/Kolkata - Manual QA for Admin Writer visual polish

Status: NEEDS REVIEW

Area:
- admin

Files touched:
- `admin.html`
- `CHANGELOG.md`
- `PROJECT_STATE.md`

Summary:
- Polished Writer / Chapters into a cleaner production writing desk: compact story controls, refined chapter sidebar cards, pill tabs, sticky editor header, manuscript sheet, toolbar, canvas spacing, and metadata strip.

Remaining work:
- Open Admin CMS with a real authenticated admin session and confirm the Writer / Chapters section looks right with real chapters at desktop and narrow widths.

Risks / notes:
- This was a visual/layout polish only; no Supabase schema or write contract changed.

Verification needed:
- Manual browser visual QA of chapter selection, collapsed sidebar, Write/Details/Access/Teaser tabs, draft save, and publish buttons.

## 2026-07-05 18:40 Asia/Kolkata - Manual QA for Admin CMS rebuild and rolling access

Status: NEEDS REVIEW

Area:
- admin
- reader
- database

Files touched:
- `admin.html`
- `index.html`
- `js/subscription/config.js`
- `js/subscription/backend.js`
- `js/subscription/router.js`
- `js/subscription/views/home-library.js`
- `js/subscription/views/story-reader.js`
- `database/sql/2026-07-05_cms_rebuild_rolling_access.sql`
- `supabase/migrations/20260705103000_cms_rebuild_rolling_access.sql`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/DATABASE_CONTEXT.md`
- `docs/ADMIN_FUNCTION_INDEX.md`
- `docs/SUBSCRIPTION_FUNCTION_INDEX.md`
- `CHANGELOG.md`

Summary:
- Admin CMS was rebuilt into the subscription cockpit shape requested by `docs/cms_rebuild_plan.md`.
- Added inline/fullscreen rich chapter editor, rolling access policy UI, reader CRM with search/entitlements/redemptions, community view with reader/chapter links, Story Extras launcher, NSFW/external-only fields, and migrations for rolling policies/chapter external metadata.
- Legacy chapter modal entry points now route into the inline/fullscreen Writer / Chapters editor.
- Writer / Chapters was refocused after visual review: the writing surface is now a page-like manuscript editor, while Details, Access, and Teaser controls are separated into tabs instead of being crammed above the editor.
- Writer / Chapters now normalizes pasted/browser-generated line breaks into paragraphs/breaks and accepts Markdown/plain text paste or explicit `Markdown → HTML` conversion alongside safe rich HTML input.
- Site Settings includes reader identity, subscription behavior defaults, guide toggles, provider settings display, and optional global external fallback.
- Reader-side Author Studio scripts were removed from active `index.html` loading and `/studio/*` redirects to `admin.html`.
- Reader startup now loads Admin-authored `reader_behavior` so guide toggles and the optional global external fallback are applied in the runtime reader.
- Applied and re-ran the linked Supabase migration to verify idempotency; verified `story_access_policies` policies, `chapters.is_nsfw`, `chapters.external_url`, and updated chapter RPC signatures.
- Re-ran syntax/static/browser smoke checks after the final provider settings display and legacy chapter-form redirect changes.
- Added rollback-only Supabase verification for chapter catalog/reader RPC behavior with temporary rich-HTML and NSFW/external chapters; verified normal content is returned and NSFW content is withheld while `external_url` is exposed.
- Added rollback-only RLS verification that non-admin authenticated users cannot write `story_access_policies`, admin users can write them, and enabled policies for published stories are readable.

Remaining work:
- Manual browser test with real credentials: Admin login gate, story edit, focused/tabbed Writer / Chapters drafting, rich chapter save/edit, publish-triggered rolling access recalculation, Rolling Access matrix, Readers / CRM, Community, and Story Extras navigation.
- Manual signed-in reader test against real content: a normal rich-HTML chapter, locked/free/tier states, and an NSFW/external chapter.

Risks / notes:
- Rolling access recalculation is implemented client-side in Admin CMS and updates `chapters.required_tier_id`; if multiple admins edit simultaneously, last save wins.
- NSFW chapters still count in rolling positions, but Admin intentionally does not overwrite their tier field during recalculation.
- Admin CRM/community views depend on RLS/admin policies and may show empty/error states until migration and admin session are valid.

Verification needed:
- Real admin browser session and signed-in reader session.
- In-app browser smoke checks on `http://127.0.0.1:4173/admin.html`, `index.html`, and `#/studio/write` now pass for page load, Admin nav visibility, reader script order, `/studio/*` redirect, and no Admin page console errors. Use a real authenticated browser session for write/access/data-flow QA.

## 2026-07-05 07:59 Asia/Kolkata - Manual QA for reader guide and community sync

Status: NEEDS REVIEW

Area:
- reader
- database
- admin

Files touched:
- `index.html`
- `admin.html`
- `styles.css`
- `js/subscription/onboarding.js`
- `js/subscription/aether-app.js`
- `js/subscription/auth.js`
- `js/subscription/author-studio.js`
- `js/subscription/backend.js`
- `js/subscription/events.js`
- `js/subscription/router.js`
- `js/subscription/sheets.js`
- `js/subscription/site-config.js`
- `js/subscription/site-config.template.js`
- `js/subscription/state.js`
- `js/subscription/utils.js`
- `js/subscription/views/account-access.js`
- `js/subscription/views/help-support.js`
- `js/subscription/views/home-library.js`
- `js/subscription/views/story-reader.js`
- `js/subscription/views/studio-preview.js`
- `database/sql/2026-07-05_chapter_reactions.sql`
- `supabase/migrations/20260705074000_chapter_reactions.sql`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/DATABASE_CONTEXT.md`
- `docs/SUBSCRIPTION_FUNCTION_INDEX.md`
- `CHANGELOG.md`

Summary:
- Added a modular feature-gated reader guide overlay and removed production-facing dev/mock/setup copy found by subagent audit.
- Comments now post to Supabase `comments` for signed-in users using the reader profile/account name automatically.
- Added and applied linked Supabase `chapter_reactions` table/RLS migration for DB-backed reader reactions.
- Admin remote placeholder images were replaced with local inline SVG data URLs.

Remaining work:
- Manual browser test with a signed-in reader: post a chapter note, post a paragraph note, react/unreact at chapter end, reload, and confirm comments/reaction counts persist.
- Confirm the reader guide appears for new/local users, highlights sensible UI, can be dismissed, and can be disabled with `features.enableReaderGuides = false`.
- Re-run production UI copy smoke test in a real browser to confirm no confusing setup/mock/dev copy remains visible.

Risks / notes:
- Browser-local bookmarks, quotes, history, and progress remain local storage; this task only DB-backed comments and reactions.
- Visual browser verification was not completed in-app because earlier local browser sessions were blocked; use a normal browser session.

Verification needed:
- Real auth session and Supabase writes for comments/reactions.
- Reader guide behavior at home/library/story/read/vault routes.
- Admin CMS image fallback display after placeholder replacement.

## 2026-07-05 07:32 Asia/Kolkata — Manual responsive layout verification for button containment

Status: NEEDS REVIEW

Area:
- reader
- admin

Files touched:
- `styles.css`
- `js/subscription/chrome.js`
- `admin.html`
- `CHANGELOG.md`

Summary:
- Reader topbar brand text now uses the existing `.btxt` class so site name/tagline truncation styles apply.
- Reader buttons, chips, quicklinks, story hub mobile actions, chapter rows, and chapter catalog cards received mobile containment/wrapping rules to prevent horizontal spill.
- Admin CMS headers, card headers, action button groups, modal footers, buttons, and dense tables received narrow-screen wrapping/scroll containment.

Remaining work:
- Open the reader on a real browser at desktop, tablet, and narrow mobile widths and confirm topbar, bottom nav, story hub, latest chapters, chapter catalog, sheets, and quicklinks have no horizontal spill.
- Open Admin CMS on mobile width and confirm page headers, card headers, modal footers, access-action rows, and data tables wrap or scroll cleanly.

Risks / notes:
- The in-app browser refused local `localhost`/`127.0.0.1` verification with `ERR_BLOCKED_BY_CLIENT`, so visual verification is still manual.

Verification needed:
- Manual browser responsive smoke test at ~390px, ~760px, ~900px, and desktop widths.

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
