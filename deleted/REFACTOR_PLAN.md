# Refactor Plan

This document is a handoff plan for future cleanup/refactor agents. It is intentionally a plan only: do not treat this file as permission to perform every phase at once.

## Goals

- Make the subscription reader easier to reason about by breaking `js/subscription/aether-app.js` into focused modules.
- Make `admin.html` safer to maintain by first mapping its internal sections, then extracting only if/when explicitly approved.
- Preserve current behavior: no mock database fallbacks, no sample content, Supabase-first data contracts.
- Keep the repo deployable as a static site without a build step.

## Current pain points

- `js/subscription/aether-app.js` is a large monolith mixing config, auth, Supabase queries, routing, rendering, sheets, reader UI, studio preview, and event delegation.
- `admin.html` is a very large single-file CMS with inline CSS/JS and many Supabase table assumptions inherited from the parent project.
- `context/` contains parent project reference docs that are useful but not guaranteed current.
- `subscription-only-site/` appears to duplicate many files/migrations and should be treated carefully until its purpose is confirmed.
- `.tmp/sql/` contains old bootstrap/sample SQL, including sample seed content, and should not be applied to production.

## Hard constraints

- No React/Vue/framework/bundler.
- No new runtime dependencies.
- No local sample/mock fallback data in production reader views.
- Keep Supabase schema/RPC/storage contracts stable unless a migration is included and verified.
- Do not delete `context/` or migrations during refactor.
- Do not rewrite visual design while modularizing.

## Preflight for every phase

Run before edits:

```powershell
git status --short
node --check js/subscription/aether-app.js
```

For DB-touching phases, also run a targeted Supabase check, e.g.:

```powershell
supabase db query --linked "select count(*) from public.stories;" -o table
supabase db query --linked "select proname from pg_proc join pg_namespace n on n.oid=pronamespace where n.nspname='public' and proname in ('get_chapter_catalog','get_reader_chapter','get_my_entitlements','redeem_access_key');" -o table
```

## Phase 0 — inventory and tests, no behavior changes

Owner: main agent or careful explorer.

Tasks:
- Produce a symbol/section map for `aether-app.js`.
- Produce a section map for `admin.html`.
- Record route names, `data-*` action names, Supabase RPCs, localStorage keys, global state objects, and exported/global symbols.
- Create a simple manual test checklist in `docs/TESTING.md` or a temporary section in this plan.

Expected output:
- Updated `docs/REFACTOR_PLAN.md` with an inventory section.
- No code movement.

Validation:
- `node --check js/subscription/aether-app.js`.
- Manual open of `index.html` and `admin.html` if requested.

## Phase 1 — subscription config/data boundary

Write scope:
- `js/subscription/aether-app.js`
- New files under `js/subscription/` only.
- `index.html` script tags if needed.

Target modules:
- `js/subscription/config.js`: read `window.SUBSCRIPTION_SITE_CONFIG`, feature flags, provider flags, constants.
- `js/subscription/state.js`: `store`, localStorage helpers, `authState`, `backendState` definitions only.
- `js/subscription/utils.js`: pure helpers such as escaping, dates, colors, read-time estimation, text block parsing.

Rules:
- Do not change route names or localStorage keys.
- Do not move Supabase calls yet except trivial config access.
- Keep browser-loaded scripts compatible with no bundler. Either use classic global modules or explicit ES modules only if `index.html` is updated carefully.

Validation:
- `node --check` every touched `.js` file.
- Manual: home, library, story page, sign-in sheet opens.

Rollback boundary:
- Revert Phase 1 files only.

## Phase 2 — subscription Supabase/auth module

Write scope:
- `js/subscription/aether-app.js`
- `js/subscription/auth.js`
- `js/subscription/backend.js`
- docs if contracts change.

Move:
- Supabase client creation.
- OAuth callback consumption.
- email/password sign-in/sign-up/recovery/update.
- profile/entitlement refresh.
- Patreon/key redemption helpers if still reader-owned.
- Backend catalog/chapter loading.

Rules:
- Preserve RPC names: `get_chapter_catalog`, `get_reader_chapter`, `get_my_entitlements`, `redeem_access_key`.
- Preserve password recovery behavior and redirect URL cleanup.
- Preserve no-fixture behavior.
- Any new DB assumption requires SQL migration first.

Validation:
- `node --check`.
- Manual: email sign-in sheet, forgot password sheet, library load, story with published chapter, story with no chapters.
- Supabase: direct `get_chapter_catalog` query for a known story.

## Phase 3 — subscription router/chrome/views split

Write scope:
- `js/subscription/aether-app.js`
- `js/subscription/router.js`
- `js/subscription/chrome.js`
- `js/subscription/views/*.js` or a small number of grouped view files.

