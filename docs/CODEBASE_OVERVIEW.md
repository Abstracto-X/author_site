# Codebase Overview

This repo is a static Supabase-backed author/reader site with two active browser surfaces and no frontend build step. It is intentionally small at runtime: browser HTML/CSS/JavaScript, Supabase JS from CDN, Supabase PostgreSQL/Auth/Storage, and SQL files for setup/rebuild documentation.

The active implementation is the source of truth. Anything under `deleted/` is archived historical/reference material and is not needed for the site to run.

---

## 1. Active application surfaces

| Surface | Entry | Audience | Purpose | Editing model |
|---|---|---|---|---|
| Subscription reader | `index.html` | Public readers / members / supporters | Member-facing reader shell for published stories, chapter catalogs, gated chapter reading, auth, entitlement status, access keys, account sheets, help/support, and reader navigation. | Modular classic browser scripts under `js/subscription/`, loaded in dependency order. This is the frequently edited surface. |
| Admin CMS | `admin.html` | Author/admin | Single-page CMS for Supabase content management: stories, rolling access, media URLs/uploads, characters, lore, maps, timeline content, reader tiers, access keys, and settings. | Intentionally monolithic single HTML file except the dedicated Writer workspace. |
| Standalone Writer | `writer.html` | Author/admin | Focused chapter drafting/publishing workspace reachable from Admin CMS and the reader `/studio/write` path. Uses Supabase stories, chapters, reader tiers, admin profile checks, and chapter RLS instead of mock/demo data. Includes the Quill system-message authoring flow, user-collapsible navigation and chapter-settings rails, a scrollable chapter rail, sortable chapter index, multi-chapter tabs with next-index draft creation, color-coded index-level tier editing, and chapter/system-box deletion controls. | Plain static page with inline classic browser script; uses the same Supabase anon config/profile admin check as `admin.html`. |

---

## 2. Runtime directory map

