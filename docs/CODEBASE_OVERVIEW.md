# Codebase Overview

This repo is a static Supabase-backed author/reader site with three active browser surfaces and no frontend build step. It is intentionally small at runtime: browser HTML/CSS/JavaScript, a pinned local Supabase JS browser bundle, Supabase PostgreSQL/Auth/Storage, and SQL files for setup/rebuild documentation.

The active implementation is the source of truth. Anything under `deleted/` is archived historical/reference material and is not needed for the site to run.

---

## 1. Active application surfaces

| Surface | Entry | Audience | Purpose | Editing model |
|---|---|---|---|---|
| Subscription reader | `index.html` | Public readers / members / supporters | Member-facing reader shell for published stories, chapter catalogs, gated chapter reading, auth, entitlement status, access keys, account sheets, help/support, and reader navigation. | Modular classic browser scripts under `js/subscription/`, loaded in dependency order. This is the frequently edited surface. |
| Admin CMS | `admin.html` | Author/admin | Single-page CMS for Supabase content management: stories, rolling access, media URLs/uploads, characters, lore, maps, timeline content, reader tiers, access keys, and settings. | Intentionally monolithic single HTML file except the dedicated Writer workspace. |
| Standalone Writer | `writer.html` | Author/admin | Focused chapter drafting/publishing workspace reachable from Admin CMS and the reader `/studio/write` path. Uses Supabase stories, chapters, reader tiers, admin profile checks, and chapter RLS instead of mock/demo data. Includes the Quill system-message authoring flow with bracket-source editing, persisted render/source mode, selection-wide add/remove formatting, and start-of-block Backspace unwrapping, plus user-collapsible navigation and chapter-settings rails, a scrollable chapter rail, sortable chapter index with multi-select Markdown access-list copying for published chapters, multi-chapter tabs with next-index draft creation, color-coded index-level tier editing, and chapter/system-box deletion controls. | Plain static page with inline classic browser script; uses the same Supabase anon config/profile admin check as `admin.html`. |

The standalone Writer loads the same pinned local Supabase browser bundle as the reader (`vendor/supabase/supabase-2.111.0.min.js`); Quill, Tailwind, Marked, Turndown, FontAwesome, and Google Fonts remain external dependencies. If a required editor/script/style global fails to load, a dependency-free full-page notice names the missing resource and offers Reload Writer instead of leaving a blank workspace.

Writer Markdown paste recognizes AI Studio-style `html` code fences containing only `<div class="sys-msg-box">…</div>` lines and unwraps those fences before conversion, so the system messages enter Quill as formatted boxes instead of literal code. Mixed or unrelated code fences remain code. Rich clipboard HTML retains its normal path unless this exact Markdown pattern is present in the plain-text flavor.

Writer save contract: unpublished chapters autosave to Supabase; Chapter Notes and Context blocks use explicit Save buttons. Published chapters **do not autosave**; the explicit **Save Live Changes** action updates the published row immediately. There is no separate unpublished revision table, so do not describe this button as saving a private draft. Draft saves and publish/unpublish writes are serialized, as are chapter-tab transitions. New-chapter creation is single-flight so repeated clicks do not insert duplicate drafts. Story/chapter transitions flush pending unpublished edits or stay put on failure; open unsaved Context blocks, Chapter Notes, Summary reviews, AI streams, and image uploads block story changes. Note/Context-block closing is blocked while their saves are in flight, and edits made during those saves remain unsaved until saved again. Save acknowledgements are revision-aware, and a failed save remains visibly failed. Chapter/note/Context-block mutations have a 30-second client abort deadline; a timeout is explicitly marked **unconfirmed**, because server completion is ambiguous, and the author should verify the row before retrying. Writer navigation uses `#dashboard`, `#editor`, and `#context` browser history; per-chapter editor position is restored within the current page session. Writer core, Context, Summary, and AI history reads have 20-second deadlines and stale-response guards; model-catalog loading has an 8-second deadline. Summary generation exposes Stop, aborts on dismissal, and times out after two minutes without applying a late response. Startup failure offers Retry Writer. Image upload failures no longer embed base64 as a hidden fallback.