Move:
- Hash parser/nav/render shell.
- Topbar, bottomnav, sidenav, studio chrome.
- View registry and view functions in groups:
  - `views/home-library.js`
  - `views/story-reader.js`
  - `views/account-access.js`
  - `views/help-support.js`
  - `views/studio-preview.js` only if studio preview remains.

Rules:
- Keep `data-nav`, `data-read`, `data-sheet`, `data-act` contracts stable.
- Do not rewrite HTML structure unnecessarily.
- Preserve desktop side nav and mobile bottom nav behavior.

Validation:
- `node --check`.
- Manual route checklist: `/`, `/library`, `/story/<slug>`, `/story/<slug>/chapters`, `/read/<chapter>`, `/vault`, `/help`, `/calendar`.

## Phase 4 — event delegation and sheets

Write scope:
- `js/subscription/aether-app.js`
- `js/subscription/events.js`
- `js/subscription/sheets.js`

Move:
- Sheet builders.
- `openSheet`/`closeSheet`.
- `delegate()` and `handleAct()`.
- Toast helper if appropriate.

Rules:
- Keep all action strings stable.
- Keep form mode strings stable: `signin`, `signup`, `recover`, `update`.
- Avoid duplicate listeners after hot reload/manual reload.

Validation:
- Manual: account sheet, signup sheet, forgot password sheet, redeem key sheet, settings sheet, reader settings.

## Phase 5 — admin CMS stabilization before extraction

Do not split `admin.html` yet unless explicitly requested.

First pass tasks:
- Add a section map comment block near the admin script start if helpful.
- Identify DB table ownership for each admin section.
- Verify all admin-written fields exist in migrations.
- Remove placeholder image URLs only if replacing with existing UI fallback and user approves.

Potential future extraction options:
- Keep single HTML but move JS to `js/admin/` only if deployment allows and user approves.
- Or keep single-file architecture and internally reorganize by comments/functions only.

Validation:
- Manual admin login.
- Story create/update.
- Chapter create/update.
- Image upload to `covers`, `backgrounds`, `chapter-images` if uploader exists.
- Character/lore/maps screens if retained.

## Phase 6 — stale duplicate cleanup

Candidate cleanup areas, pending user approval:

- `.tmp/sql/`
  - Contains old bootstrap/sample SQL including seed sample content.
  - Recommendation: archive outside repo or delete only after confirming it is not needed.

- `subscription-only-site/`
  - Appears to duplicate database/supabase assets from an older/parallel project.
  - Recommendation: decide whether it is a retained deployment package. If not, remove in a dedicated cleanup commit after comparing unique files.

- `context/ORIGINAL_SUBSCRIPTION_BUNDLE.md`
  - Very large parent bundle reference.
  - Recommendation: keep until refactor completes, then replace with concise docs if no longer needed.

- Root planning files:
  - `NEW_PROJECT_AI_PROMPT.md`, `INDEPENDENCE_REQUIREMENTS.md`, `PACKAGE_MANIFEST.md`, `TODO.md`.
  - Recommendation: keep for now; consolidate into `docs/` after confirming what still applies.

- `js/subscription/aether-data.js`
  - Contains legacy fixtures and UI reference data.
  - Recommendation: do not delete until all remaining icon/static references are migrated. Remove story/calendar/sample arrays only after verifying no runtime reference remains.

## Suggested subagent execution protocol

When handing Phase 1+ to a subagent:

1. Give exactly one phase at a time.
2. Specify write ownership.
3. Include this line: "You are not alone in the codebase; do not revert unrelated edits."
4. Require `node --check` results and changed-file list in its final reply.
5. Main agent reviews diff before sending the next phase.
6. If the subagent hits uncertainty, it must stop and report instead of guessing.

Suggested model for mechanical extraction:
- `gpt-5.4-mini` with `xhigh` reasoning only after this plan is stable and the target phase is narrow.

## Manual verification checklist after each implemented phase

Reader:
1. Open `index.html` or deployed subscription site.
2. Confirm no setup error when published stories exist.
3. Confirm no sample/mock announcements/calendar/content appears.
4. Confirm library and story pages render from Supabase data.
5. Confirm a published chapter opens.
6. Confirm locked/no-access state still opens the access sheet.
7. Confirm account, forgot password, and settings sheets open.
8. Confirm desktop side nav and mobile bottom nav still appear in the right breakpoints.
9. Check browser console for errors.

Admin:
1. Open `admin.html`.
2. Sign in as admin.
3. Create/update a story with `world_title` and `loader_theme`.
4. Create/update a chapter.
5. Upload cover/background images.
6. Check console for schema-cache or RLS errors.

Database:
1. Verify story rows and chapter catalog:

```powershell
supabase db query --linked "select s.slug, s.is_published, count(c.id) as chapters from public.stories s left join public.chapters c on c.story_id=s.id group by s.id order by s.created_at desc;" -o table
```

2. Verify schema cache after migrations:

```powershell
supabase db query --linked "notify pgrst, 'reload schema';" -o table
```
