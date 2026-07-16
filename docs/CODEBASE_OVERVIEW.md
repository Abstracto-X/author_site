# Codebase Overview

This repo is a static Supabase-backed author/reader site with two active browser surfaces and no frontend build step. It is intentionally small at runtime: browser HTML/CSS/JavaScript, Supabase JS from CDN, Supabase PostgreSQL/Auth/Storage, and SQL files for setup/rebuild documentation.

The active implementation is the source of truth. Anything under `deleted/` is archived historical/reference material and is not needed for the site to run.

---

## 1. Active application surfaces

| Surface | Entry | Audience | Purpose | Editing model |
|---|---|---|---|---|
| Subscription reader | `index.html` | Public readers / members / supporters | Member-facing reader shell for published stories, chapter catalogs, gated chapter reading, auth, entitlement status, access keys, account sheets, help/support, and reader navigation. | Modular classic browser scripts under `js/subscription/`, loaded in dependency order. This is the frequently edited surface. |
| Admin CMS | `admin.html` | Author/admin | Single-page CMS for Supabase content management: stories, rolling access, media URLs/uploads, characters, lore, maps, timeline content, reader tiers, access keys, and settings. | Intentionally monolithic single HTML file except the dedicated Writer workspace. |
| Standalone Writer | `writer.html` | Author/admin | Focused chapter drafting/publishing workspace reachable from Admin CMS and the reader `/studio/write` path. Uses Supabase stories, chapters, reader tiers, admin profile checks, and chapter RLS instead of mock/demo data. Includes the Quill system-message authoring flow, scrollable chapter rail, sortable chapter index, multi-chapter tabs with next-index draft creation, color-coded index-level tier editing, and chapter/system-box deletion controls. | Plain static page with inline classic browser script; uses the same Supabase anon config/profile admin check as `admin.html`. |

---

## 2. Runtime directory map

```txt
index.html                 # subscription reader entry
admin.html                 # admin CMS entry
writer.html                # standalone admin-only chapter writer workspace
styles.css                 # shared/reader-heavy stylesheet
js/admin-writer.js         # legacy/alternate standalone writer helper; current `writer.html` keeps its active logic inline
js/subscription/           # subscription reader modules and config
database/sql/              # human-readable setup/migration SQL
supabase/                  # Supabase CLI config, Edge Functions, migrations
.tmp/sql/                  # retained SQL notes/bootstrap snippets; do not apply blindly
docs/                      # current project docs
deleted/                   # archived stale/reference files not needed at runtime
```

Important cleanup rule: do not pull files back out of `deleted/` unless you have checked they are needed by the current runtime or useful as reference for a specific task.

---

## 3. Subscription reader architecture

The subscription reader is loaded by `index.html` as classic browser scripts, not ES modules. Each module attaches its API to `window.Aether` or another documented global. Script order matters.

### Script loading order

`index.html` currently loads the reader in this order:

1. `js/subscription/site-config.js`
2. Supabase JS CDN
3. `js/subscription/config.js`
4. `js/subscription/state.js`
5. `js/subscription/auth.js`
6. `js/subscription/backend.js`
7. `js/subscription/utils.js`
8. `js/subscription/chrome.js`
9. `js/subscription/router.js`
10. `js/subscription/views/home-library.js`
11. `js/subscription/views/story-reader.js`
12. `js/subscription/views/account-access.js`
13. `js/subscription/views/help-support.js`
14. `js/subscription/sheets.js`
15. `js/subscription/events.js`
16. `js/subscription/onboarding.js`
17. `js/subscription/aether-app.js`

`aether-app.js` is now only the small bootstrap/init file and must stay last.

### Module ownership map