The Writer chapter index has a checkbox in Actions for each published row. Once selected, **Copy access list** appears beside **New Chapter** and copies descending chapter-order rich-text links to `index.html#/read/<id>`, followed by `unlocked for` and the chapter's current access-tier name (Free uses `everyone`; Resident Nemesis explicitly includes Resident Evil). Its clipboard includes both `text/html` anchors for Patreon and plain Markdown as a fallback; browsers without rich clipboard support warn that they copied plain text only. Drafts cannot be selected, and selection clears on story changes. This is clipboard-only: it does not publish chapters or create Patreon posts.

Context preset Save/Save As and Duplicate call the admin-only `save_writer_context_preset` RPC, which saves preset settings and ordered selection rows in one database transaction. A failed call does not replace the prior selection or leave an empty duplicate. The Writer treats timed-out writes as unconfirmed and distinguishes a successful write with a failed display refresh. Chapter Note deletion waits for any in-flight note save.

The Context center panel has Prompt Preview and Item Content tabs. Context blocks are edited in that panel instead of a side overlay; chapter and chapter-note items can be opened there for a read-only preview, with chapter editing remaining a separate Writer action. Chapter cards copy their content rather than offering duplication. The global Clear selection control is in the Context toolbar. Context item inventory delays rich-to-Markdown conversion until an item's content is needed and caches the result, while search and preview redraws are coalesced to reduce large-story UI stalls.

Quick chapter-tier updates are single-flight and share the chapter-save lock while the access mutation is pending, preventing a concurrent draft save from overwriting the newly chosen tier. Story switching and chapter deletion wait until that access update finishes.

Use `docs/WRITER_MANUAL_QA.md` for the owner-led signed-in verification pass before deployment; Node contract tests do not replace browser, auth, storage, or responsive-layout checks.

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
vendor/supabase/           # pinned self-hosted Supabase browser SDK and MIT license
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
2. Pinned local Supabase JS bundle (`vendor/supabase/supabase-2.111.0.min.js`)
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
14. `js/subscription/views/gallery.js`
15. `js/subscription/sheets.js`
16. `js/subscription/views/reader-settings.js`
17. `js/subscription/events.js`
18. `js/subscription/onboarding.js`
19. `js/subscription/aether-app.js`

`aether-app.js` is now only the small bootstrap/init file and must stay last. Its startup gate stops waiting after 12 seconds for auth initialization, loads the public library with recovery messaging, and refreshes the library if delayed authentication later succeeds.

Reader redesign styling is split across `styles/reader-redesign.css` and `styles/reader-foundation.css`, loaded after `styles.css` by `index.html`. Both are scoped to non-chapter-reader surfaces (`body:not(.in-reader):not(.in-studio)`), preserving the existing `.in-reader` chapter typography/preferences as well as `admin.html` and `writer.html`. `styles/reader-foundation.css` provides the collapsible 224px/76px desktop navigation rail (`store.sidebarCollapsed`), the 5-tab mobile bottom bar + `More` sheet, bounded empty-state SVG rules, light-mode background contrast protection, and the `.reader-workspace` / `readerPageHeading` / `readerEmptyState` / `.reader-panel` layout system used across Vault, Settings (`#/settings`), Library, Story Hub, Chapter Catalog, Updates, Shelf, Bookmarks, Saved Quotes, History, Notifications, Benefits, Onboarding, Help Center, and Support routes. It adapts the owner-supplied reference/starter visuals without introducing React or a build step. Scope, feature preservation, source notice, and QA checklist are in `docs/READER_REDESIGN.md` and `design/ui-audit-2026-10-29/AUDIT.md`.

The redesigned home defaults to a reference-style split chapter/artwork archive for new sessions; existing saved Multigrid/Traditional preferences remain compatible. Split archive has Curated cards, chapter-tier filters, incremental chapter/artwork loading, and mobile chapter/gallery panels. The homepage Artwork panel is a two-column, variable-height masonry grid (three at wide widths) with measured row spans, vertical-only internal scrolling and no horizontal column flow. Artwork stays in true newest-first order without promoting mature images; guests still receive only safe artwork. The hero preserves reading progress, Start/Continue, Follow, story synopsis, and real catalog statistics. `setupHomeArchive()` disconnects its prior observer before aligning the desktop gallery height to the chapter panel.

