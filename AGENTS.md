# AGENTS.md

## Purpose

This repository is a static Supabase-backed author/reader site. It has two active browser surfaces:

- `index.html` + `styles.css` + `js/subscription/*` for the frequently edited subscription reader.
- `admin.html` as an intentionally monolithic admin CMS that mostly writes content to Supabase.

The backend is Supabase PostgreSQL/Auth/Storage, with setup/migration SQL in `database/sql/` and `supabase/migrations/`.

The repo has been cleaned up: stale/reference material lives under `deleted/` and is not required for runtime.

---

## Mandatory project context workflow

Before starting any normal project task:

1. Read `docs/CODEBASE_OVERVIEW.md`.
2. Read `PROJECT_STATE.md` if it exists.
3. Then read only the relevant detailed context:
   - Reader work: `docs/SUBSCRIPTION_FUNCTION_INDEX.md`.
   - Admin work: `docs/ADMIN_FUNCTION_INDEX.md`.
   - Database/storage/RLS/RPC/auth-query work: `docs/DATABASE_CONTEXT.md`.
4. Inspect `git status --short` before meaningful edits.
5. Locate the exact function/module/DOM area/Supabase call before patching.

Do not rely on chat history as project memory. Use the docs, changelog, and project state files.

---

## Documentation and memory files

| File | Purpose | Update when |
|---|---|---|
| `docs/CODEBASE_OVERVIEW.md` | Current architecture and routing overview for subscription + admin. | Architecture, module ownership, initialization order, major workflows, or runtime structure changes. |
| `docs/SUBSCRIPTION_FUNCTION_INDEX.md` | Function index for `js/subscription/*`. | Reader functions are added, removed, renamed, or meaningfully repurposed. |
| `docs/ADMIN_FUNCTION_INDEX.md` | Function index for `admin.html`. | Admin functions are added, removed, renamed, or meaningfully repurposed. |
| `docs/DATABASE_CONTEXT.md` | Supabase schema, policies, buckets, and RPC/function context. | Schema, RLS, storage bucket/path, trigger, RPC, or query contract changes. |
| `CHANGELOG.md` | Durable completed implementation history. | Completed durable changes only. |
| `PROJECT_STATE.md` | Active memory for unfinished/deferred/risky/follow-up work. | Work is partial, risky, blocked, deferred, or needs manual verification/future cleanup. |

### Durable completed change

A change is durable when it is intended to stay and meaningfully changes implementation or project knowledge, for example:

- Feature or bug fix with lasting behavior change.
- Supabase table/column/policy/function/bucket/storage path change.
- Auth/access/entitlement behavior change.
- Reader module API, initialization flow, global state, route, or data flow change.
- Function added/removed/renamed/repurposed.
- Admin workflow/form/write behavior change.
- Cleanup that permanently changes repository structure.

For durable completed changes:

1. Update the relevant `docs/` file if project knowledge changed.
2. Add a `CHANGELOG.md` entry with date/time, area, summary, and files changed.
3. Resolve/update any related `PROJECT_STATE.md` entry.

### Partial or investigative work

A task is partial/investigative when it is incomplete, exploratory, blocked, temporary, or leaves follow-up work.

For partial/investigative work:

1. Do not add a changelog entry unless a durable change also happened.
2. Update `PROJECT_STATE.md` with status, area, files touched, summary, remaining work, risks/notes, and verification needed.
3. Do not update formal docs unless the user explicitly asks or durable project knowledge changed.

Recommended `PROJECT_STATE.md` entry format:

```md
## YYYY-MM-DD HH:mm Asia/Kolkata — Short title

Status: TODO | IN PROGRESS | BLOCKED | DEFERRED | NEEDS REVIEW | DONE

Area:
- reader | admin | database | docs | shared

Files touched:
- path/to/file

Summary:
- What changed or what was discovered.

Remaining work:
- Concrete next step.

Risks / notes:
- Anything important for the next session.

Verification needed:
- Manual checks still required.
```

---

## Non-negotiable guardrails

1. **No mock DB fallbacks in production surfaces.**
   - Do not show bundled/sample stories, announcements, release calendars, keys, notifications, comments, or progress as a replacement for Supabase data.
   - Empty backend data should render an honest empty/setup state.
   - Legacy `aether-data.js` is archived under `deleted/js/subscription/`; do not restore it or any bundled data as fake database content.

