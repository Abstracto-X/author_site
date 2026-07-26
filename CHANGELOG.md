# Changelog

## 2026-07-26 15:42 Asia/Kolkata — Writer Context formatting and clipboard fix

Area: writer / context workspace

Summary:
- Prevented Context rich-toolbar buttons from stealing the editor selection before applying bold, italic, underline, list, heading, or clear-format commands.
- Preserved rich block, chapter, and Chapter Note formatting in Context prompt preview and exports by converting stored HTML to Markdown instead of flattening every source to plain text.
- Reworked Context plain-text extraction to preserve paragraph, heading, list-item, explicit `<br>`, horizontal-rule, and other block boundaries instead of merging them into one continuous text blob.
- Replaced reusable context-block Duplicate controls in library cards and the block editor with rich clipboard Copy actions that provide both HTML and plain-text clipboard formats.

Files changed:
- `writer.html`
- `docs/CODEBASE_OVERVIEW.md`
- `CHANGELOG.md`
- `PROJECT_STATE.md`

## 2026-07-26 05:47 Asia/Kolkata — Optional traditional home archive layout

Area: reader / home / styles

Summary:
- Added a persisted `Multigrid` / `Traditional` layout switch to the subscription home archive.
- Kept the existing mixed editorial grid intact while adding a two-column desktop view with a newest-first chapter index and an uncropped masonry artwork panel.
- Chapter rows preserve read, preview, and lock actions while showing tier colors, access state, release/update date, word count, read time, and read status.
- The traditional panels stack vertically on mobile, and gallery artwork continues to open the existing image sheet.

Files changed:
- `js/subscription/state.js`
- `js/subscription/events.js`
- `js/subscription/views/home-library.js`
- `styles.css`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/SUBSCRIPTION_FUNCTION_INDEX.md`
- `CHANGELOG.md`
- `PROJECT_STATE.md`

## 2026-07-26 05:35 Asia/Kolkata — Vibrant solid color-filled tier blocks for text-based tiles

Area: reader / styles / views

Summary:
- Converted all text-based chapter tiles (`:not(.has-art)`) into **bold, fully filled solid color blocks** with a subtle 3D lighting/bevel gradient and high-contrast white text.
- Aligned tier color scheme to match exact requirements:
  - **Nemesis Tier**: Vibrant Crimson Red fill (`rgb: 225, 29, 72`, `accent: #fb7185`)
  - **Tyrant Tier**: Rich Royal Purple fill (`rgb: 147, 51, 234`, `accent: #c084fc`)
  - **Licker Tier**: Rich Amber / Golden Yellow fill (`rgb: 217, 119, 6`, `accent: #fbbf24`)
  - **Free Access**: Bright Emerald Green fill (`rgb: 16, 185, 129`, `accent: #34d399`)
- Styled internal elements on solid color tiles (badges, tier pills, kicker headers, action buttons) with crisp white text and translucent dark controls for contrast.
- Updated `chapterTierVisual` in `js/subscription/views/story-reader.js` to map Licker to Gold, Tyrant to Purple, Nemesis to Red, and Free to Green.
- All 16 subscription reader JS files passed `node --check` syntax verification.

Files changed:
- `styles.css`
- `js/subscription/views/story-reader.js`



Area: admin / writer / database / storage

Summary:
- Copied all 5 referenced `chapter-images` objects to new versioned Storage paths instead of overwriting CDN-visible objects.
- Copied all 13 referenced character profile/gallery objects to new versioned `characters` paths and updated `characters.profile_image_url` plus `character_gallery_images.image_url`.
- Set and verified a one-year browser cache lifetime (`public, max-age=31536000`) on every new object.
- Atomically replaced the old URLs in saved chapter content; the existing synchronization trigger rebuilt `chapter_feed_images`, leaving zero old chapter/feed references.
- Verified zero old character/gallery references remain and kept the old Storage objects unreferenced as a rollback safety net.
- Made the Writer's one-year cache setting an explicit upload configuration value; future uploads continue to use unique paths with `upsert: false`.
- Made one-year caching explicit at both character profile and character gallery upload call sites in the Admin CMS.

Files changed:
- `admin.html`
- `writer.html`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/DATABASE_CONTEXT.md`
- `CHANGELOG.md`
- `PROJECT_STATE.md`

## 2026-07-26 03:35 Asia/Kolkata — Universal 3-mode theme system & contrast remediation

Area: reader / styles / utils / sheets

Summary:
- Replaced the 6 fantasy presets (*Aether, Ember, Frost, Midnight, Sage, Parchment*) with a universal **3-Mode Theme System**: **Dark Mode** (`dark`, default), **Light Mode** (`light`), and **Parchment Mode** (`parchment`).
- Configured CSS design tokens for `[data-theme="light"]` (`#f5f7fb` background, `#ffffff` card surfaces, `#1e293b` dark slate text, `#2563eb` blue accent) and refined `[data-theme="parchment"]` (`#f4efe2` sepia background, `#fbf7ee` cream surfaces, `#2d2319` warm dark text, `#8c5a2b` brown accent).
- Added automatic theme normalization in `js/subscription/utils.js` (`normalizeTheme()`) so legacy saved themes (`aether`, `ember`, `frost`, `midnight`, `sage`) seamlessly migrate to `dark` mode without breaking user settings.
- Fixed topbar and bottomnav chrome background mismatch by replacing hardcoded dark green `rgba(10, 14, 11, 0.98)` with dynamic `rgb(var(--chrome) / 0.96)`.
- Fixed hero header text contrast by replacing hardcoded faint greenish-grey `#c4cfc6` with `var(--text-dim)`.
- Fixed text-only chapter card contrast mismatch by removing forced white text and hardcoded dark green card backgrounds (`rgba(10, 14, 12, 0.96)`); text-only tiles now use `var(--surface-solid)` / `var(--surface-solid-2)` with a subtle `--chapter-tier-rgb` tint and high-contrast dark text (`var(--text)`) in light and parchment modes.
- Preserved white text (`#ffffff`) and dark backdrop gradient overlays (`.archive-chapter-shade`) on cover photo cards (`.has-art`) for 100% legibility over full-bleed imagery across all themes.
- Replaced hardcoded dark background (`rgba(11,17,13,.86)`) on footer quick nav cards (`.archive-home-links > a`) with `var(--surface-solid-2)`.
- Updated Reader Lighting options in `js/subscription/sheets.js` to `Dark`, `Light`, and `Parchment`.
- All 16 reader JS files passed `node --check` syntax verification.

Files changed:
- `styles.css`
- `js/subscription/utils.js`
- `js/subscription/sheets.js`

## 2026-07-26 03:10 Asia/Kolkata — Tile glow removal & chapter catalog ascending order alignment

Area: reader / styles / views

Summary:
- Removed performance-lagging glowing `box-shadow` effects, continuous `cta-pulse` button keyframe animations, radial gradient overlays, and `.archive-card-glow` elements across all cards and tiles in `styles.css`.
- Disabled the moving light sweep animation (`archiveUnreadSweep`) and pulsing glow animation (`archiveUnreadPulse`) on unread chapter cards, eliminating GPU animation loops for smooth, lag-free scrolling.
- Updated `VIEWS.chapters` in `js/subscription/views/story-reader.js` to present chapters in natural **Ascending Order** (`Chapter 1 → Chapter N`) by default, making sequential reading intuitive and unconfusing for readers.
- Added a chapter catalog sort control toggle (`[Chapter 1 → N (Ascending)]` vs `[Newest first (Descending)]`) stored in `store.filters.chapterSort` so readers can easily switch views if desired.
- Removed hardcoded dark green colors (`#090d0b`, `#080b09`, `rgba(4,8,6,...)`, `rgba(9,13,11,...)`) from `.archive-home`, `.archive-home-hero`, `.archive-tier-panel`, `.archive-feed-card`, `.archive-gallery-open`, and `.archive-feed-filters` in `styles.css`. Converted all homepage elements to use CSS design tokens (`var(--surface-solid)`, `var(--surface-2)`, `var(--bg)`, `var(--border)`, `var(--text)`), allowing the homepage to dynamically respond to all theme presets (Aether, Ember, Frost, Midnight Ink, Sage, Parchment).
- Updated `t.dataset.siteTheme` handler in `js/subscription/events.js` to call `render()`, ensuring full view re-renders when switching themes.