`VIEWS.gallery` and `VIEWS.galleryChar` now share `renderUnifiedGallery()`. The old character deep links select a collection inside the unified browser. Search/tags/sort/shuffle and incremental masonry/deck rendering operate on existing Supabase artwork; selecting Shuffled generates an order for the current collection, and switching collections regenerates it. `galleryLightboxImages()` uses the same filtered/sorted collection as card/deck indices. Lightbox includes keyboard navigation, focus trapping/restoration and existing up/down votes. Vote writes are single-flight per artwork, and late completions do not reopen a dismissed lightbox. Mature artwork still requires active entitlement/admin. It appears automatically but blurred for eligible readers on Home and Gallery (including decks and full-size viewers); hovering a tile reveals it temporarily, while the shared Show NSFW toggle reveals all. Guests see safe artwork only and the toggle opens a subscription prompt. No artwork discussions or backend contract changes were introduced.

### Module ownership map

| Module | Responsibility | Notes |
|---|---|---|
| `site-config.js` | Project-specific Supabase URL/anon key and feature flags. | Runtime config file; never put service-role secrets here. |
| `site-config.template.js` | Copyable config template. | Keep keys blank/safe. |
| `config.js` | Safe storage wrapper, runtime site identity, reader behavior settings, config accessors, provider feature gates, DOM helpers. | Handles sandbox-proof `localStorage`/`sessionStorage` fallbacks and applies `site_settings.site_identity` plus `site_settings.reader_behavior` when loaded. |
| `state.js` | Shared reader state objects. | Owns `store` (including `sidebarCollapsed` and `appBackground`), `authState`, `backendState`, derived access/persona defaults, and compatibility migration for independent site and chapter-reader appearance preferences. |
| `auth.js` | Supabase auth/session/profile/entitlement bridge. | Handles sign in/up/out, password recovery/update, Patreon and Boosty-through-Discord provider flows, callback feedback, and profile/entitlement refresh. |
| `backend.js` | Supabase site settings, story/chapter/catalog data loading. | Owns reader identity loading from `site_settings`, published story loading, RPC calls like `get_chapter_catalog` and `get_reader_chapter`, bounded request timeouts, and one retry for transient core failures. |
| `utils.js` | Pure-ish UI/data helpers. | Escaping, formatting, icons, cards, access labels, generated cover art, text parsing, and `applyBgSettings` (honoring `store.settings.appBackground`). |
| `chrome.js` | App shell/chrome partials and toasts. | Collapsible desktop `sidenav`, mobile `bottomnav`, `topbar`, `readerPageHeading`, `readerEmptyState`, and shell-level UI pieces. |
| `router.js` | Hash route parsing and render dispatch. | Preserves route names, view registry behavior, and focus management on `#main`. |
| `views/home-library.js` | Home/library routes. | Reference split archive home and `.reader-workspace.library-page` story discovery with search/filter toolbar, story dossier cards, and `Pinned to My Shelf`. |
| `views/story-reader.js` | Story hub, chapters, reader, recap/extras/updates. | Shared `storySubnav` orientation bar, two-column `.story-workspace`, segmented chapter catalog sort controls, and untouched `.in-reader` chapter reading view. |
| `views/account-access.js` | Updates, calendar, collections, vault, shelf, bookmarks, quotes, history, notifications, benefits, onboarding. | Editorial `.vault-layout`, two-column `.shelf-layout` with `readerShelfSubnav`, and honest empty states without fake offline or quote-card export promises. |
| `views/help-support.js` | Help/support routes. | Two-column Help Center (`VIEWS.help`), Access Check (`VIEWS.checkAccess`), Wrong Account recovery checklist (`VIEWS.wrongAccount`), and private copyable access details (`VIEWS.contact`). |
| `views/gallery.js` | Visual Archive and character gallery routes. | Unified story artwork browser with character collection selection/deep links, search/tag/sort/shuffle, incremental masonry/deck rendering, keyboard-accessible image/metadata lightbox, existing up/down votes, and subscriber-only blurred mature artwork with a shared Show NSFW reveal control. |
| `views/reader-settings.js` | Dedicated `#/settings` workspace. | Site theme (`dark`/`light`), background artwork toggle (`appBackground`), notification delivery preferences, and chapter typography guidance. |
| `views/studio-preview.js` | Archived/inactive studio placeholder module. | Not loaded by `index.html`; `/studio/*` redirects to `admin.html`. |
| `author-studio.js` | Archived/inactive reader-side author/studio prototype helpers. | Not loaded by `index.html`; useful ideas were ported into Admin CMS. |
| `sheets.js` | Sheet/modal builders. | Account/auth/access sheets, mobile `More` sheet (`sheetMore`), overall site settings, and the dedicated non-modal Reader Preferences rail/drawer used only on chapter routes. |
| `events.js` | Delegated DOM events and after-render hooks. | Owns `data-act`, `data-nav`, `data-sheet`, reader settings, sidebar collapse toggle, and global listeners. |
| `onboarding.js` | Feature-gated reader guide overlay. | Modular highlighted walkthrough controlled by `features.enableReaderGuides` and local dismiss state. |
| `aether-app.js` | Bootstrap/init. | Initializes auth/backend/router/events once dependencies are loaded. |