2. **Supabase schema first, frontend second.**
   - If frontend code writes or reads a column/table/RPC/bucket that does not exist, add an idempotent SQL migration first.
   - After schema changes, include `NOTIFY pgrst, 'reload schema';`.
   - Verify schema with `information_schema`, direct selects, or direct RPC calls before declaring done.

3. **Keep admin and subscription reader concerns distinct.**
   - Reader (`index.html`, `js/subscription/*`) must not assume admin privileges.
   - Admin (`admin.html`) can use admin-only workflows guarded by RLS and `public.is_admin()`.
   - Do not expose service role keys or privileged secrets in frontend files.

4. **Storage expectations.**
   - Public-read author buckets: `covers`, `backgrounds`, `chapter-images`, `characters`, `lore`, `maps`, `author`.
   - Reader-owned uploads: `Reader`, using `Reader/<user_id>/...` paths.
   - Browser writes to author buckets should require admin policy checks.

5. **Do not overwrite unrelated work.**
   - Always inspect `git status --short` before meaningful edits.
   - Do not revert user edits or generated migrations unless explicitly asked.
   - If a file looks stale but may preserve context, move/archive/document it rather than deleting blindly.

6. **No new framework/build step unless explicitly requested.**
   - Plain browser JavaScript, HTML, CSS, Supabase JS via CDN.
   - Do not add React/Vue/Angular, bundlers, npm runtime dependencies, or new CDN scripts without explicit approval.

---

## Current architecture notes

### Subscription reader

- Entry: `index.html`.
- Styles: `styles.css`.
- Config: `js/subscription/site-config.js` and `site-config.template.js`.
- Modules: `js/subscription/*.js` plus `js/subscription/views/*.js`.
- Bootstrap: `js/subscription/aether-app.js`, now intentionally tiny and loaded last.
- Runtime data contract: `js/subscription/config.js` initializes empty arrays/objects; Supabase fills real story/update data.

For reader work, preserve script order, global browser-module contracts, route names, delegated `data-*` attributes, RPC names, and localStorage/sessionStorage compatibility unless intentionally migrating them.

### Admin CMS

- Entry: `admin.html`.
- Intentionally monolithic; do not split unless explicitly requested.
- Before changing admin form fields or writes, check `docs/DATABASE_CONTEXT.md` and live schema.
- Keep edits targeted and aligned with existing inline patterns.

### Database and migrations

- Primary SQL folder: `database/sql/`.
- Supabase CLI migration folder: `supabase/migrations/`.
- Edge Functions folder: `supabase/functions/`.
- Use idempotent SQL: `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DROP POLICY IF EXISTS` before recreate.

---

## Verification commands

Run the narrowest useful checks for the touched area.

```powershell
# repo status
git status --short

# reader syntax checks
node --check js/subscription/aether-app.js
node --check js/subscription/config.js
node --check js/subscription/state.js
node --check js/subscription/auth.js
node --check js/subscription/backend.js
node --check js/subscription/utils.js
node --check js/subscription/chrome.js
node --check js/subscription/router.js
node --check js/subscription/sheets.js
node --check js/subscription/events.js
node --check js/subscription/author-studio.js
node --check js/subscription/views/home-library.js
node --check js/subscription/views/story-reader.js
node --check js/subscription/views/account-access.js
node --check js/subscription/views/help-support.js
node --check js/subscription/views/studio-preview.js

# Supabase linked project sanity checks
supabase db query --linked "select id, slug, title, is_published from public.stories order by created_at desc limit 5;" -o table
supabase db query --linked "select * from public.get_chapter_catalog('<story_uuid>'::uuid);" -o table

# Schema inventory if schema-cache errors appear
supabase db query --linked "select table_name, column_name from information_schema.columns where table_schema='public' order by table_name, ordinal_position;" -o json
```

Manual browser verification is preferred over automated browser sessions unless the user explicitly asks for browser testing.

---

## Final response expectations

For project tasks, include:

- What changed.
- Files changed.
- Validation performed.
- Manual verification steps if code/runtime behavior changed.
- Whether `CHANGELOG.md` or `PROJECT_STATE.md` was updated.
- Any remaining follow-up.

Final sanity question before finishing: would someone reading only `docs/`, `CHANGELOG.md`, and `PROJECT_STATE.md` understand the implemented system, completed changes, and unfinished work? If not, update the appropriate file.