Files changed:
- `styles.css`
- `js/subscription/views/story-reader.js`
- `js/subscription/events.js`


## 2026-07-25 23:10 Asia/Kolkata — Character Gallery & Visual Archive import


Area: reader / views / state / backend / router / chrome / styles

Summary:
- Imported and integrated the complete Character Gallery & Visual Archive from Abstracto Tales into the EvilArchives subscription reader.
- Created `js/subscription/views/gallery.js` with `VIEWS.gallery()` (Visual Archive landing page) and `VIEWS.galleryChar()` (per-character artwork gallery viewer).
- Implemented featured character hero card with stats, character roster collection decks, "Fresh Transmissions" recent artwork feed with pagination, tag filter chips, search input, sort selection (Curated, Newest, Top Rated), view mode toggle (Grid View vs Deck View), and R18 mature content filter.
- Added full interactive Lightbox overlay with image zoom, keyboard navigation (ArrowLeft, ArrowRight, Escape), metadata sidebar, tag list, and upvote/downvote action buttons.
- Extended `js/subscription/state.js` with global gallery state (`gallerySearch`, `gallerySort`, `galleryViewMode`, `filterTag`, `showR18`, `imageVotes`, `lightboxIndex`).
- Added Supabase database vote bridge in `js/subscription/backend.js` (`fetchGalleryVotes`, `submitGalleryVote`, `loadCharacterGalleryImages`).
- Registered `#/gallery`, `#/gallery/:slug`, and `#/gallery/:slug/:charId` hash routes in `js/subscription/router.js`. Fixed missing `return r;` in `parseHash()` that caused hash navigation to return `undefined`.
- Fixed `loadBackendLibrary()` control flow structure in `js/subscription/backend.js`. Restored proper `try...catch...finally` scoping so `backendState.loaded = true` is set and `backendState.loading = false` is cleanly executed in `finally`, resolving the member library loading spinner freeze.
- Added Gallery navigation links in `js/subscription/chrome.js` (topbar, bottomnav, and sidenav).
- Included `<script src="js/subscription/views/gallery.js"></script>` in `index.html`.
- Added namespaced and responsive gallery CSS styles in `styles.css`.



Files changed:
- `js/subscription/views/gallery.js` (NEW)
- `js/subscription/state.js`
- `js/subscription/backend.js`
- `js/subscription/router.js`
- `js/subscription/chrome.js`
- `js/subscription/events.js`
- `index.html`
- `styles.css`
- `docs/SUBSCRIPTION_FUNCTION_INDEX.md`
- `docs/CODEBASE_OVERVIEW.md`

## 2026-07-25 22:25 Asia/Kolkata - Reader mobile and responsive audit remediation (31 issues fixed)


Area: reader / styles / chrome

Summary:
- Resolved 31 screenshot-grounded mobile (381px) and desktop (944px) audit rendering bugs and design issues across the subscription reader surface.
- Fixed root cause of middle-floating titles on artwork cards (`Chapter 23`, `Chapter 22`, etc.): removed conflicting `margin-top: auto` from `.archive-card-footer` and enforced `margin-top: 8px !important` on footers and `margin-top: auto !important` on `.archive-chapter-copy`. The chapter title and footer are now locked together at the bottom of the card over the dark gradient backdrop with zero vertical gap.
- Eliminated slot-stealing logic in `homeFeedItems()`: chapters are now strictly sorted in descending chapter index order (`Chapter 46, 45, 44, 43, 42, 41, 40...`). Older chapters with artwork (such as Chapter 23 and Chapter 22) are never pulled out of numerical sequence to fill early slots.
- Implemented feed artwork curation & pagination: up to 6 artwork cards (gallery images + character illustrations) are interspersed smoothly across the feed without breaking chapter sequence. Added a "Load More Chapters & Artwork" pagination button at the bottom of the grid.
- Simplified chapter card layout: removed top widget bar (`● NEW`, `CHAPTER`, `✓ Available` tickmark) and redundant card footer button (`Open chapter` / `Read ✓`). The entire tile remains natively clickable.
- Removed unused legacy `memberArchivePanel` component from the library view.
- Applied rich, fully-colored tier backgrounds (`radial-gradient` + `linear-gradient` using `--chapter-tier-rgb` / `--chapter-tier-accent`) across all chapter cards, replacing plain dark blue/default tiles. Free Access (emerald), Resident Licker (violet), Resident Tyrant (amber), Resident Nemesis (rose), and Resident Evil (cyan) cards now carry distinct tier-colored surfaces and glows.
- Added visual contrast for read vs unread state: unread chapters feature bright, vibrant tier backgrounds, glowing tier accents, and crisp white titles; read/completed chapters automatically shift to darker, subdued, muted tier shades with soft text and `Read ✓` action badges.
- Converted mobile viewports (`< 560px` / `381px`) to a clean 1-column feed layout (`flex-direction: column`). Cards receive full width (~350px), eliminating horizontal smushing, single-line text wrapping traps, kicker overlaps, and vertical text compression.
- Sticky topbar and fixed bottomnav now render as solid opaque dark surfaces (`rgba(10, 14, 11, 0.98)` / `var(--surface-solid)`) with backdrop blur and `z-index: 100`, eliminating content bleed and label overlay issues.
- Fixed `Chapter 23` creature image layering by enforcing proper stacking contexts (`img` `z-index: 0`, gradient shade `z-index: 1`, body `z-index: 2` with `position: relative`), preventing images from obscuring titles or metadata.
- Replaced fixed 174px/190px mobile card heights with content-driven vertical expansion and `16px` padding, ensuring titles, word counts, and tier badges remain 100% unclipped.
- Centered root main layout (`width: 100%; max-width: var(--maxw); margin: 0 auto`) to eliminate uncentered right-side empty space at 944px width.
- Enhanced hero progress bar track visibility/accessibility, boosted text contrast for secondary labels (`#c4cfc6`), fixed gallery card image clipping and zoom touch targets (`44px x 44px`), and updated selected filter chip states to use neutral brand accent colors.

Files changed:
- `styles.css`
- `js/subscription/chrome.js`
- `js/subscription/views/home-library.js`
- `js/subscription/utils.js`

## 2026-07-25 21:07 Asia/Kolkata - Multi-line system message block rendering alignment

Area: reader / writer

Summary:
- Updated `js/subscription/backend.js` `textToBlocks` parser to merge consecutive system message blocks into a single multi-line system card joined with `<br>` tags and replace `.sys-soft-break` embeds.
- Updated `writer.html` `cleanChapterEditorHtml` to merge adjacent `.sys-msg-box` sibling elements into single system blocks when saving HTML to Supabase.
- Aligned reader multi-line system message display with the Writer editor layout so multi-line system dialogs render in one unified system card instead of separate single-line boxes.

Files changed:
- `js/subscription/backend.js`
- `writer.html`
- `docs/SUBSCRIPTION_FUNCTION_INDEX.md`

## 2026-07-25 10:15 Asia/Kolkata - Add review-first Writer Summary Manager

Area: writer / database / edge-functions / docs

Summary:
- Added a separate responsive Summary Manager with exact saved-chapter sources for Short Summaries and exact accepted Short Summary sources for Long Summaries.
- Added distinct style-reference selection, coverage/gap/overlap warnings, source-setting staleness protection, private review editing, draft saves, explicit acceptance, archiving, and supersession.
- Added and applied the admin-only `writer_summary_details` lifecycle/provenance schema; managed drafts and archived summaries are excluded from reusable Context.
- Added and deployed the authenticated admin-only `writer-generate-summary` Edge Function using the official Google Gemma 4 model identifiers. The Google key remains server-side.
- Preserved the manuscript boundary: generation reads saved sources but has no chapter insert/update/delete path.