### Reader data flow

1. Browser loads `site-config.js`, the pinned self-hosted Supabase browser SDK, and the reader modules. Reader CSS/scripts use a deployment-version query so a release receives fresh assets without deleting authentication or preference storage. `config.js` creates the empty runtime data contract; Supabase fills story/update data later.
2. `aether-app.js` bootstraps the app after all module globals exist.
3. `auth.js` initializes the Supabase client/session and refreshes profile, entitlements, provider connections, notification preferences, and notifications concurrently when configured. The initial Supabase `INITIAL_SESSION` callback and token-only refresh events do not repeat the already completed startup refresh/library load. Other auth-event network work is deferred outside the Supabase auth lock and guarded against superseded events; account changes clear prior membership state and cached backend text. Patreon and Boosty-through-Discord OAuth callback statuses are consumed on startup, clear pending sync state, refresh access, present safe reader messages, and remove callback parameters from the URL. Both connected providers are verified automatically when their snapshot is stale (15 minutes) or a validity boundary crossed after the last sync. Visible-page minute checks, tab-return, and online recovery refresh access; failed automatic provider checks back off five minutes. Provider calls have a 10-second invocation deadline and per-page/per-user/provider coalescing. If the loaded profile has `role = 'admin'`, the subscription reader exposes an admin reader override for published chapters without creating fake `user_entitlements`.
4. `backend.js` loads `site_settings.site_identity` and `site_settings.reader_behavior`, then published stories, chapter catalogs, characters, and gallery artwork from Supabase. Core library/chapter requests time out instead of spinning forever, retry transient failures once, and expose manual retry controls; reconnecting after an offline failure retries automatically. The library recovery view can also remove Cache Storage entries and service-worker registrations scoped to this reader, then reload through a unique URL; it deliberately preserves Supabase auth and reader preferences.
   For backend chapters, the catalog RPC's `can_read`/`access_state` is authoritative for chapter cards and reader routing; local persona levels must not upgrade a denied higher-tier chapter. `activeEntitlements()` also checks `is_active` and validity timestamps so an expired Patreon row with `status = 'active'` does not appear current.
   Access-only reconciliation updates existing chapter objects without discarding authorized loaded text. A locked-chapter selection first checks a connected membership and opens automatically if access is restored; dismissal/navigation cancels that UI continuation. A denied secure fetch gets one automatic recovery attempt, then updates its chapter access state. Broader remaining risks and release checks are tracked in `docs/READER_RELIABILITY_AUDIT.md`.