| Module | Responsibility | Notes |
|---|---|---|
| `site-config.js` | Project-specific Supabase URL/anon key and feature flags. | Runtime config file; never put service-role secrets here. |
| `site-config.template.js` | Copyable config template. | Keep keys blank/safe. |
| `config.js` | Safe storage wrapper, runtime site identity, reader behavior settings, config accessors, provider feature gates, DOM helpers. | Handles sandbox-proof `localStorage`/`sessionStorage` fallbacks and applies `site_settings.site_identity` plus `site_settings.reader_behavior` when loaded. |
| `state.js` | Shared reader state objects. | Owns `store`, `authState`, `backendState`, and derived access/persona defaults. |
| `auth.js` | Supabase auth/session/profile/entitlement bridge. | Handles sign in/up/out, password recovery/update, provider flow helpers, profile/entitlement refresh. |
| `backend.js` | Supabase site settings, story/chapter/catalog data loading. | Owns reader identity loading from `site_settings`, published story loading, and RPC calls like `get_chapter_catalog` and `get_reader_chapter`. |
| `utils.js` | Pure-ish UI/data helpers. | Escaping, formatting, icons, cards, access labels, generated cover art, text parsing. |
| `chrome.js` | App shell/chrome partials and toasts. | Top/bottom/side navigation and shell-level UI pieces. |
| `router.js` | Hash route parsing and render dispatch. | Preserves route names and view registry behavior. |
| `views/home-library.js` | Home/library routes. | Published story discovery, hero/library presentation, empty setup state. |
| `views/story-reader.js` | Story hub, chapters, reader, recap/extras/updates. | Chapter access state and reader rendering. |
| `views/account-access.js` | Updates, calendar, collections, vault, shelf, notifications, benefits, onboarding. | Must not render hardcoded fake backend content. |
| `views/help-support.js` | Help/support routes. | Mostly static support copy/forms. |
| `views/studio-preview.js` | Archived/inactive studio placeholder module. | Not loaded by `index.html`; `/studio/*` redirects to `admin.html`. |
| `author-studio.js` | Archived/inactive reader-side author/studio prototype helpers. | Not loaded by `index.html`; useful ideas were ported into Admin CMS. |
| `sheets.js` | Sheet/modal builders. | Account/auth/access/settings/reader sheets. |
| `events.js` | Delegated DOM events and after-render hooks. | Owns `data-act`, `data-nav`, `data-sheet`, reader settings, and global listeners. |
| `onboarding.js` | Feature-gated reader guide overlay. | Modular highlighted walkthrough controlled by `features.enableReaderGuides` and local dismiss state. |
| `aether-app.js` | Bootstrap/init. | Initializes auth/backend/router/events once dependencies are loaded. |

### Reader data flow

1. Browser loads `site-config.js`, Supabase CDN, and the reader modules. `config.js` creates the empty runtime data contract; Supabase fills story/update data later.
2. `aether-app.js` bootstraps the app after all module globals exist.
3. `auth.js` initializes the Supabase client/session and refreshes profile/entitlements when configured. If the loaded profile has `role = 'admin'`, the subscription reader exposes an admin reader override for published chapters without creating fake `user_entitlements`.
4. `backend.js` loads `site_settings.site_identity` and `site_settings.reader_behavior`, then published stories and chapter catalogs from Supabase.
5. `router.js` reads the hash route and calls the registered view renderer.
6. `views/*.js` render HTML using state from `state.js`, data from `backend.js`, and helpers from `utils.js`/`chrome.js`.
7. `backend.js` loads reader community state for open chapters: public comments from `comments` and reaction totals from `chapter_reactions`.
8. Signed-in readers load `reader_notifications` and `reader_notification_preferences`; the Settings sheet can save email/browser chapter alert preferences, and browser notifications are shown while the site is open if permission is granted.
9. `events.js` handles delegated interactions, profile edits/avatar uploads, notification preference saves, comment/reaction writes, and re-renders or opens sheets as needed.
10. `onboarding.js` optionally highlights key UI regions after render when reader guides are enabled; a separate versioned "What's new" sheet appears once per signed-in user after reader updates.

### Reader route groups

Common route groups include:

| Route family | Owner | Purpose |
|---|---|---|
| `/`, `/library` | `views/home-library.js` | Home and story discovery/library. |
| `/story/<slug>` | `views/story-reader.js` | Story hub/details. |
| `/story/<slug>/chapters` | `views/story-reader.js` | Chapter shelf/catalog. |
| `/read/<chapter>` | `views/story-reader.js` | Chapter reader. |
| `/vault`, `/shelf`, `/notifications`, `/benefits`, `/onboarding` | `views/account-access.js` | Member/account/access surfaces. |
| `/updates`, `/calendar`, `/collections` | `views/account-access.js` | Backend-aware update/calendar/collection surfaces; must show honest empty states if no DB data exists. |
| `/help`, `/support` | `views/help-support.js` | Help/support pages. |
| `/studio/write`, `/studio/chapters` | `router.js` | Redirect to `writer.html` for admin chapter drafting. The page still requires an admin profile and Supabase RLS; normal readers receive no privileged behavior. |
| Other `/studio/*` | `router.js` | Redirect to `admin.html`; the old reader-side Author Studio prototype is not an active product surface. |

### Reader invariants

- No local sample story fallback in production reader views.
- No hardcoded announcement/calendar/release/studio analytics cards pretending to be backend data.
- Empty Supabase data must produce honest empty/setup states.
- Preserve delegated attributes: `data-nav`, `data-read`, `data-preview`, `data-lock`, `data-sheet`, `data-act`.
- Preserve RPC names: `get_chapter_catalog`, `get_reader_chapter`, `get_my_entitlements`, `redeem_access_key`.
- Preserve localStorage/sessionStorage key compatibility unless intentionally migrating.
- Do not add a bundler or framework; modules are browser globals loaded by script tags.
- Browser notification popups are permission-gated and only fire from the active reader session; durable server-side notification rows live in `reader_notifications`, and email sends are queued in `reader_email_queue` for the `send-reader-email-queue` Edge Function.

---

## 4. Admin CMS architecture