```txt
index.html                 # subscription reader entry
admin.html                 # admin CMS entry
writer.html                # standalone admin-only chapter writer workspace
styles.css                 # shared/reader-heavy stylesheet
js/admin-writer.js         # legacy/alternate standalone writer helper; current `writer.html` keeps its active logic inline
js/writer-ai-chat.js       # active Writer AI drawer, Supabase history, streaming, and Scratchpad export
styles/writer-ai-chat.css  # isolated responsive Writer AI drawer styling
vendor/deep-chat/          # pinned Deep Chat 2.5.0 browser bundle and MIT license
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
| `auth.js` | Supabase auth/session/profile/entitlement bridge. | Handles sign in/up/out, password recovery/update, Patreon and Boosty-through-Discord provider flows, callback feedback, and profile/entitlement refresh. |
| `backend.js` | Supabase site settings, story/chapter/catalog data loading. | Owns reader identity loading from `site_settings`, published story loading, and RPC calls like `get_chapter_catalog` and `get_reader_chapter`. |
| `utils.js` | Pure-ish UI/data helpers. | Escaping, formatting, icons, cards, access labels, generated cover art, text parsing. |
| `chrome.js` | App shell/chrome partials and toasts. | Top/bottom/side navigation and shell-level UI pieces. |
| `router.js` | Hash route parsing and render dispatch. | Preserves route names and view registry behavior. |
| `views/home-library.js` | Home/library routes. | Published story discovery, mobile-safe home layout, tier-colored chapter availability overview, fixed-position access pills, and empty setup state. |
| `views/story-reader.js` | Story hub, chapters, reader, recap/extras/updates. | Chapter access state and reader rendering, including tier-color-coded chapter cards/rows and direct chapter-share controls. |
| `views/account-access.js` | Updates, calendar, collections, vault, shelf, notifications, benefits, onboarding. | Must not render hardcoded fake backend content. |
| `views/help-support.js` | Help/support routes. | Mostly static support copy/forms. |
| `views/gallery.js` | Visual Archive and character gallery routes. | Visual Archive landing page, featured character hero, roster collection decks, "Fresh Transmissions", per-character gallery, tag filters, grid/deck mode toggles, interactive lightbox modal, image upvoting, and subscriber-only opt-in access for mature-tagged artwork. |
| `views/studio-preview.js` | Archived/inactive studio placeholder module. | Not loaded by `index.html`; `/studio/*` redirects to `admin.html`. |
| `author-studio.js` | Archived/inactive reader-side author/studio prototype helpers. | Not loaded by `index.html`; useful ideas were ported into Admin CMS. |
| `sheets.js` | Sheet/modal builders. | Account/auth/access/settings/reader sheets. |
| `events.js` | Delegated DOM events and after-render hooks. | Owns `data-act`, `data-nav`, `data-sheet`, reader settings, and global listeners. |
| `onboarding.js` | Feature-gated reader guide overlay. | Modular highlighted walkthrough controlled by `features.enableReaderGuides` and local dismiss state. |
| `aether-app.js` | Bootstrap/init. | Initializes auth/backend/router/events once dependencies are loaded. |

### Reader data flow

1. Browser loads `site-config.js`, Supabase CDN, and the reader modules. `config.js` creates the empty runtime data contract; Supabase fills story/update data later.
2. `aether-app.js` bootstraps the app after all module globals exist.
3. `auth.js` initializes the Supabase client/session and refreshes profile, entitlements, provider connections, notification preferences, and notifications concurrently when configured. The initial Supabase `INITIAL_SESSION` callback and token-only refresh events do not repeat the already completed startup refresh/library load. Patreon and Boosty-through-Discord OAuth callback statuses are consumed on startup, clear pending sync state, refresh access, present safe reader messages, and remove callback parameters from the URL. A connected Boosty/Discord account is reverified on startup so its bounded role grant stays current. If the loaded profile has `role = 'admin'`, the subscription reader exposes an admin reader override for published chapters without creating fake `user_entitlements`.
4. `backend.js` loads `site_settings.site_identity` and `site_settings.reader_behavior`, then published stories, chapter catalogs, characters, and gallery artwork from Supabase.
5. `router.js` reads the hash route and calls the registered view renderer.
6. `views/*.js` render HTML using state from `state.js`, data from `backend.js`, and helpers from `utils.js`/`chrome.js`.
7. `backend.js` loads reader community state for open chapters: public comments from `comments` and reaction totals from `chapter_reactions`.
8. Signed-in readers load `reader_notifications` and `reader_notification_preferences`; the client refreshes alerts every minute while visible and when returning to the tab. The Settings sheet saves email/browser chapter alert preferences, and browser notifications are shown while the site is open if permission is granted.
9. `events.js` handles delegated interactions, profile edits/avatar uploads, notification preference saves, comment/reaction writes, gallery filtering/search/voting/lightbox navigation, and re-renders or opens sheets as needed.
10. `onboarding.js` optionally highlights key UI regions after render when reader guides are enabled; a separate versioned "What's new" sheet appears once per signed-in user after reader updates.

### Reader route groups

Common route groups include:

| Route family | Owner | Purpose |
|---|---|---|
| `/`, `/library` | `views/home-library.js` | Home and story discovery/library. |
| `/story/<slug>` | `views/story-reader.js` | Story hub/details. |
| `/story/<slug>/chapters` | `views/story-reader.js` | Chapter shelf/catalog. |
| `/read/<chapter>` | `views/story-reader.js` | Directly addressable chapter reader route; share controls generate this hash URL, while authentication and tier checks still apply to the recipient. |
| `/gallery`, `/gallery/<slug>`, `/gallery/<slug>/<charId>` | `views/gallery.js` | Visual Archive landing page and individual character artwork gallery viewer. Mature-tagged rows require an active entitlement or admin access; other readers see a subscription banner and no mature previews. |
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
- Chapter content through embedded Admin CMS Writer / Chapters and `writer.html`: admin-authenticated story selector, Supabase-backed chapter index, rich/Markdown editor, autosave/drafts, Save Draft preserving publish state, explicit Publish/Unpublish, tier access controls, NSFW/external-only fields, cover URL, system-message blocks saved in chapter HTML, editor cleanup for extra blank lines, and scene breaks from toolbar commands or standalone `--`. The standalone Writer also keeps a scrollable chapter list in its left rail, opens chapters as closable tabs, supports access-tier changes and deletion from the chapter index, exports LLM-friendly Markdown using asterisk emphasis, fenced code, standard list markers, bracketed system messages, and `---` scene breaks, and wraps every system-dialogue line in its own square brackets when copying Rich Text.
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
- `supabase/functions/` — Edge Functions for provider flows, including Patreon and Boosty subscriber-role verification through Discord OAuth.
- Boosty access uses `discord-oauth-start`, public callback `discord-oauth-callback`, shared Discord helpers, and the provider-aware `sync-provider-entitlements` function. The website never receives Boosty credentials and does not need a Discord bot; Boosty's own bot assigns the paid role, while Discord OAuth exposes only the signed-in member's identity and roles.
- `send-reader-email-queue` processes queued reader chapter email notifications when `RESEND_API_KEY` and `READER_EMAIL_FROM` are configured.
- `writer-openrouter-chat` is the authenticated admin-only OpenRouter streaming proxy; its provider key stays in Edge Function secrets.

Storage expectations:

| Bucket | Purpose |
|---|---|
| `covers` | Story cover images. |
| `backgrounds` | Story/chapter/background/hero images. |
| `chapter-images` | Chapter inline/reference images. Writer uploads use unique object paths and a one-year browser cache lifetime; stored chapter HTML and `chapter_feed_images` must reference the new path whenever an image is replaced. |
| `characters` | Character profile/gallery imagery. Admin uploads use unique paths and an explicit one-year browser cache lifetime; database rows must move to the new path whenever an image is replaced or backfilled. |
| `lore` | Lore imagery/assets. |
| `maps` | Map imagery/assets. |
| `author` | Author profile/site imagery. |
| `Reader` | Reader-owned uploads under `Reader/<user_id>/...`. |

Schema-change rule: if frontend code reads/writes a new table, column, RPC, or bucket, add/verify an idempotent SQL migration and reload PostgREST schema cache with `NOTIFY pgrst, 'reload schema';`.

### Database operational safeguards

- Ordinary AI agents connect directly through the restricted `ai_editor` role and `scripts/database/query-ai-db.ps1`, not through a cached Supabase Management API login or the production `postgres` credential.
- `ai_editor` supports non-destructive production work (`SELECT`, `INSERT`, `UPDATE`, sequence use, and creation in `public`) while database guards reject `DELETE`, `TRUNCATE`, and destructive `DROP` operations.
- Destructive or existing-schema work is produced as a migration and manually reviewed/executed with an owner credential.
- `scripts/database/backup-supabase.ps1` creates validated daily PostgreSQL archives on both local `A:` and Google Drive `G:` with 30-day retention. The set covers `public`, Auth data, and Storage metadata; Supabase Storage objects themselves are outside the database backup.
- Full operating details are in `docs/DATABASE_SAFETY.md`.

---

## 6. Current documentation set

| File | Purpose | When to read/update |
|---|---|---|
| `docs/CODEBASE_OVERVIEW.md` | Current architecture and routing overview. | Read before project work; update when architecture/module ownership/data flow changes. |
| `docs/SUBSCRIPTION_FUNCTION_INDEX.md` | Function list for `js/subscription/*`. | Read before reader code changes; update when reader functions are added/removed/renamed/repurposed. |
| `docs/ADMIN_FUNCTION_INDEX.md` | Function list for `admin.html`. | Read before admin code changes; update when admin functions are added/removed/renamed/repurposed. |
| `docs/DATABASE_CONTEXT.md` | Supabase tables, policies, functions, storage. | Read before DB/storage/auth/RLS/query work; update after durable schema/policy/storage/RPC changes. |
| `docs/DATABASE_SAFETY.md` | Restricted AI database role, backup destinations, retention, and restore boundary. | Read before direct production DB access, destructive migrations, backup changes, or recovery work. |
| `docs/BOOSTY_DISCORD_SETUP.md` | Discord application, Supabase secret/deploy, role mapping, test, and bounded-revocation setup for Boosty access. | Read before deploying or troubleshooting the Boosty-through-Discord provider bridge. |
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

---

## 2026-07-25 - Mixed chapter and gallery home feed

- The subscription home route is story-first: a compact cinematic masthead combines cover art, reading progress/actions, primary-character artwork, a short synopsis, and live chapter/word/adult-content statistics.
- `backend.js` loads site settings, stories, characters, gallery artwork, chapter-feed images, lore, and wallpapers concurrently, then resolves each published story's chapter catalog concurrently. Normalized character/gallery rows are exposed as `D.CHARACTERS` and `D.GALLERY_IMAGES`; there is no local/sample gallery fallback.
- The home archive feed merges published chapter catalog rows and published gallery images for the primary story, excludes mature-tagged artwork for guests/readers without active access, and includes it for admins/active-entitlement readers. It promotes the latest chapter as the lead feature and renders a capped set of type-specific cards in one responsive irregular editorial grid.
- Readers can switch the home archive between the original `Multigrid` feed and a persisted `Traditional` view. Traditional view places a newest-first, tier-color-coded chapter index beside an uncropped access-aware masonry artwork archive on desktop and stacks the two panels on narrow/mobile screens. Its artwork DOM starts at 18 images and expands in 12-image batches for the current session.
- Feed filters support All, Chapters, Gallery, and character-specific selections. Gallery cards open an image sheet; chapter cards preserve existing read/preview/lock behavior and tier-color semantics.
- `chapter_feed_images` indexes image URLs already referenced or embedded in published chapter content. Valid chapter artwork is visible to all visitors and earns the larger media-led feed positions; failed external URLs gracefully become compact text tiles, and the complete chapter tile is the read/preview/access target.
- Homepage artwork, chapter art, and hero images request width-limited Supabase Storage render URLs when the source is a public Supabase object, with an automatic original-URL fallback for projects or formats that cannot transform the image. Multigrid artwork uses one foreground image rather than painting the same source again as a blurred backdrop.
- Mobile and reduced-motion rendering disables the fixed noise layer, viewport background blur, and fixed navigation backdrop blur to reduce compositing cost.
- Unread chapters receive a tier-colored pulse and intermittent sheen, disabled under reduced-motion preferences.
- Images tagged `r18`, `mature`, or `nsfw` are intentionally excluded from the general home feed. A dedicated opt-in gallery experience can expose them later.

---

## 2026-07-25 - Writer AI chat drawer

- `writer.html` exposes a persistent, resizable, full-height AI drawer from Dashboard, Editor, and Context surfaces. The shell preserves open state and width locally while canonical threads and messages live in Supabase.
- `js/writer-ai-chat.js` owns story-scoped thread CRUD/search, per-thread OpenRouter model/temperature/token settings, Deep Chat lifecycle, streaming/Stop, SSE parsing, message persistence, copy actions, and explicit saves to independent `writer_context_blocks` Scratchpads.
- Context remains manual: **Copy context & open AI** copies assembled Markdown and opens the drawer, but never pastes, creates a message, selects a model, or sends a request.
- `vendor/deep-chat/deepChat.bundle.js` is pinned to Deep Chat 2.5.0 with its MIT license. Deep Chat browser storage is not canonical history.
- The AI chat remains separate from the review-first Summary Manager and has no summary-generation or chapter-write path.

## 2026-07-25 - Writer Summary Manager

- `writer.html`, `js/writer-summary-manager.js`, and `styles/writer-summary-manager.css` provide a separate, responsive Summary Manager for exact-source Short and Long Summary generation.
- Short Summaries use explicitly selected saved chapters. Long Summaries use explicitly selected accepted Short Summaries. A style reference is selected separately and is never treated as a factual source.
- Google Gemma generation runs through the authenticated, admin-only `writer-generate-summary` Edge Function. The browser never receives `GEMINI_API_KEY`.
- Generated text remains a private draft until the author explicitly accepts it. Draft and archived summary blocks are filtered out of reusable Context; accepted summaries become available after Context reload.
- Summary metadata records coverage, exact source IDs, source snapshots, provider/model/prompt provenance, lifecycle status, and explicit supersession in `writer_summary_details`.
- The Summary Manager never writes to `chapters`; it only reads saved chapter sources and writes summary/context records.

---

## 2026-07-17 - Versioned story-system foundation and visual approval gate

- Structured system data uses `story_systems`, `story_system_versions`, `story_system_checkpoints`, and `reader_system_progress`. Raw definitions/checkpoints remain admin-only; reader access is resolved through `get_reader_system_state`.
- `js/system-core.js`, `js/writer-system.js`, and `js/subscription/system-panel.js` are currently inactive implementation references. Neither `writer.html` nor `index.html` loads them.
- The initial plain frontend prototype was deliberately detached. Production integration is blocked on visual approval and must use in-dialogue/WYSIWYG value editing plus a chapter-context Reader Preview.
- `design/system-panels/system-design-lab.html` is a dependency-free review surface for the BioCore status editor, Red Queen shop, and Mutation Nexus SVG concepts. It is not a production route.

## 2026-07-23 - Writer Context Workspace

- `writer.html` includes an admin-only Context Workspace beside the Chapter Index and Active Editor.
- Story-level reusable blocks cover writing style, long summary, chapter summary, outline, and independent scratchpad material. The legacy-named `scratchpads` table now represents chapter-linked **Chapter Notes** in the Writer UI; those notes remain attached to chapters and are referenced rather than duplicated.
- Content types are separated into a fixed Windows-properties-style two-row tab grid, so only the active Writing Style, Long Summary, Chapter Summary, Chapters, Outlines, or Scratchpads library is shown. All six tabs have equal dimensions and avoid horizontal scrolling. Each tab has its own scrolling card list and selected/total count; block cards select by whole-card color state, reusable blocks drag-sort inside their tab, and advanced preset items support cross-section drag ordering.
- The workspace uses a narrow library sidebar, dominant central prompt canvas, and compact preset/order rail. The Scratchpads section combines independent reusable scratchpad blocks with optionally visible Chapter Notes. Independent blocks use the rich context drawer; Chapter Notes open in a compact in-screen side drawer and never occupy a manuscript editor tab.
- Reusable context-block cards support edit, rich clipboard copy, and confirmed delete behavior; chapter and Chapter Note sources retain their source-aware edit/duplicate/delete actions. The rich block toolbar preserves the active text selection, stored HTML remains intact, and prompt preview/export converts that HTML to Markdown instead of flattening it to plain text.
- Authors can use simple section ordering or drag-based advanced item ordering, preview per-section and total word/character/token estimates against a configurable budget, copy three formats, or download `.md`, `.txt`, and ChatGPT `.json` files.
- Named story presets support save, Save As, rename, duplicate, load, and delete, and persist selection, ordering mode, section order, item order, token budget, and active section through `writer_context_presets` and `writer_context_preset_items`.
- The Writer restores its last top-level surface after reload. Per-story local Context Workspace sessions also restore the unsaved selection/order, mode, active tab/preset, budget, search query, and library/preview scroll positions without replacing the database-backed named preset system.
- Context tables are admin-only through `public.is_admin()` RLS and are not loaded by the subscription reader.