5. `router.js` reads the hash route and calls the registered view renderer.
6. `views/*.js` render HTML using state from `state.js`, data from `backend.js`, and helpers from `utils.js`/`chrome.js`.
7. `backend.js` loads reader community state for open chapters: public comments from `comments` and reaction totals from `chapter_reactions`.
8. Signed-in readers load `reader_notifications` and `reader_notification_preferences`; the client refreshes alerts every minute while visible and when returning to the tab. Overall Settings owns site appearance and notification delivery. On chapter routes, Aa opens a non-modal Reader Preferences rail/drawer containing independent page color/brightness, text size, line spacing, width, and Dyslexia mode.
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
| `/gallery`, `/gallery/<slug>`, `/gallery/<slug>/<charId>` | `views/gallery.js` | Unified Visual Archive; character links select a collection in the same artwork browser. Mature-tagged rows require an active entitlement or admin access; other readers see a subscription banner and no mature previews. |
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
- Chapter content through embedded Admin CMS Writer / Chapters and `writer.html`: admin-authenticated story selector, Supabase-backed chapter index, rich/Markdown editor, autosave/drafts, Save Draft preserving publish state, explicit Publish/Unpublish, tier access controls, NSFW/external-only fields, cover URL, system-message blocks saved in chapter HTML, editor cleanup for extra blank lines, and scene breaks from toolbar commands or standalone `--`. In the standalone Writer, the active system dialogue becomes lightweight bracket-source text and returns to its rendered box when the cursor leaves; the toolbar can disable rendering globally, combine one dragged multi-paragraph selection into one dialogue, or unwrap every selected dialogue without deleting or reinserting authored text. Backspace at the beginning of a dialogue also removes only its system formatting. Quill initially applies a block format per selected paragraph, then `mergeAdjacentSystemMessageBlocks()` replaces only the structural paragraph separators between adjacent system lines with soft breaks so the live editor and saved HTML both contain one actual system block. The standalone Writer keeps a scrollable chapter list in its left rail, opens chapters as closable tabs, supports access-tier changes and deletion from the chapter index, exports LLM-friendly Markdown using asterisk emphasis, fenced code, standard list markers, one bracket pair around each system box, and `---` scene breaks, and wraps every system-dialogue line in its own square brackets when copying Rich Text.
- Rolling Access policies per story, stored in `story_access_policies`, that apply tier windows to newest published chapters and make older non-NSFW chapters free.
- Reader CRM, provider connection visibility, access key redemption visibility, entitlement audit review, comments, and chapter reaction totals.
- Character, gallery, lore, maps, wallpapers, timeline, map requests, and author profile content as secondary Story Extras.
- Reader tiers/access keys/manual grants/provider mappings in Access Tools.
- Site Settings for reader identity, provider flag visibility, guide toggles, subscription behavior defaults, and the chapter-number cutoff for the ornate reader system-dialogue frame.
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
- Images tagged `r18`, `mature`, `nsfw`, or `18+` are excluded for readers without active entitlement/admin. Eligible readers see them blurred in Home and Gallery until hover or the shared Show NSFW reveal toggle.

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
- Reusable context-block cards support edit, rich clipboard copy, and confirmed delete behavior; chapter and Chapter Note sources retain their source-aware edit/duplicate/delete actions. The rich block toolbar preserves the active text selection, stored HTML remains intact, and prompt preview/export converts that HTML to Markdown instead of flattening it to plain text; embedded images are omitted from that Markdown so image URLs do not inflate the prompt budget.
- Authors can use simple section ordering or drag-based advanced item ordering, preview per-section and total word/character/token estimates against a configurable budget, copy three formats, or download `.md`, `.txt`, and ChatGPT `.json` files.
- Named story presets support save, Save As, rename, duplicate, load, and delete, and persist selection, ordering mode, section order, item order, token budget, and active section through `writer_context_presets` and `writer_context_preset_items`.
- The Writer restores its last top-level surface after reload. Per-story local Context Workspace sessions also restore the unsaved selection/order, mode, active tab/preset, budget, search query, and library/preview scroll positions without replacing the database-backed named preset system.
- Context tables are admin-only through `public.is_admin()` RLS and are not loaded by the subscription reader.

---

## 2026-08-31 12:06 Asia/Kolkata - Separate site settings and reader preferences

- `store.theme` controls only dark/light site chrome and is switched from the persistent top-bar toggle. `settings.readerTheme` independently controls dark, light, parchment, or custom chapter color.
- Overall Settings owns site artwork/story backdrops and notification delivery. Aa opens a dedicated Reader Preferences right rail on desktop or bottom drawer on smaller screens; it never adds a scrim, blur, or scroll lock and applies changes directly without rebuilding chapter content.
- Reader Preferences contains page color, automatic custom-color contrast, background brightness, text size, line spacing, text width, and a single Dyslexia mode. Legacy presets and content-visibility/focus toggles are migrated away without leaving reader content hidden.
- Chapter prose retains its Georgia-first stack with reliable italics. System/caption dialogue boxes consume reader-scoped semantic colors across all built-in and custom backgrounds.