Files changed:
- `writer.html`
- `js/writer-summary-manager.js`
- `styles/writer-summary-manager.css`
- `supabase/functions/writer-generate-summary/index.ts`
- `supabase/config.toml`
- `supabase/migrations/20260725101500_add_writer_summary_details.sql`
- `database/sql/2026-07-25_add_writer_summary_details.sql`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/ADMIN_FUNCTION_INDEX.md`
- `docs/DATABASE_CONTEXT.md`
- `docs/AI_INTEGRATION_HANDOVER.md`
- `CHANGELOG.md`
- `PROJECT_STATE.md`

## 2026-07-25 09:43 Asia/Kolkata - Add story-scoped Writer AI chat

Area: writer / database / edge-functions / docs

Summary:
- Added a persistent, resizable, responsive Writer AI drawer with story-scoped thread CRUD/search, reload continuity, and per-thread OpenRouter settings.
- Vendored Deep Chat 2.5.0 and its MIT license; canonical history remains in Supabase rather than component browser storage.
- Added streaming and Stop through an authenticated, admin-authorized Supabase Edge Function that keeps the OpenRouter key server-side.
- Added copy actions and explicit saves of the latest input or response as independent Context Workspace Scratchpads.
- Added **Copy context & open AI**, which copies assembled Context Markdown and opens the drawer without pasting or sending.
- Added and applied admin-only `writer_ai_chat_threads` and `writer_ai_chat_messages` tables with RLS, indexes, constraints, and cascading relationships.
- Deployed `writer-openrouter-chat`; live provider calls require `OPENROUTER_API_KEY` to be configured in Supabase secrets.

Files changed:
- `writer.html`
- `js/writer-ai-chat.js`
- `styles/writer-ai-chat.css`
- `vendor/deep-chat/*`
- `supabase/functions/writer-openrouter-chat/index.ts`
- `supabase/config.toml`
- `supabase/migrations/20260725093000_add_writer_ai_chat.sql`
- `database/sql/2026-07-25_add_writer_ai_chat.sql`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/ADMIN_FUNCTION_INDEX.md`
- `docs/DATABASE_CONTEXT.md`
- `CHANGELOG.md`
- `PROJECT_STATE.md`

## 2026-07-23 19:20 Asia/Kolkata — Writer Context Workspace phases 1-2

Area: writer / database / docs

Summary:
- Added an admin-only, story-scoped Context Workspace to `writer.html` with reusable writing-style, summary, outline, and scratchpad blocks.
- Added searchable selection of context blocks, existing chapters, and existing chapter scratchpads without duplicating chapter content. A narrow browser-style tabbed library sits beside a dominant prompt-preview canvas and compact preset/order rail.
- Added complete source-aware card actions: rich drawer editing, duplication, and confirmed deletion for reusable blocks, plus handoff to existing chapter/scratchpad editors and their duplicate/delete workflows.
- Added whole-card colored selection, select-all/clear-tab/clear-all controls, persistent active tab/section order, reusable-block drag sorting, simple section ordering, and cross-section advanced drag ordering.
- Added total and per-section word/character/token statistics, configurable budget warnings, clipboard exports, and `.md`, `.txt`, and ChatGPT `.json` downloads.
- Added named reusable context presets with save, Save As, rename, duplicate, load, and delete; presets persist selection, section/item order, ordering mode, active tab, and token budget.
- Replaced the horizontally scrolling Context tabs with an equal-size, two-row properties-window tab grid and removed the exposed horizontal scrollbar.
- Added reload continuity: the Writer restores its last top-level surface, while each story restores its transient Context selection/order, mode, active tab/preset, budget, search, and library/preview scroll positions from local storage.
- Added and applied idempotent Supabase tables, indexes, constraints, foreign keys, and admin-only RLS policies for context blocks and presets.

Files changed:
- `writer.html`
- `database/sql/2026-07-23_add_writer_context_workspace.sql`
- `supabase/migrations/20260723170000_add_writer_context_workspace.sql`
- `database/sql/2026-07-23_add_context_preset_active_section.sql`
- `supabase/migrations/20260723173000_add_context_preset_active_section.sql`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/ADMIN_FUNCTION_INDEX.md`
- `docs/DATABASE_CONTEXT.md`
- `CHANGELOG.md`
- `PROJECT_STATE.md`

## 2026-07-23 09:20 Asia/Kolkata - Make Writer workspace responsive and collapsible

Area: admin | writer | docs

Summary:
- Added independently collapsible left navigation and right chapter-settings rails, with each preference persisted locally for desktop use.
- Converted compact-width chapter settings into an overlay so it no longer steals the manuscript's writing height.
- Reflowed dashboard controls, editor actions, Quill toolbar, tables, toasts, and Writer modals for narrow screens; added dynamic viewport sizing for mobile browser chrome/keyboard behavior.
- Moved the rail controls beside the Writer Studio brand, replaced unsupported blank panel icons, rebuilt the chapter-number input as a spinner-free capsule, and normalized the editor header into consistent Export, Save Draft, and Publish actions.
- Removed cleanup and system-box deletion from the manuscript header; cleanup remains available through `/clean`, while system-box deletion remains in Chapter Settings.
- Restored the missing `ed-tag-badge` DOM identifier used when switching between chapter and scratchpad tabs.

Files changed:
- `writer.html`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/ADMIN_FUNCTION_INDEX.md`
- `CHANGELOG.md`
- `PROJECT_STATE.md`

## 2026-07-20 17:15 Asia/Kolkata - Add chapter-attached Scratchpads feature in Writer

Area: database | writer | docs

Summary:
- Added `public.scratchpads` table with `ON DELETE CASCADE` reference to `public.chapters` and admin RLS policy (`scratchpads_admin_all`).
- Implemented `DB.loadScratchpads`, `DB.saveScratchpad`, and `DB.deleteScratchpad` data layer methods.
- Built interactive Scratchpad note creation directly attached to chapters: rendered as clickable note pills on Dashboard chapter rows and nested sidebar items under chapters.
- Supported seamless editor tab switching for scratchpads with `SP` header badge, dashed tab styling, autosave, and scratchpad-specific settings sidebar card.
- Updated database context, admin function index, and walkthrough documentation.

Files changed:
- `writer.html`
- `database/sql/2026-07-20_add_scratchpads.sql`
- `supabase/migrations/20260720170000_add_scratchpads.sql`
- `docs/DATABASE_CONTEXT.md`
- `docs/ADMIN_FUNCTION_INDEX.md`
- `CHANGELOG.md`
- `PROJECT_STATE.md`

## 2026-07-20 16:27 Asia/Kolkata - Fix system message markdown copy format

Area: admin | writer

Summary:
- Modified the Markdown copy option in `writer.html` to output system message boxes using the original square-bracket notation `[System message content]` instead of blockquoted text (`> **System message:**`).

Files changed:
- `writer.html`
- `docs/ADMIN_FUNCTION_INDEX.md`
- `CHANGELOG.md`

## 2026-07-17 10:41 Asia/Kolkata - Add versioned story-system foundation and separate AAA UI lab

Area: database | design

Summary:
- Added a story-agnostic structured system model with versioned page/field definitions, full chapter-end checkpoints, global page appearance, safe calculated fields, catalog references, slot validation, reader progress, RLS, and guarded RPCs.
- Seeded the supplied Resident Evil Version 1 and Alex values as an unpublished, admin-only baseline draft so no historical reader spoilers are exposed.
- Added a production-detached SVG design lab with BioCore Status Matrix, Red Queen Shop, and Mutation Nexus concepts. The status concept edits values directly inside the dialogue and includes an author/reader-preview toggle.
- Removed the initial plain frontend prototype from Writer and the reader. No new system UI is loaded by either production surface until the visual direction is approved.

Files changed:
- `design/system-panels/system-design-lab.html`
- `design/system-panels/biocore-status-editor.svg`, `red-queen-shop.svg`, `mutation-nexus.svg`
- Inactive implementation modules: `js/system-core.js`, `js/writer-system.js`, `js/subscription/system-panel.js`
- `supabase/migrations/20260717080000_story_systems.sql`, `database/sql/20260717080000_story_systems.sql`
- Project documentation and state files

## 2026-07-16 19:10 Asia/Kolkata - Repair mobile home access overview and notification refresh

Area: reader

Summary:
- Reworked the subscriber home screen for narrow phones, removing horizontal overflow, hiding desktop-only admin shortcuts, containing long controls, and tightening the cover/actions/cards without collapsing the content hierarchy.
- Added a latest-chapter access panel directly to Home with the same tier colors used by the story catalog, explicit Available/Preview/Locked state, and current-reader entitlement resolution.
- Replaced generic chapter update labels such as “Member drop” with the actual required access-tier name. Update titles now truncate inside a fixed grid column instead of pushing the tier pill and Read button around.
- Made in-app notifications refresh on startup, every minute while visible, and immediately after returning to the tab; added a manual Refresh control, a proper empty state, and read-state persistence when an alert is opened.

Files changed:
- `js/subscription/aether-app.js`
- `js/subscription/auth.js`
- `js/subscription/backend.js`
- `js/subscription/chrome.js`
- `js/subscription/events.js`
- `js/subscription/views/account-access.js`
- `js/subscription/views/home-library.js`
- `styles.css`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/DATABASE_CONTEXT.md`
- `docs/SUBSCRIPTION_FUNCTION_INDEX.md`
- `CHANGELOG.md`
- `PROJECT_STATE.md`

## 2026-07-16 16:36 Asia/Kolkata - Color-code and share subscriber chapters

Area: reader

Summary:
- Applied access-tier color coding to subscriber chapter catalog cards and story chapter rows, including tier-tinted backgrounds, accent rails, dots, badges, borders, and hover states. Free Access is green; the resident tier ladder uses distinct purple, amber, rose, and cyan accents.
- Added share controls to catalog cards, story rows, open chapter navigation, locked chapter views, and external-only chapter views.
- Direct shares use the existing `#/read/<chapter-id>` route, opening the native share sheet when available or copying the URL otherwise. Recipient authentication and entitlement checks remain unchanged.

Files changed:
- `js/subscription/utils.js`
- `js/subscription/views/story-reader.js`
- `js/subscription/events.js`
- `styles.css`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/SUBSCRIPTION_FUNCTION_INDEX.md`
- `CHANGELOG.md`
- `PROJECT_STATE.md`

## 2026-07-16 05:52 Asia/Kolkata - Expand standalone Writer chapter workflow

Area: admin | writer

Summary:
- Changed Markdown copy output to conventional LLM-friendly syntax, including asterisk emphasis, fenced code blocks, hyphen bullets, blockquoted system messages, and standard horizontal-rule scene breaks.
- Added confirmed chapter deletion from both the chapter index and editor settings, plus a delete-current-system-box editor action.
- Added a persistent scrollable chapter list beneath the left navigation and closable multi-chapter editor tabs that save dirty content before switching.
- Added direct access-tier selection to every chapter-index row without rewriting chapter content; rows now use distinct tier-colored tinting, accent rails, and access dots (with green reserved for Free Access).
- Added persisted Chapter Index sorting for chapter order, reversed order, newest updated, and oldest updated.
- Added a plus control to the editor tab strip that creates a real Supabase draft at the next available chapter index and opens it immediately as a new tab.

Files changed:
- `writer.html`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/ADMIN_FUNCTION_INDEX.md`
- `CHANGELOG.md`
- `PROJECT_STATE.md`

## 2026-07-09 06:05 Asia/Kolkata - Add Wookieepedia planets scraper and extractor pipeline

Area: external-data | pipeline

Summary:
- Created a Python pipeline in the `abstracto_tales` data directory (`data/planets/`) to download all Star Wars planets from Wookieepedia.
- Features support for both Canon and Legends continuities, automatic name merging, local caching, request throttling, Chrome impersonation via curl_cffi, and key deduplication / citation removal.

Files changed:
- `C:/Users/admis/OneDrive/Documents/GitHub/abstracto_tales/data/planets/scrape_planets.py`
- `C:/Users/admis/OneDrive/Documents/GitHub/abstracto_tales/data/planets/run_pipeline.bat`

## 2026-07-09 00:00 Asia/Kolkata - Suppress Patreon free-tier audit noise

Area: edge-functions | database

Summary:
- Updated Patreon entitlement sync so users connected only to Patreon free/zero-dollar tiers remain linked but do not generate misleading `*_no_matching_tier` entitlement audit rows.
- Documented that Patreon free tiers are account links without paid reader access.

Files changed:
- `supabase/functions/_shared/patreon.ts`
- `docs/DATABASE_CONTEXT.md`

## 2026-07-08 14:05 Asia/Kolkata - Make provider entitlements idempotent

Area: database | edge-functions | admin

Summary:
- Added a migration that expires duplicate active provider entitlement rows, normalizes already-ended provider rows to expired, and adds a partial unique index allowing only one active provider entitlement per reader/provider.
- Updated Patreon OAuth/manual sync to refresh the existing active entitlement, keep only the highest matched cumulative tier, and avoid repeated grant inserts/audit rows on reconnect or sync retries.
- Updated the generic provider webhook active-grant path to refresh the current provider entitlement instead of blindly inserting duplicates.
- Applied the migration to the linked Supabase project and redeployed `sync-provider-entitlements`, `patreon-oauth-callback`, and `provider-webhook`.

Files changed:
- `database/sql/2026-07-08_provider_entitlement_idempotency.sql`
- `supabase/migrations/20260708140000_provider_entitlement_idempotency.sql`
- `supabase/functions/_shared/patreon.ts`
- `supabase/functions/provider-webhook/index.ts`
- `docs/DATABASE_CONTEXT.md`

## 2026-07-08 14:01 Asia/Kolkata - Refine Admin Reader CRM layout

Area: admin

Summary:
- Reworked the Admin Readers / CRM view into segmented sub-tabs for Readers & Grants, Provider Links, Key Redemptions, and Audit Log so the page no longer renders every CRM table in one long stack.
- Added scroll-safe table wrappers and long-code wrapping for admin tables, keeping wide CRM data usable without overflowing the page.
- Expanded CRM search to filter the active reader/provider/redemption/audit panels by reader identity and related provider/key/action fields.

Files changed:
- `admin.html`
- `docs/ADMIN_FUNCTION_INDEX.md`

## 2026-07-07 22:35 Asia/Kolkata - Add story wallpapers and reader customizations

Area: reader

Summary:
- Integrated public database wallpapers (`public.story_wallpapers`) into the subscription reader backend, loading and mapping them per-story.
- Added background modes (solid, ambient gradients, story artwork) and interactive wallpaper selector swatches inside reader settings.
- Added custom options to blur/unblur background artwork.
- Added reader width layout customization options (Compact, Medium, Wide, X-Wide) controlling the lines boundary (--reader-w).
- Added an option to use/keep background images visible during reading mode instead of unconditionally hiding them.

Files changed:
- `js/subscription/state.js`
- `js/subscription/backend.js`
- `js/subscription/utils.js`
- `js/subscription/sheets.js`
- `js/subscription/events.js`
- `styles.css`
- `docs/SUBSCRIPTION_FUNCTION_INDEX.md`

## 2026-07-07 22:20 Asia/Kolkata - Fix links and inline images rendering in subscription reader

Area: reader

Summary:
- Updated the `textToBlocks` parser in `js/subscription/backend.js` to whitelist anchor (`A`) and image (`IMG`) tags.
- Preserved necessary attributes for links (`href`, `target`, `rel`) and images (`src`) during element sanitation.
- Updated direct children mapping to return `outerHTML` for non-container tags (preserving full link/image attributes) when they are not nested inside paragraphs.

Files changed:
- `js/subscription/backend.js`

## 2026-07-07 22:15 Asia/Kolkata - Enable standalone Writer inline image upload and URL insertion

Area: admin

Summary:
- Added image upload capability to `writer.html` with support for PNG, JPG, WebP, and GIF up to 4 MB.
- Configured uploads to save to the public `chapter-images` Supabase Storage bucket.
- Implemented a base64 Data URL fallback for local development or cases where Supabase Storage is unconfigured or blocked.
- Updated the Quill toolbar configuration to route the default image tool button through the upload/URL modal flow instead of default inline insertion.
- Updated the media library modal UI to support pasting an image URL or selecting a local file.

Files changed:
- `writer.html`

## 2026-07-07 22:00 Asia/Kolkata - Fix standalone Writer autosave editor rewrite and paste formatting

Area: admin

Summary:
- Applied fixes to `writer.html` so the editor no longer rewrites itself during autosave.
- Standardized paste behavior so Markdown paste formatted text becomes rich text while raw rich text remains unchanged.
- Prevented double-firing on slash commands.
- Configured scene breaks as real `<hr>` elements and added native Quill toolbar icon tooltip hover labels.

Files changed:
- `writer.html`

## 2026-07-07 19:45 Asia/Kolkata - Add chapter editor cleanup and double-dash scene breaks

Area: admin | reader | docs

Summary:
- Added a Remove extra breaks cleanup action to the standalone Writer and embedded Admin Writer / Chapters editor to strip blank paragraph filler between paragraphs.
- Added Writer slash commands for `/scene`, `/clean`, and `/image`, with `--` automatically becoming the same scene break divider.
- Updated chapter normalization so pasted/saved standalone `--` markers become `<hr>` scene breaks, and the reader renders legacy standalone `--` content as the existing gold-star scene divider.

Files changed:
- `writer.html`
- `admin.html`
- `js/subscription/backend.js`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/ADMIN_FUNCTION_INDEX.md`
- `docs/SUBSCRIPTION_FUNCTION_INDEX.md`
- `CHANGELOG.md`

## 2026-07-07 17:30 Asia/Kolkata - Add reader notifications, profile editing, what's-new popup, and app background

Area: reader | admin | database | edge-functions | docs

Summary:
- Added DB-backed reader notification tables/preferences plus a chapter publish trigger that fans out relevant in-app notifications and queued email rows to readers whose active entitlement/admin role covers the chapter tier.
- Added and deployed `send-reader-email-queue`, an optional Resend-backed Edge Function for processing queued reader emails when email provider secrets are configured.
- Added reader Settings controls for chapter alerts, email notifications, browser notification permission, and app background art.
- Added signed-in reader profile editing for display name, username, avatar URL, and avatar upload to `Reader/<user_id>/profile/...`.
- Added a one-time signed-in "What's new" popup linking directly to notification settings, profile editing, and background settings.
- Added Admin Settings fields for the subscription reader background image URL and enable/disable toggle under `site_settings.reader_behavior`.

Files changed:
- `admin.html`
- `styles.css`
- `js/subscription/config.js`
- `js/subscription/state.js`
- `js/subscription/auth.js`
- `js/subscription/backend.js`
- `js/subscription/sheets.js`
- `js/subscription/events.js`
- `database/sql/2026-07-07_reader_notifications_profile.sql`
- `supabase/migrations/20260707173000_reader_notifications_profile.sql`
- `supabase/functions/send-reader-email-queue/index.ts`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/DATABASE_CONTEXT.md`
- `docs/SUBSCRIPTION_FUNCTION_INDEX.md`
- `docs/ADMIN_FUNCTION_INDEX.md`
- `CHANGELOG.md`

## 2026-07-07 16:53 Asia/Kolkata - Correct resident Patreon tier ladder

Area: database | docs

Summary:
- Applied a linked Supabase data migration for the corrected resident tier ladder: Licker rank 10, Tyrant rank 20, Nemesis rank 30, Evil rank 40.
- Converted the existing `resident-tyrant`/Resident Nemesis row in place to `resident-nemesis`, preserving its UUID so current Nemesis entitlements remain attached.
- Added new `resident-tyrant` and `resident-evil` access tiers; Resident Evil is the highest rank because it includes all Resident Nemesis benefits.
- Kept known Patreon numeric mappings for Licker (`28946758`) and Nemesis (`28946791`), and added temporary exact-title mappings for Tyrant and Evil until their numeric Patreon tier IDs are available.
- Seeded the story rolling access policy as Nemesis 3 + Tyrant 3 + Licker 6 slices. Existing chapter `required_tier_id` assignments were intentionally not rewritten during the migration, preserving current reader access immediately after the tier fix.

Files changed:
- `database/sql/2026-07-07_resident_tier_ladder.sql`
- `supabase/migrations/20260707165300_resident_tier_ladder.sql`
- `docs/DATABASE_CONTEXT.md`
- `CHANGELOG.md`

## 2026-07-07 09:18 Asia/Kolkata - Preserve Patreon paid-through access on cancellation

Area: database | edge-functions | docs

Summary:
- Updated Patreon OAuth/manual sync to request `next_charge_date`, `pledge_cadence`, and `will_pay_amount_cents` from Patreon member data.
- Added paid-through entitlement handling: renewing patrons stay active normally, while non-renewing/canceled Patreon memberships that are still currently entitled receive a bounded `valid_until` from Patreon's period dates.
- Changed provider revoke/expired webhook handling to preserve access only until a verified future paid-through timestamp from the webhook payload or stored entitlement metadata; otherwise it expires immediately.
- Stored Patreon period metadata on entitlement rows so later revokes can honor the already-verified paid-through period without trusting browser/client input.
- Deployed `patreon-oauth-callback`, `sync-provider-entitlements`, and `provider-webhook` to the linked Supabase project.

Files changed:
- `supabase/functions/_shared/patreon.ts`
- `supabase/functions/provider-webhook/index.ts`
- `docs/DATABASE_CONTEXT.md`
- `CHANGELOG.md`

## 2026-07-07 08:42 Asia/Kolkata - Relink Patreon tier mappings

Area: database | docs

Summary:
- Updated live Supabase Patreon provider mappings from title-based matching to actual Patreon tier IDs: `Resident Licker` -> `28946758`, and internal `resident-tyrant` -> current Patreon `Resident Nemesis` tier `28946791`.
- Renamed the internal `resident-tyrant` display name to `Resident Nemesis` while keeping the slug stable for compatibility with existing chapter/access references.
- Backfilled one connected Patreon account whose stored Patreon tier metadata matched `28946791` but lacked an active entitlement after the old title mapping missed the renamed tier.
- Verified all 12 connected Patreon tier matches now have active entitlement rows.

Files changed:
- `docs/DATABASE_CONTEXT.md`
- `CHANGELOG.md`

## 2026-07-07 06:25 Asia/Kolkata - Restore embedded Admin Writer navigation

Area: admin | docs

Summary:
- Restored the Admin CMS `Writer / Chapters` sidebar item to render the embedded `Views.chapters` workspace instead of linking directly to `writer.html`.
- Removed the immediate `Views.chapters` redirect to `writer.html`, fixing `admin.html` auto-redirects caused by stale `ea-admin-last-view = chapters` localStorage.
- Kept the standalone `writer.html` workspace available; this change only restores access to the still-useful embedded Admin Writer.

Files changed:
- `admin.html`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/ADMIN_FUNCTION_INDEX.md`

## 2026-07-07 06:06 Asia/Kolkata - Add subscription reader admin access override

Area: reader | docs

Summary:
- Added an explicit admin reader override: signed-in profiles with `role = 'admin'` now resolve gated published chapters as readable in the subscription reader without requiring Patreon/access-key entitlements.
- Hardened admin role detection by normalizing the profile/app metadata role and forcing a backend catalog refresh after auth changes/email sign-in.
- Updated home, Vault, and account UI to use resolved persona access instead of raw backend `can_read_backend`/chapter state where admin overrides apply.
- Kept the override frontend/RPC-aligned only; no fake `user_entitlements` rows or schema changes were added.

Files changed:
- `js/subscription/auth.js`
- `js/subscription/utils.js`
- `js/subscription/views/account-access.js`
- `js/subscription/views/home-library.js`
- `js/subscription/sheets.js`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/SUBSCRIPTION_FUNCTION_INDEX.md`

## 2026-07-07 04:55 Asia/Kolkata - Left-align standalone Writer drafting canvas

Area: admin

Summary:
- Fixed the standalone `writer.html` Quill drafting canvas so new chapters start at the left writing margin instead of a centered, narrow editor column.
- Kept the editor full-width inside the available workspace while preserving comfortable responsive padding and explicit left text alignment.

Files changed:
- `writer.html`

## 2026-07-07 00:00 Asia/Kolkata - Bound Writer demo to Supabase and shared system-message screen

Area: admin | reader | docs

Summary:
- Converted `writer.html` from mock/demo chapter data to the site Supabase config, admin profile gate, real story/chapter/tier loading, and real chapter insert/update/publish/unpublish writes.
- Removed bundled demo chapter/tier/story seed data from the Writer runtime cache and replaced mock media thumbnails with an honest no-bundled-media state.
- Preserved Writer `div.sys-msg-box` system-message blocks in reader chapter parsing and rendered them with the same techno SVG system-screen border concept in the main reader.
- Restored visible system-message screen treatment in Writer, fixed editor-mode scrolling, and added explicit Draft/Live pills in both the active editor header and chapter list.
- Added backward compatibility for preexisting bracket-authored system messages like `[content]` in both Writer loading and reader rendering.

Files changed:
- `writer.html`
- `js/subscription/backend.js`
- `js/subscription/views/story-reader.js`
- `styles.css`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/ADMIN_FUNCTION_INDEX.md`
- `docs/SUBSCRIPTION_FUNCTION_INDEX.md`
- `CHANGELOG.md`
- `PROJECT_STATE.md`

## 2026-07-06 01:53 Asia/Kolkata ? Standalone Writer workspace

Area: admin, reader

Summary:
- Added `writer.html` and `js/admin-writer.js` as a dedicated admin-only chapter writing workspace.
- The chapter rail now preserves index, title, word count, live/draft state, tier name, NSFW/external flags, and release date metadata.
- The editor keeps chapter index beside title, rich/Markdown toolbar, contenteditable body, local autosave, Save Draft/Save Changes preserving publish state, explicit Publish, access controls, teaser generation, NSFW, and external URL behavior.
- Admin Writer / Chapters navigation now opens `writer.html`; reader `/studio/write` and `/studio/chapters` bridge to the standalone Writer page for admins.

Files changed:
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


Completed durable project changes only. Unfinished/deferred/risky work belongs in `PROJECT_STATE.md`.

## 2026-07-06 01:38 Asia/Kolkata - Reworked Admin Writer rail, tier labels, and collapse behavior

Area: admin | docs

Summary:
- Reworked the Writer / Chapters chapter rail into a wider, more polished card list with clearer chapter numbering, better title spacing, and restored visible tier names instead of stripping access context down to generic labels.
- Fixed sidebar collapse behavior so it now explicitly shrinks the chapter rail and gives the manuscript editor more horizontal space instead of depending on CSS selector behavior that could leave the editor layout wrong.
- Tightened the Writer manuscript presentation with stronger dark surfaces, better chapter-card hierarchy, and richer topbar metadata showing tier and live/draft state.

Files changed:
- `admin.html`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/ADMIN_FUNCTION_INDEX.md`
- `CHANGELOG.md`
- `PROJECT_STATE.md`

## 2026-07-06 01:22 Asia/Kolkata - Simplified Admin Writer chapter list and metadata controls

Area: admin | docs

Summary:
- Simplified the Writer / Chapters sidebar from chunky card rows into a flatter compact chapter list with the index separated from the chapter title and smaller status/access metadata.
- Removed the separate Details tab from the Writer workspace; chapter index now sits directly beside the chapter title in the Write panel.
- Removed the visible published checkbox from the editor flow; Save Draft/Save Changes preserves the existing publish state while Publish explicitly publishes.

Files changed:
- `admin.html`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/ADMIN_FUNCTION_INDEX.md`
- `CHANGELOG.md`
- `PROJECT_STATE.md`

## 2026-07-06 01:15 Asia/Kolkata - Polished Admin Writer / Chapters visual design

Area: admin

Summary:
- Reworked the Writer / Chapters view from a demo-like glass panel into a cleaner production writing desk with a compact active-story control strip, chapter metrics, and a stronger two-column workspace.
- Restyled the chapter sidebar with professional cards, active-state accenting, tighter spacing, and a collapsed-column grid behavior that gives the editor more room.
- Restyled the editor chrome with a sticky command header, pill tabs, manuscript sheet container, improved toolbar buttons, cleaner chapter canvas spacing, and a bottom metadata strip for word count/autosave status.

Files changed:
- `admin.html`
- `CHANGELOG.md`
- `PROJECT_STATE.md`

## 2026-07-05 19:35 Asia/Kolkata - Fixed Writer editor line breaks and Markdown input

Area: admin | docs

Summary:
- Updated the Admin Writer / Chapters editor sanitizer so pasted/browser-generated `<div>` blocks and plain text line breaks are normalized into safe paragraph/break HTML instead of collapsing into one large paragraph.
- Added Markdown-to-safe-HTML conversion for pasted plain text, including paragraphs, soft line breaks, headings, blockquotes, lists, emphasis, and scene breaks.
- Added a `Markdown → HTML` editor action plus paste handling and save-time normalization so Markdown/plain text and rich HTML inputs both persist cleanly to `chapters.content`.
- Fixed empty new-chapter autosaves so browser filler such as `&nbsp;` / non-breaking spaces is treated as empty content and removed instead of being restored into the next new chapter.

Files changed:
- `admin.html`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/ADMIN_FUNCTION_INDEX.md`
- `CHANGELOG.md`

## 2026-07-05 19:20 Asia/Kolkata - Refocused Admin Writer / Chapters into a real writing workspace

Area: admin | docs

Summary:
- Reworked the Admin Writer / Chapters layout so the writing surface is a focused manuscript workspace with a large title field, sticky formatting toolbar, page-like contenteditable canvas, and local draft word count.
- Moved chapter order/published state, tier/public release/external-only settings, and preview/teaser editing into separate tabs instead of displaying every metadata field above the editor.
- Made the chapter list a compact sticky/scrollable sidebar and added `Forms.showWriterPanel()` for in-place panel switching without a full view re-render.

Files changed:
- `admin.html`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/ADMIN_FUNCTION_INDEX.md`
- `CHANGELOG.md`

## 2026-07-05 18:40 Asia/Kolkata - Rebuilt Admin CMS into subscription cockpit with rolling access and rich chapter editor

Area: admin | reader | database | docs

Summary:
- Reworked Admin CMS navigation around Dashboard, Stories, Writer / Chapters, Rolling Access, Readers / CRM, Community, Site Settings, and Story Extras.
- Added a focused inline/fullscreen Writer / Chapters editor in `admin.html` with contenteditable safe HTML, formatting controls, word count, local draft autosave, preview helper, NSFW/external-only fields, and rolling-access recalculation after saves.
- Redirected legacy chapter modal entry points into the inline Writer / Chapters editor so stale buttons do not reopen the old modal workflow.
- Expanded Readers / CRM with search, entitlement list, provider connections, key redemptions, and entitlement audit data; expanded Community with comment reader/chapter links and reaction totals by chapter.
- Added `story_access_policies`, `chapters.is_nsfw`, and `chapters.external_url` migrations, plus updated chapter RPCs to return external fields and withhold local content for NSFW chapters.
- Applied and re-ran the linked Supabase migration to verify idempotency, and verified the new policies, chapter columns, and chapter RPC signatures.
- Added Admin rolling access policy UI/matrix, reader CRM, provider/redemption/audit views, community comments/reaction totals, and Story Extras secondary launcher.
- Added Site Settings behavior defaults for reader guides, provider settings display, provider display notes, and optional global external fallback metadata.
- Removed active reader-side Author Studio loading from `index.html`; `/studio/*` now redirects to `admin.html`.
- Updated reader chapter rendering to preserve sanitized basic formatting, apply Admin-authored reader guide/external fallback settings, and show external-only prompts for NSFW chapters.

Files changed:
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

## 2026-07-05 07:59 Asia/Kolkata - Added reader guide overlay, DB-backed chapter reactions/comments, and cleaned production UI copy

Area: reader | database | admin | docs

Summary:
- Added modular `js/subscription/onboarding.js`, loaded before app bootstrap, for a feature-gated highlighted reader walkthrough controlled by `features.enableReaderGuides`.
- Connected chapter reader notes to the existing Supabase `comments` table. Signed-in readers now post with their profile/account display name automatically instead of typing a name.
- Added `chapter_reactions` schema, RLS policies, SQL files, and a Supabase migration for signed-in chapter-end reactions with public aggregate reads.
- Loaded chapter comments and reaction counts from Supabase in the reader, and updated comment/reaction event handlers to write to Supabase instead of pretending local-only writes are production data.
- Removed or replaced production-facing mock/dev/internal UI copy, including simulated notification controls, backend/setup details in reader empty states, “concept” toasts, temporary access-model text, disabled provider teasers, and external placeholder image URLs in Admin CMS.
- Updated reader docs and database context for the new module, script order, community data flow, and reaction schema.

Files changed:
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
- `PROJECT_STATE.md`

## 2026-07-05 07:32 Asia/Kolkata - Tightened responsive button and navigation containment

Area: reader | admin

Summary:
- Fixed the reader topbar brand markup/CSS mismatch so the site name and tagline can truncate correctly instead of forcing topbar overflow.
- Added responsive containment for reader buttons, chips, quicklinks, chapter rows, chapter catalog cards, and mobile story hub actions so long labels wrap or truncate inside their containers instead of spilling horizontally.
- Added admin CMS button/header/action wrapping and mobile table containment so dense action rows and modal/footer buttons do not force desktop-width layouts on narrow screens.

Files changed:
- `styles.css`
- `js/subscription/chrome.js`
- `admin.html`
- `CHANGELOG.md`

## 2026-07-04 02:51 Asia/Kolkata - Polished reader navigation, added start/end buttons, removed chapter index numbers, fixed cast images, locked tier coloring, and added dynamic required tier tags

Area: reader

Summary:
- Corrected the Cast & Glossary view bug to display dynamic, big rectangular character tiles (`.cast-grid` / `.cast-tile`) with cover-like initials fallback for missing profiles.
- Polished the Chapter Catalog grid and Chapter lists to remove raw index numbers (`Ch. X`) since titles are already numbered in this book context. Added clean status badges (green checkmark for read, lock icon for locked, faint book for readable but unread) in their place.
- Resolved dynamic lock styles based on required Patreon access tier: locked cards and rows now get a prominent gold border/glow for `Resident Tyrant` tier (rank 20) and a purple border/glow for `Resident Licker` tier (rank 10), while standard locks remain uncolored (grey).
- Added a dynamic database-backed required tier badge tag (e.g. `[Resident Licker]`, `[Resident Tyrant]`) on the left of the "Unlock" button in locked list rows and on the top-right of locked grid cards.
- Refined back navigation so that going back from a chapter reader view, locked fallback, or catalog footer returns the reader directly to the Book page (Story Hub), instead of automatically navigating to the Chapter Catalog.
- Added explicit, premium "Previous", "Book Hub", and "Next" navigation buttons at both the start and end of chapter contents.
- Replaced the static placeholder loader during secure chapter opening with a beautiful rotating `.reader-spinner` indicator.
- Disabled edge-tap chapter transition zones in the reading stage click handler to prevent accidental navigation while scrolling.

Files changed:
- `styles.css`
- `js/subscription/views/story-reader.js`
- `js/subscription/events.js`
- `docs/SUBSCRIPTION_FUNCTION_INDEX.md`

## 2026-07-04 02:30 Asia/Kolkata - Redesigned Chapter Catalog to a grid, enabled DB cast loading, migrated to word counts, and cleaned Library filters

Area: reader | database

Summary:
- Redesigned Chapter Catalog page from a list to a cards grid (`.chapter-catalog-grid`). Removed Chapter Comfort/Compact/Arc view segment controls and sorting toggles.
- Sorted chapters in the catalog newest first by default. Removed the individual chapter row read buttons, allowing clicking anywhere on the card to read/preview/unlock.
- Highlighted locked chapters in the grid card catalog with a distinct orange/gold glowing layout (`.chapter-card.locked`).
- Added database queries to `loadBackendLibrary` in `backend.js` to fetch and populate `characters` (cast) and `lore_entries` (glossary) dynamically from Supabase.
- Migrated reading minutes display to word counts across the application (tonight's reading card, feed updates, chapter catalog, reader header, end-of-chapter card, and sheets settings).
- Cleaned up the Library view by removing all quick select filter chips and Collections links, leaving a cleaner search experience.

Files changed:
- `js/subscription/views/story-reader.js`
- `js/subscription/views/home-library.js`
- `js/subscription/backend.js`
- `js/subscription/sheets.js`
- `js/subscription/author-studio.js`
- `styles.css`
- `CHANGELOG.md`

## 2026-07-04 02:22 Asia/Kolkata - Redesigned Book (Story Hub) page layout to a two-column desktop grid

Area: reader

Summary:
- Redesigned the Book (Story Hub) page from a single-column mobile-first scroll layout into a beautiful two-column responsive desktop layout (collapses on < 900px wide screens).
- Moved the cover art to a wide left sidebar, including cover art, title, author, genre/status eyebrow, tags, a horizontal reading progress bar, and primary side action buttons (Follow/All chapters).
- Designed a main right column containing the tagline, a large prominent primary CTA button (Start Reading / Continue), a horizontal quickactions row, a detailed progress card with a progress ring, the latest chapters list, and cast & glossary grid tiles.
- Cleaned up the empty state (no chapters published) to use the same matching split grid.

Files changed:
- `js/subscription/views/story-reader.js`
- `styles.css`
- `CHANGELOG.md`

## 2026-07-04 01:57 Asia/Kolkata - Renamed Chapter Shelf to Catalog and fixed rendering bugs

Area: reader

Summary:
- Renamed the "Chapter Shelf" view to "Chapter Catalog" to avoid confusion with the global "Shelf" navigation tab.
- Replaced the outer `<button>` container in `chapterRow` with a `<div class="row">` to resolve a nested button HTML rendering bug that was breaking layout rendering in browsers.
- Added sorting toggles ("Oldest first" and "Newest first") to let readers easily view the chapters list chronologically or in reverse chronological order.
- Renamed reader "Back to shelf" buttons and placeholders to "Back to chapters" and "chapter catalog".

Files changed:
- `js/subscription/views/story-reader.js`
- `js/subscription/events.js`
- `CHANGELOG.md`

## 2026-07-04 01:30 Asia/Kolkata - Redesigned subscriber portal home page layout

Area: reader

Summary:
- Replaced the full-screen cinematic book cover hero banner with a clean, responsive grid layout.
- Restructured the Book Cover Card so the book cover image fills the full card (padding: 0, overflow: hidden) and placed the book information, actions, and reading status below the card.
- Added a dedicated "Reading Status" progress bar section under the cover card to display the percentage read and chapter counts.
- Added explicit "Continue Reading" fallback logic (last read chapter -> first readable -> first previewable/locked -> story page).
- Integrated dynamic tier and connection resolution in `auth.js` `persona()` to pull real Patreon tier titles (e.g. `Resident Licker` or `Resident Tyrant`) from Supabase entitlements.
- Fixed access stats counters and updates notes to verify raw `access_state_backend` from Supabase, ensuring that admin accounts show correct tier-based access status.
- Fixed locked chapter updates mapping to "Member drop" instead of falling back to "Author note".
- Stretched the "Latest Updates" list card down to the bottom panels (`height: 100%` on container, removing `max-height` constraints on `.updates-scroller` to let the updates feed fill the entire vertical space) and expanded the scroller limit to show up to 10 updates, resolving the weird empty space in the right column.
- Created "Latest Announcement" section displaying honest empty state when no announcement data exists.
- Renamed account settings to "Access & Account" panel featuring quick actions (key redemption, Patreon resync, settings, sign out).
- Styled the "All updates" navigation link as a proper rounded ghost button in the card header.
- Added responsive styling with `.home-grid` using CSS grid minmax bounds and `align-items: stretch` to force equal column heights and trigger scrolling overflow.

Files changed:
- `js/subscription/auth.js`
- `js/subscription/views/home-library.js`
- `js/subscription/backend.js`
- `styles.css`
- `CHANGELOG.md`

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

## 2026-07-08 01:08 Asia/Kolkata - Add red linked system caption dialogs

Area: admin | reader

Summary:
- Added a linked/caption variant for Writer system-message boxes: any system dialog containing a hyperlink is marked and styled red in `writer.html`.
- Propagated the same linked system-message distinction through the subscription reader parser and renderer.
- Added reader CSS so linked system dialogs/caption boxes render red while normal system dialogs stay blue.

Files changed:
- `writer.html`
- `js/subscription/backend.js`
- `js/subscription/views/story-reader.js`
- `styles.css`
- `docs/SUBSCRIPTION_FUNCTION_INDEX.md`
- `docs/ADMIN_FUNCTION_INDEX.md`
- `CHANGELOG.md`
## 2026-07-24 13:22 Asia/Kolkata — Dead Must Breed desktop context import

Area: writer / database content / docs

Summary:
- Imported the non-chapter context from `A:\Novels\Dead Must Breed` into the existing `Resident Evil: A Zombie Tale` story: one writing-style block, one long summary, one chapter summary, and two outlines.
- Imported the desktop `Default Order` as an advanced web preset. Its chapter references resolve to the existing web Chapters 35 and 36.
- Explicitly skipped every desktop chapter file. No web chapter was inserted, updated, deleted, reordered, published, or unpublished.
- Created and verified a local pre-import backup containing all 40 web chapters, individual chapter HTML/metadata files, story data, Chapter Notes, tiers, and context data at `C:\Users\admis\Documents\author_site_backups\resident_evil_20260724_131801`.

Files changed:
- `CHANGELOG.md`
- `PROJECT_STATE.md`
- `docs/DATABASE_CONTEXT.md`

## 2026-07-24 12:17 Asia/Kolkata — Independent Scratchpads and in-screen Chapter Notes

Area: writer / docs

Summary:
- Reclassified reusable `writer_context_blocks` scratchpads as independent story-level Scratchpads and existing chapter-linked `scratchpads` rows as Chapter Notes without rewriting or deleting existing data.
- Removed Chapter Notes from the manuscript tab strip and added a dedicated in-screen side drawer with create, edit, save, delete, live word/token count, dirty-state confirmation, keyboard save, and unload protection.
- Added Chapter Notes to the active chapter settings panel and kept them accessible beneath chapters in the index/sidebar.
- Updated the Context Workspace Scratchpads dock to show independent scratchpads and optionally include Chapter Notes through a persisted checkbox; creating a normal Scratchpad now creates an independent reusable block.
- Preserved existing context-preset foreign keys and compatibility entry points, so saved presets and current chapter-note rows remain valid.

Files changed:
- `writer.html`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/ADMIN_FUNCTION_INDEX.md`
- `docs/DATABASE_CONTEXT.md`
- `CHANGELOG.md`
- `PROJECT_STATE.md`
## 2026-07-25 19:41 Asia/Kolkata — Reader mixed archive home feed

- **Area:** Subscription reader
- Reworked the primary home experience into a cinematic story masthead—cover, reading controls, character artwork, synopsis, and story statistics—followed by a responsive editorial feed shared by chapter and gallery content.
- Added real Supabase loading and normalization for published characters and `character_gallery_images`; empty gallery data remains an honest empty/filter state.
- Added newest-first All, Chapters, Gallery, and dynamic character filters, compact image-led/editorial tiles, gallery image tiles, and a focused image sheet.
- Added `chapter_feed_images` plus an automatic trigger/backfill that indexes image URLs already embedded or referenced by published chapters without exposing chapter prose.
- Illustrated chapter tiles now show public indexed chapter artwork directly for every visitor, prioritize durable storage media near the top of the feed, fall back to compact text tiles when an external image fails, and open from the entire tile.
- Gallery cards size themselves from the artwork's natural aspect ratio and use uncropped `contain` rendering over an ambient backdrop.
- Added reduced-motion-aware unread chapter pulses and staggered sheen effects.
- Explicit mature gallery tags remain excluded from the general homepage pending a dedicated opt-in gallery flow.
- **Files changed:** `js/subscription/config.js`, `js/subscription/backend.js`, `js/subscription/utils.js`, `js/subscription/views/home-library.js`, `js/subscription/events.js`, `styles.css`, `database/sql/2026-07-25_add_chapter_feed_images.sql`, `database/sql/2026-07-25_fix_chapter_feed_images_public_read.sql`, `database/sql/2026-07-25_simplify_chapter_feed_images_public_read.sql`, matching Supabase migrations, `docs/CODEBASE_OVERVIEW.md`, `docs/SUBSCRIPTION_FUNCTION_INDEX.md`, `docs/DATABASE_CONTEXT.md`, `CHANGELOG.md`, `PROJECT_STATE.md`.

## 2026-07-25 23:25 Asia/Kolkata — Fix Visual Archive route render crash

Area: reader

Summary:
- Fixed `#/gallery` failing during view rendering because the new gallery template referenced an undefined `escAttr()` helper.
- Reused the reader's existing HTML-safe `esc()` helper for gallery URLs and `data-*`/form attribute values.
- Prevented stale character-gallery search/tag state from silently hiding R18 artwork on the Visual Archive landing page; that landing feed now responds only to its visible R18 toggle.
- Confirmed both the Visual Archive landing view and character gallery render in a local VM smoke test.

Files changed:
- `js/subscription/views/gallery.js`
- `CHANGELOG.md`
- `PROJECT_STATE.md`

## 2026-07-25 23:46 Asia/Kolkata — Gate mature gallery artwork by subscription

Area: reader | database

Summary:
- Replaced the public mature-gallery path with a subscription-aware reader experience: guests and readers without active entitlements see a compact subscription banner and no mature previews, while active subscribers and admins receive the opt-in R18 toggle.
- Added and applied `public.has_active_gallery_subscription()` plus a `character_gallery_images` SELECT policy that keeps safe published artwork public and exposes mature-tagged rows only to active subscribers/admins.
- Verified linked RLS behavior for anonymous, unsubscribed-authenticated, active-subscriber, and admin roles.

Files changed:
- `js/subscription/views/gallery.js`
- `styles.css`
- `database/sql/2026-07-25_gate_nsfw_gallery_by_subscription.sql`
- `supabase/migrations/20260725180600_gate_nsfw_gallery_by_subscription.sql`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/DATABASE_CONTEXT.md`
- `CHANGELOG.md`
- `PROJECT_STATE.md`