`admin.html` is intentionally left as a monolith. It contains its own HTML, styles, JavaScript, form renderers, event handlers, and Supabase write logic.

Admin responsibilities include:

- Keeping an embedded Writer / Chapters workspace inside Admin CMS while also offering the standalone `writer.html` workspace.
- Story metadata: title, slug, world title, descriptions, publication state, theme/loader values, covers/backgrounds.
- Chapter content through embedded Admin CMS Writer / Chapters and `writer.html`: admin-authenticated story selector, Supabase-backed chapter index, rich/Markdown editor, autosave/drafts, Save Draft preserving publish state, explicit Publish/Unpublish, tier access controls, NSFW/external-only fields, cover URL, system-message blocks saved in chapter HTML, editor cleanup for extra blank lines, and scene breaks from toolbar commands or standalone `--`. The standalone Writer also keeps a scrollable chapter list in its left rail, opens chapters as closable tabs, supports access-tier changes and deletion from the chapter index, and exports LLM-friendly Markdown using asterisk emphasis, fenced code, standard list markers, blockquoted system messages, and `---` scene breaks.
- Rolling Access policies per story, stored in `story_access_policies`, that apply tier windows to newest published chapters and make older non-NSFW chapters free.
- Reader CRM, provider connection visibility, access key redemption visibility, entitlement audit review, comments, and chapter reaction totals.
- Character, gallery, lore, maps, wallpapers, timeline, map requests, and author profile content as secondary Story Extras.
- Reader tiers/access keys/manual grants/provider mappings in Access Tools.
- Site Settings for reader identity, provider flag visibility, guide toggles, and subscription behavior defaults.
- Site Settings can also configure the subscription reader background image URL used by the app shell.
- Uploads to configured Supabase storage buckets.

Before changing admin fields or writes, check `docs/DATABASE_CONTEXT.md` and verify the target column/table/bucket exists. If it does not exist, add an idempotent SQL migration before changing the frontend.

Admin can remain monolithic unless the user explicitly asks to split it. Prefer small targeted edits and keep its existing internal patterns.

---

## 5. Database and storage architecture

Primary references:

- `docs/DATABASE_CONTEXT.md` — current schema/policy/storage/RPC context snapshot.
- `database/sql/` — setup and migration SQL kept for reset/rebuild/documentation.
- `supabase/migrations/` — Supabase CLI migration files.
- `supabase/functions/` — Edge Functions for provider/Patreon-related flows.
- `send-reader-email-queue` processes queued reader chapter email notifications when `RESEND_API_KEY` and `READER_EMAIL_FROM` are configured.

Storage expectations:

| Bucket | Purpose |
|---|---|
| `covers` | Story cover images. |
| `backgrounds` | Story/chapter/background/hero images. |
| `chapter-images` | Chapter inline/reference images. |
| `characters` | Character imagery. |
| `lore` | Lore imagery/assets. |
| `maps` | Map imagery/assets. |
| `author` | Author profile/site imagery. |
| `Reader` | Reader-owned uploads under `Reader/<user_id>/...`. |

Schema-change rule: if frontend code reads/writes a new table, column, RPC, or bucket, add/verify an idempotent SQL migration and reload PostgREST schema cache with `NOTIFY pgrst, 'reload schema';`.

---

## 6. Current documentation set

| File | Purpose | When to read/update |
|---|---|---|
| `docs/CODEBASE_OVERVIEW.md` | Current architecture and routing overview. | Read before project work; update when architecture/module ownership/data flow changes. |
| `docs/SUBSCRIPTION_FUNCTION_INDEX.md` | Function list for `js/subscription/*`. | Read before reader code changes; update when reader functions are added/removed/renamed/repurposed. |
| `docs/ADMIN_FUNCTION_INDEX.md` | Function list for `admin.html`. | Read before admin code changes; update when admin functions are added/removed/renamed/repurposed. |
| `docs/DATABASE_CONTEXT.md` | Supabase tables, policies, functions, storage. | Read before DB/storage/auth/RLS/query work; update after durable schema/policy/storage/RPC changes. |
| `CHANGELOG.md` | Durable completed implementation history. | Add entries only for durable completed changes. |
| `PROJECT_STATE.md` | Active memory for unfinished/deferred/risky work. | Update for partial work, follow-ups, deferred decisions, known risks, or manual verification still needed. |

---

## 7. Verification quick reference

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
node --check js/subscription/onboarding.js
node --check js/subscription/author-studio.js
node --check js/subscription/views/home-library.js
node --check js/subscription/views/story-reader.js
node --check js/subscription/views/account-access.js
node --check js/subscription/views/help-support.js
node --check js/subscription/views/studio-preview.js

# Supabase sanity checks
supabase db query --linked "select id, slug, title, is_published from public.stories order by created_at desc limit 5;" -o table
supabase db query --linked "select * from public.get_chapter_catalog('<story_uuid>'::uuid);" -o table
```

Manual verification is preferred over automated browser testing unless explicitly requested.
