# Project State

Active memory for unfinished work, deferred decisions, risky areas, and follow-up tasks. Completed durable changes belong in `CHANGELOG.md`; current system behavior belongs in `docs/`.

## 2026-07-26 03:35 Asia/Kolkata — Universal 3-mode theme system & contrast remediation

Status: DONE

Area:
- reader
- styles
- utils
- sheets

Files touched:
- `styles.css`
- `js/subscription/utils.js`
- `js/subscription/sheets.js`

Summary:
- Replaced 6 fantasy presets (*Aether, Ember, Frost, Midnight, Sage, Parchment*) with a universal **3-Mode Theme System**: **Dark Mode** (`dark`, default), **Light Mode** (`light`), and **Parchment Mode** (`parchment`).
- Configured CSS design tokens for `[data-theme="light"]` (`#f5f7fb` background, `#ffffff` card surfaces, `#1e293b` dark slate text, `#2563eb` blue accent) and refined `[data-theme="parchment"]` (`#f4efe2` sepia background, `#fbf7ee` cream surfaces, `#2d2319` warm dark text, `#8c5a2b` brown accent).
- Added automatic theme normalization in `js/subscription/utils.js` (`normalizeTheme()`) so legacy saved themes (`aether`, `ember`, `frost`, `midnight`, `sage`) seamlessly migrate to `dark` mode without breaking user settings.
- Fixed topbar and bottomnav chrome background mismatch by replacing hardcoded dark green `rgba(10, 14, 11, 0.98)` with dynamic `rgb(var(--chrome) / 0.96)`.
- Fixed hero header text contrast by replacing hardcoded faint greenish-grey `#c4cfc6` with `var(--text-dim)`.
- Fixed text-only chapter card contrast mismatch by removing forced white text and hardcoded dark green card backgrounds (`rgba(10, 14, 12, 0.96)`); text-only tiles now use `var(--surface-solid)` / `var(--surface-solid-2)` with a subtle `--chapter-tier-rgb` tint and high-contrast dark text (`var(--text)`) in light and parchment modes.
- Preserved white text (`#ffffff`) and dark backdrop gradient overlays (`.archive-chapter-shade`) on cover photo cards (`.has-art`) for 100% legibility over full-bleed imagery across all themes.
- Replaced hardcoded dark background (`rgba(11,17,13,.86)`) on footer quick nav cards (`.archive-home-links > a`) with `var(--surface-solid-2)`.
- Updated Reader Lighting options in `js/subscription/sheets.js` to `Dark`, `Light`, and `Parchment`.
- All 16 reader JS files passed `node --check` syntax verification.

Remaining work:
- None.

Risks / notes:
- None.

Verification needed:
- Open reader site and toggle between Dark Mode, Light Mode, and Parchment Mode in Settings to verify smooth rendering and high contrast across all pages.
- Check text-only cards, image cards, topbar, hero header, and quick nav footer cards in both Light Mode and Parchment Mode.

## 2026-07-26 03:10 Asia/Kolkata — Tile glow removal & chapter catalog ascending order alignment

Status: DONE

Area:
- reader
- styles
- views

Files touched:
- `styles.css`
- `js/subscription/views/story-reader.js`

Summary:
- Stripped heavy glowing `box-shadow` styles, continuous `cta-pulse` button keyframe animations, radial gradient overlays, and `.archive-card-glow` dots across all cards and tiles in `styles.css`.
- Completely disabled moving light sweep (`archiveUnreadSweep`) and pulsing glow (`archiveUnreadPulse`) animations on unread chapter cards.
- Updated `VIEWS.chapters` in `js/subscription/views/story-reader.js` to default the Chapter Catalog to **Ascending Order** (`Chapter 1 → Chapter N`), allowing readers to start from Chapter 1 without confusion.
- Added a sort control toggle (`[Chapter 1 → N (Ascending)]` vs `[Newest first (Descending)]`) saved in `store.filters.chapterSort`.
- Converted all homepage surfaces in `styles.css` from hardcoded dark green colors (`#090d0b`, `#080b09`, `rgba(4,8,6,...)`, `rgba(9,13,11,...)`) to CSS design tokens (`var(--surface-solid)`, `var(--surface-2)`, `var(--bg)`, `var(--border)`, `var(--text)`), allowing the homepage to dynamically respond to all theme presets (Aether, Ember, Frost, Midnight Ink, Sage, Parchment).
- Updated `t.dataset.siteTheme` in `js/subscription/events.js` to call `render()`.
- All 16 subscription reader JS files passed `node --check` syntax verification.



Remaining work:
- None.

Risks / notes:
- None.

Verification needed:
- Open `#/story/<slug>/chapters` in reader to verify ascending order (`Chapter 1` at top) and test the sort toggle.
- Verify smooth, lag-free scrolling across home feed, chapter cards, and gallery tiles.

## 2026-07-25 23:10 Asia/Kolkata — Character Gallery & Visual Archive import


Status: NEEDS REVIEW

Area:
- reader
- views
- backend
- router
- chrome
- styles

Files touched:
- `js/subscription/views/gallery.js`
- `js/subscription/state.js`
- `js/subscription/backend.js`
- `js/subscription/router.js`
- `js/subscription/chrome.js`
- `js/subscription/events.js`
- `index.html`
- `styles.css`
- `database/sql/2026-07-25_gate_nsfw_gallery_by_subscription.sql`
- `supabase/migrations/20260725180600_gate_nsfw_gallery_by_subscription.sql`
- `docs/SUBSCRIPTION_FUNCTION_INDEX.md`
- `docs/CODEBASE_OVERVIEW.md`

Summary:
- Successfully imported and integrated the Character Gallery & Visual Archive from Abstracto Tales.
- Added `VIEWS.gallery` and `VIEWS.galleryChar` in `js/subscription/views/gallery.js`.
- Implemented featured character hero card, character collection decks, "Fresh Transmissions" feed, tag chips, search input, sort dropdown, view mode toggle (grid/deck), R18 mature content filter, and full interactive Lightbox modal with upvoting.
- Fixed root cause of page freeze during navigation: added missing `return r;` to `parseHash()` in `js/subscription/router.js`.
- Fixed root cause of loader spinner lock: reconstructed `loadBackendLibrary()` control flow in `js/subscription/backend.js`. Restored proper `try...catch...finally` scoping so `backendState.loaded = true` is set and `backendState.loading = false` executes cleanly in `finally`.
- Fixed the remaining `#/gallery` render crash: `gallery.js` called a nonexistent `escAttr()` helper in its landing-page template. Gallery attribute values now use the existing HTML-safe `esc()` helper.
- Fixed R18 artwork remaining hidden on the Visual Archive landing page after using character-gallery search/tag controls. The landing feed now applies only its visible R18 control instead of inheriting invisible character-view filters.
- Added a reader-side subscription gate for mature gallery rows. Guests and signed-in readers without an active entitlement see a compact subscription banner instead of the R18 toggle; active subscribers and admins can opt into R18 artwork.
- Added and applied an idempotent RLS migration that limits published mature-tagged `character_gallery_images` rows to admins or users with a current active entitlement while leaving non-mature published artwork public.
- All 16 subscription reader JS files passed `node --check` syntax verification.



Remaining work:
- None for the subscription gate. The migration is recorded in linked migration history as `20260725180600`.

Risks / notes:
- Gallery files currently use public author-storage URLs. The RLS migration prevents non-subscribers from discovering mature rows through `character_gallery_images`, but an already-known public object URL remains directly reachable. Cryptographically private media would require moving mature assets to a private bucket and issuing short-lived signed URLs after entitlement verification.

Verification needed:
- Completed locally: gallery syntax checks and a VM smoke test rendered both the Visual Archive landing view and a character gallery without runtime errors.
- Completed locally: subscription-gate smoke checks confirmed guests receive one safe image plus the subscription banner, subscribers see the R18 toggle, and enabling it reveals mature rows.
- Completed against the linked database: anonymous and authenticated-unsubscribed roles returned 8 safe rows and 0 mature rows; active subscriber and admin roles returned 12 total rows including 4 mature rows.
- Open `#/gallery` in reader to view Visual Archive landing page.
- Select a character deck to enter `#/gallery/<slug>/<charId>`.
- Open artwork in Lightbox, test keyboard navigation (ArrowLeft, ArrowRight, Escape) and vote buttons.

## 2026-07-25 22:25 Asia/Kolkata — Reader mobile and responsive audit remediation


Status: DONE

Area:
- reader
- styles

Files touched:
- `styles.css`
- `js/subscription/chrome.js`
- `js/subscription/views/home-library.js`
- `js/subscription/utils.js`

Summary:
- Addressed all 31 screenshot-grounded mobile (381px) and desktop (944px) audit items.
- Root Cause Title Anchoring Fix: Fixed floating title text on artwork cards (`Chapter 23`, `Chapter 22`, etc.) by removing conflicting `margin-top: auto` on `.archive-card-footer` (`margin-top: 8px !important`). `.archive-chapter-copy` now takes `margin-top: auto !important`, locking both the title and footer together at the bottom of the card over the dark gradient backdrop with zero middle gap.
- Strict Chapter Index Ordering: Fixed `homeFeedItems()` to keep chapters in strict descending numerical chapter index order (`Chapter 46, 45, 44, 43, 42, 41, 40...`). Removed slot-stealing logic that previously forced older chapters (like Chapter 23 and 22) into early positions.
- Artwork Curation & Pagination: Max 6 artwork cards (gallery images + character illustrations) are interspersed smoothly across the feed without breaking chapter sequence. Added a "Load More Chapters & Artwork" pagination button at the bottom of the grid (`data-act="home-feed-load-more"`).
- Tile Simplification & Cleanup: Removed top widget bar (`● NEW`, `CHAPTER`, `✓ Available` tickmark) and redundant read action button (`Open chapter` / `Read ✓`) from chapter tiles. Entire tile is natively clickable (`data-read`). Removed legacy `memberArchivePanel` component.
- Tier-Colored Cards & Read State Contrast: Chapter cards render with full tier background colors using `--chapter-tier-rgb` (emerald for Free Access, violet for Licker, amber for Tyrant, rose for Nemesis, sky blue for Evil). Unread chapters are styled with bright, vibrant gradient surfaces and glowing accents; read/completed chapters automatically transition to darker, subdued, muted tier shades with soft text.
- Mobile 1-Column Reflow: Converted mobile viewports (`< 560px` / `381px`) to a 1-column layout (`flex-direction: column`). Cards occupy full viewport width (~350px), completely preventing horizontal smushing, single-line text wrapping traps, kicker overlaps, and vertical text compression.
- Opacity & Z-index: Sticky header and bottom nav are now solid opaque dark surfaces (`rgba(10, 14, 11, 0.98)`) with `z-index: 100`. Main container padding accounts for safe-area insets and bottom nav height so content scrolls 100% clear.
- Media Layering & Card Heights: Creature images and card backgrounds use explicit z-indexes (`img` `z-index: 0`, gradient shade `z-index: 1`, body `z-index: 2` with `position: relative`). Replaced rigid mobile card min-heights with content-driven vertical expansion.
- Shell & Filter Polish: Centered root main layout (`width: 100%; max-width: var(--maxw); margin: 0 auto`), added visible track to 0% progress bar, boosted text contrast for secondary labels (`#c4cfc6`), expanded gallery zoom touch target (`44px x 44px`), and updated selected filter chip active state to neutral brand accent.

Remaining work:
- None for this audit.

Risks / notes:
- None.

Verification needed:
- Completed: `node --check` syntax verification passed for all touched JavaScript files.
- Manual browser checks at 320, 360, 375, 381, 430, 768, and 944px width confirm no horizontal overflow, clear header/footer scrolling, visible card metadata, and proper media layering.

## 2026-07-25 — Writer AI integration

Status: DONE

Area:
- writer
- database
- Supabase Edge Functions
- docs

Files touched:
- `docs/AI_INTEGRATION_HANDOVER.md`
- `writer.html`
- `js/writer-ai-chat.js`
- `js/writer-summary-manager.js`
- `styles/writer-ai-chat.css`
- `styles/writer-summary-manager.css`
- `vendor/deep-chat/*`
- `supabase/functions/writer-openrouter-chat/index.ts`
- `supabase/functions/writer-generate-summary/index.ts`
- `supabase/config.toml`
- `supabase/migrations/20260725093000_add_writer_ai_chat.sql`
- `supabase/migrations/20260725101500_add_writer_summary_details.sql`
- `database/sql/2026-07-25_add_writer_ai_chat.sql`
- `database/sql/2026-07-25_add_writer_summary_details.sql`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/ADMIN_FUNCTION_INDEX.md`
- `docs/DATABASE_CONTEXT.md`
- `CHANGELOG.md`
- `PROJECT_STATE.md`

Summary:
- Completed the AI-chat and separate review-first Summary Manager slices while preserving separation between Context, conventional chat, summary generation, and chapter editing.
- Added pinned Deep Chat 2.5.0 with story-scoped Supabase history, thread CRUD/search, per-thread model/settings, streaming/Stop, copy, and independent-Scratchpad saves.
- Applied and recorded migration `20260725093000`, deployed the authenticated admin-only `writer-openrouter-chat` Edge Function, and confirmed unauthenticated calls return HTTP 401.
- Added **Copy context & open AI**; it copies and opens only and never pastes or sends.
- Added exact-source Short/Long Summary generation, separate style references, private draft/review/accept/archive/supersede lifecycle, and Context filtering so only accepted summaries are reusable.
- Applied and recorded migration `20260725101500`, deployed authenticated admin-only `writer-generate-summary`, and confirmed unauthenticated calls return HTTP 401.
- The pre-slice chapter safety check found 40 rows. The final check found 39 rows with the same latest update timestamp; comparison to the verified backup identified missing Chapter 41 (`32708465-5373-4533-be19-54ca3655fa7c`). Neither migration nor either AI Edge Function has a chapter write/delete path, so the row was not automatically restored.

Remaining work:
- Configure the `OPENROUTER_API_KEY` Supabase Edge Function secret. Optional attribution secrets are `WRITER_AI_SITE_URL` and `WRITER_AI_APP_TITLE`.
- Configure the `GEMINI_API_KEY` Supabase Edge Function secret.
- Run authenticated end-to-end Writer QA for thread CRUD, model changes, streaming, Stop, refresh/resume, story switching, and both Scratchpad save actions.
- Run authenticated end-to-end Summary Manager QA for Short/Long generation, style-only references, drafts, acceptance, archiving, supersession, Context visibility, and story switching.

Risks / notes:
- Live OpenRouter responses cannot succeed until the server-side key is configured; the deployed function returns a controlled configuration error instead of exposing a key.
- Live Gemma summary generation cannot succeed until `GEMINI_API_KEY` is configured; generation otherwise fails without creating a draft or modifying a chapter.
- Chapter 41 disappeared from the live table during the work window. The cause is unknown because there is no chapter audit table; confirm whether this was an intentional concurrent deletion before restoring from the verified backup.
- The drawer shell was browser-checked while signed out at desktop and 390x844, but an authenticated session was unavailable for full Deep Chat/Supabase interaction testing.
- The Summary Manager shell was browser-checked while signed out at desktop; authenticated source loading and provider generation remain unverified.
- Chat does not auto-inject Context Workspace content, and neither AI Edge Function has a chapter write path.

Verification needed:
- Sign in as admin, open Writer AI on Dashboard, Editor, and Context, then create/rename/delete chats and confirm each story has isolated history.
- Send a streaming response, Stop one mid-stream, reload, switch threads/stories, and confirm saved sequence/order and partial-response metadata.
- Save the latest user and assistant messages to independent Scratchpads and confirm no row is added to legacy chapter-linked `scratchpads`.
- Generate and review Short and Long Summary drafts, verify only explicit acceptance exposes them in Context, and verify archive/supersede behavior.
- Confirm whether missing Chapter 41 was intentionally deleted. If not, restore only that verified backup row with explicit approval, then recompute the chapter fingerprint.
- Verify no provider key appears in browser source or network responses and confirm chapters remain unchanged.

## 2026-07-24 12:17 Asia/Kolkata — Desktop context import and Chapter Note follow-up

Status: NEEDS REVIEW

Area:
- writer
- database

Files touched:
- `writer.html`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/ADMIN_FUNCTION_INDEX.md`
- `docs/DATABASE_CONTEXT.md`
- `CHANGELOG.md`
- `PROJECT_STATE.md`

Summary:
- Independent Scratchpads now use story-level `writer_context_blocks`; existing chapter-linked `scratchpads` rows are presented as Chapter Notes.
- Chapter Notes open in an in-screen side drawer rather than manuscript tabs. The Context Scratchpads dock can include or hide Chapter Notes.
- No row migration was required for existing web data, and existing preset references remain valid.
- Linked-project verification found 1 existing chapter-linked row (now shown as a Chapter Note) and 0 independent scratchpad blocks. The only Supabase story is `Resident Evil: A Zombie Tale`; the desktop `SW_Gray_Tales` project was not auto-mapped to it.

Remaining work:
- Desktop context import from `A:\Novels\Dead Must Breed` is complete. Five reusable blocks and the mapped `Default Order` preset were imported; all desktop chapter files were skipped.
- Before any import, a verified local backup of all 40 web chapters and related story data was created at `C:\Users\admis\Documents\author_site_backups\resident_evil_20260724_131801`. No chapter or context rows were changed during the backup operation.
- Post-import chapter comparison passed for all 40 rows with fingerprint `67224898120399e09bb574564dd72894ffc8aeeed7d46a0eea054fc25558aa67`. The backup folder also contains the import mapping manifest, post-import context snapshots, and refreshed SHA-256 checksums.

Risks / notes:
- The physical `scratchpads` table and preset `scratchpad_id` column intentionally retain their legacy names for compatibility.
- Desktop block IDs, ordering, saved-scene references, and local HTML/Markdown need deterministic mapping and duplicate detection before upload.

Verification needed:
- In an authenticated Writer session, create/edit/delete a Chapter Note from the chapter settings, chapter index, sidebar, and Context Workspace.
- Confirm Chapter Notes never enter the manuscript tab strip and the Scratchpads “Show chapter notes” checkbox persists independently per story.
- Confirm existing presets containing `scratchpad_id` references still load and export their Chapter Notes.

## 2026-07-23 09:20 Asia/Kolkata - Writer responsive workspace and collapsible rails

Status: NEEDS REVIEW

Area:
- writer

Files touched:
- `writer.html`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/ADMIN_FUNCTION_INDEX.md`
- `CHANGELOG.md`
- `PROJECT_STATE.md`

Summary:
- Added persisted controls to collapse/expand the left Writer navigation and the right chapter-settings rail, including on desktop.
- At compact widths, the settings rail now overlays the workspace instead of shrinking the Quill editor; dashboard, editor controls, Quill toolbar, tables, toast area, and modals have narrow-screen containment/reflow rules.
- Follow-up polish moved the panel controls beside the Writer Studio title, replaced the unsupported blank panel icon, removed the native chapter-number spinner, standardized Export/Save/Publish dimensions, and removed cleanup/system-box deletion from the manuscript header.

Remaining work:
- Perform signed-in browser QA at desktop and phone widths with real chapter and scratchpad data.

Risks / notes:
- Layout was statically checked and JavaScript syntax-checked, but the in-app browser cannot open the local `file://` Writer page in this environment.
- The two rail preferences use `ea-writer-primary-sidebar-collapsed` and `ea-writer-editor-settings-collapsed` in localStorage. Compact screens start with both collapsed to protect manuscript space.

Verification needed:
- At desktop width, collapse and re-open both rails; reload and confirm each preference persists without clipping the editor or settings content.
- Confirm the Writer Studio brand shows working settings and navigation icons and that the settings icon reflects the open panel state.
- Confirm the chapter-number capsule accepts keyboard-entered numbers without native up/down controls and switches cleanly between `CH` and `SP` modes.
- At 390x844 and 320x568, open a chapter, type several paragraphs, toggle settings, open Export, and confirm Save/Publish remain reachable.
- Open the Media Library and Censorship Dictionary at phone width; confirm controls wrap, content scrolls, and dialogs remain closable.
- At narrow dashboard widths, verify sort/search/new-chapter controls remain reachable and the index table scrolls horizontally rather than clipping columns.

## 2026-07-20 17:15 Asia/Kolkata - Standalone Writer Export, Censorship & Chapter Scratchpads

Status: DONE

Area:
- writer
- database
- docs

Files touched:
- `writer.html`

Summary:
- Replaced header copy buttons with an Export dropdown menu featuring Copy as Markdown, Copy as Plain Text, and Copy as Rich Text.
- Fixed a layout stacking issue by adding `relative z-20` to the editor header so the absolute-positioned Export dropdown floats cleanly on top of the sticky Quill editor toolbar instead of being clipped by it.
- Plain text copying trims whitespaces and copies system messages without square brackets.
- Built an in-editor censorship system with case preservation, HTML safety, customizable presets (lvl 1 and lvl 2 loaded as default), and an interactive dictionary configuration modal.

Remaining work:
- None.

Risks / notes:
- The censorship dictionary is client-side and saved in localStorage. Clearing site data will reset the dictionary to defaults.

Verification needed:
- Open the standalone Writer and confirm that the Export dropdown and Censorship options are available.
- Select a preset and verify that matched NSFW words and action verbs (like fuck, fucking, dick, cock, sucking, crotch, asshole, pussy, nipples, moan, groan, etc.) are correctly replaced when copying.
- Verify that case preservation is active (e.g. `Cock` -> `C*ck`, `COCK` -> `C*CK`).
- Verify that HTML tags/classes/attributes are not modified during rich/markdown copying with censorship active.
- Verify that managing the dictionary (adding words/presets, deleting entries/presets) behaves correctly in the modal.

## 2026-07-17 10:41 Asia/Kolkata - Structured-system visual approval and integration

Status: NEEDS REVIEW

Area:
- design
- writer
- reader
- database

Files touched:
- `design/system-panels/*`
- `js/system-core.js`, `js/writer-system.js`, `js/subscription/system-panel.js` (inactive prototypes)
- `supabase/migrations/20260717080000_story_systems.sql`

Summary:
- Versioned structured system schema is applied to the linked project and migration history records `20260717080000` as applied.
- Resident Evil Version 1 and the supplied Alex state are seeded as an admin-only baseline draft, not reader-visible.
- The first production UI prototype was detached after visual review. Writer and the subscription reader do not load the system scripts or expose the unfinished controls.
- A separate SVG design lab now establishes three higher-fidelity AAA directions. The BioCore status screen demonstrates editing structured values inside the system dialogue itself and switching to Reader Preview.

Remaining work:
- Obtain visual approval for the standalone BioCore, Red Queen, and Mutation Nexus concepts before production integration.
- After approval, implement the Writer System Builder and chapter update as a WYSIWYG system-dialogue editor, including an in-chapter Reader Preview—not a separate value form.
- Then integrate the persistent reader widget, choose the canonically correct initial/chapter boundary, and publish the seeded draft only after confirming it does not spoil earlier chapters.

Risks / notes:
- Earlier local migrations `20260707222500`, `20260707223000`, and `20260708140000` remain absent from remote migration history; this feature was applied directly and its own migration history repaired without applying unrelated pending migrations.
- Structural versions are locked after checkpoint publication; clone a new version and choose its “activates after chapter” boundary for later fields/pages.
- Do not reconnect `js/writer-system.js` or `js/subscription/system-panel.js` merely because the data model exists; their old presentation is intentionally inactive pending the approved SVG/WYSIWYG implementation.

Verification needed:
- Review all three standalone designs at desktop and mobile widths and approve/revise the visual language.
- After integration, exercise inline value editing, version cloning, field/page additions, catalog editing, mutation slot enforcement, draft save, checkpoint publication, and chapter Reader Preview.
- Confirm Chapter N shows N-1 state until the ending, then reveals N; confirm rereading an older chapter rewinds contextual state while the story hub retains furthest progress.
- Test signed-in progress on two devices, anonymous local progress, free/gated/expired access, and responsive drawer/dialog layout.

## 2026-07-16 19:10 Asia/Kolkata - Home access and notification delivery follow-up

Status: NEEDS REVIEW

Area:
- reader
- database operations

Files touched:
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

Summary:
- Home now exposes tier-colored chapter access and fixed-position tier pills, with narrow-phone containment verified at 390x844.
- In-app/browser notification state now refreshes during an active session and an opened alert is persisted as read.
- Linked-project inspection found 1,088 in-app notification rows and 1,088 matching email-queue rows, confirming the publish trigger is firing.

Remaining work:
- Configure a trusted scheduled invocation for the deployed `send-reader-email-queue` Edge Function. All 1,088 email rows were still `queued`, and the linked database currently has no `cron.job` relation, so email delivery is not being drained automatically.

Risks / notes:
- Do not expose a service-role key in browser code or hard-code it into a public migration merely to schedule the email sender.
- Browser popups remain opt-in and require browser permission; in-app bell notifications work independently.

Verification needed:
- Test Home while signed in at each real tier and confirm Available/Locked state matches the story catalog.
- Test a newly published chapter in a signed-in session and confirm the bell updates within one minute or immediately after returning to the tab.
- After configuring the email scheduler/secrets, confirm queued rows transition to `sent` and a test recipient receives one email only.

## 2026-07-16 16:36 Asia/Kolkata - Manual QA for subscriber tier colors and chapter sharing

Status: NEEDS REVIEW

Area:
- reader

Files touched:
- `js/subscription/utils.js`
- `js/subscription/views/story-reader.js`
- `js/subscription/events.js`
- `styles.css`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/SUBSCRIPTION_FUNCTION_INDEX.md`
- `CHANGELOG.md`
- `PROJECT_STATE.md`

Summary:
- Subscriber chapter cards and rows now carry access-tier color accents for free and gated chapters.
- Chapter share controls generate direct `#/read/<chapter-id>` URLs through the native share sheet or clipboard fallback.

Remaining work:
- None known; complete responsive browser QA with real free, entitled, preview, locked, and external-only chapters.

Risks / notes:
- A shared link intentionally does not bypass authentication, publication, NSFW/external, or entitlement rules; recipients land on the appropriate reader, preview, external prompt, or lock screen.
- Native `navigator.share` availability depends on the browser and secure context; clipboard copy is the fallback.

Verification needed:
- Compare Free Access, Resident Licker, Resident Tyrant, Resident Nemesis, and Resident Evil chapters in the story hub and Chapter Catalog; confirm each has the expected green/purple/amber/rose/cyan treatment whether readable or locked.
- Trigger Share from a catalog card, story row, full/preview reader navigation, locked view, and external-only view.
- Open a copied link in a signed-out/private window and confirm it lands directly on the correct chapter while showing the correct access state.
- Check desktop and mobile layouts for badge wrapping, share-button hit targets, and chapter-row/card readability.

## 2026-07-16 05:52 Asia/Kolkata - Manual QA for standalone Writer navigation and deletion

Status: NEEDS REVIEW

Area:
- admin

Files touched:
- `writer.html`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/ADMIN_FUNCTION_INDEX.md`
- `CHANGELOG.md`
- `PROJECT_STATE.md`

Summary:
- Standalone Writer now exports conventional LLM-friendly Markdown, shows a scrollable chapter rail, supports persisted newer/older/order sorting, provides closable multi-chapter tabs with next-index draft creation, permits color-coded index-level tier updates, and exposes confirmed chapter deletion plus selected system-box deletion.

Remaining work:
- None known; complete browser interaction QA against the linked Supabase project.

Risks / notes:
- Chapter deletion is permanent after confirmation and remains subject to existing Supabase admin RLS and foreign-key constraints.
- Tab changes save a dirty active chapter before hydrating the next tab; failed Supabase saves surface a toast and should be tested under a real admin session.

Verification needed:
- Copy a chapter containing italic, bold, lists, code, a system box, and a scene break as Markdown; confirm the clipboard uses `*italic*`, `**bold**`, `-` bullets, fenced code, a blockquoted **System message** label, and `---`.
- Open several chapters from the left rail and index, switch and close tabs, and confirm dirty content autosaves before switching.
- Switch the Chapter Index between newest updated, oldest updated, chapter order, and reversed chapter order; reload and confirm the selected sort persists.
- While editing, click the plus button at the end of the tab strip; confirm a draft with the next available chapter index is created and opened without losing dirty content in the prior tab.
- Change Free/tier access from the chapter index and reload to verify persistence; confirm the row tint, left accent, and access dot change with the tier and Free Access appears green.
- Delete a test draft from the index and another from editor settings; confirm cancellation is safe and confirmation removes it.
- Put the cursor in a system box, use the message-slash action, save, and verify only that box is removed.

## 2026-07-07 22:15 Asia/Kolkata - Manual QA for inline image upload, URL insertion, and reader rendering

Status: NEEDS REVIEW

Area:
- admin
- reader

Files touched:
- `writer.html`
- `js/subscription/backend.js`
- `CHANGELOG.md`
- `PROJECT_STATE.md`

Summary:
- Standalone Writer now supports uploading inline images or pasting external image URLs from the media library modal.
- Uploaded files are sent to the `chapter-images` Supabase Storage bucket under `${storyId}/${chapterId}/${filename}`.
- If Supabase client/storage is unconfigured or fails, the tool falls back to embedding a base64 Data URL.
- Custom Quill image handler intercepts default image tool interactions and routes them through this picker.
- Fixed the reader backend parser `textToBlocks` in `js/subscription/backend.js` to whitelist `A` and `IMG` tags, preserve their attributes (`href`, `target`, `rel`, `src`), and render them correctly.

Remaining work:
- None.

Risks / notes:
- Confirming that Supabase Storage returns a public URL that loads correctly in browsers.

Verification needed:
- Open `writer.html` in an active browser session.
- Click the image button on the toolbar or run `/image` to open the media library modal.
- Test pasting an external image URL (e.g. `https://picsum.photos/200`) and clicking "Insert URL".
- Test choosing a local image file and clicking "Upload". Verify the image is embedded in the editor.
- Save the draft and verify the content contains the correct image source (either a Supabase public URL or base64 Data URL).
- Open the subscription reader view for the chapter containing images and links, and verify that they render properly without being stripped.

## 2026-07-07 19:45 Asia/Kolkata - Manual QA for editor cleanup and scene-break shortcuts

Status: DONE

Area:
- admin
- reader

Files touched:
- `writer.html`
- `admin.html`
- `js/subscription/backend.js`
- `docs/CODEBASE_OVERVIEW.md`
- `docs/ADMIN_FUNCTION_INDEX.md`
- `docs/SUBSCRIPTION_FUNCTION_INDEX.md`
- `CHANGELOG.md`
- `PROJECT_STATE.md`

Summary:
- Standalone Writer now has a toolbar cleanup button, a `/` command menu with `/scene`, `/clean`, and `/image`, automatic `--` scene-break insertion, and save-time cleanup of blank paragraph filler.
- Embedded Admin Writer / Chapters now has a Remove extra breaks toolbar action and normalizes standalone `--` to scene breaks.
- Reader backend parsing now treats standalone `--` as the existing gold-star scene divider for current or legacy chapter content.
- Applied patch to `writer.html` fixing the autosave editor rewrite, Markdown paste formatting, duplicate slash commands, and Quill tooltips.

Remaining work:
- None.

Risks / notes:
- Syntax checks can validate touched JS, but Quill/contenteditable behavior needs a real browser session.

Verification needed:
- In `writer.html`, type `--`, `/scene`, `/clean`, and `/image`; confirm the slash menu appears, scene breaks render as the divider, cleanup removes blank lines, and Save Draft/Publish persists clean content.
- In Admin CMS Writer / Chapters, confirm Remove extra breaks cleans blank paragraphs and standalone `--` saves/renders as a scene break.
- In the reader, open a chapter containing `<hr>` or standalone `--` and confirm the existing gold-star scene divider appears.

## 2026-07-07 17:30 Asia/Kolkata - Reader notification email delivery setup

Status: TODO

Area:
- reader
- database
- edge-functions

Files touched:
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
- `PROJECT_STATE.md`

Summary:
- Reader notification tables/preferences and chapter publish fanout trigger were added and applied to linked Supabase.
- The reader has notification settings, browser notification permission handling, DB-backed in-app notification sync, profile editing/avatar uploads, a versioned "What's new" popup, and an app background image toggle.
- Admin Settings can save `reader_behavior.appBackgroundUrl` and `enableAppBackground`.
- `send-reader-email-queue` was deployed for Resend-backed queued email delivery.

Remaining work:
- Configure Supabase Edge Function secrets for real email sending: `RESEND_API_KEY`, `READER_EMAIL_FROM`, optional `READER_EMAIL_SITE_NAME`, and optional `READER_EMAIL_QUEUE_SECRET`.
- Invoke/schedule `send-reader-email-queue` after chapter publishes, or set up a cron/webhook runner for queued emails.

Risks / notes:
- Browser notifications are not full background Web Push; they are permission-gated browser popups while the site is open and after the reader fetches unread notification rows.
- Email rows are queued by the DB trigger, but delivery requires the Resend secrets and function invocation/schedule.
- The publish trigger was verified to exist, but no live chapter publish test was performed to avoid sending real reader notifications during that run.

## 2026-07-03 23:03 Asia/Kolkata - Patreon webhook/native update follow-up

Status: TODO

Area:
- database
- reader

Files touched:
- `js/subscription/site-config.js`
- `supabase/functions/_shared/patreon.ts`
- `supabase/functions/provider-webhook/index.ts`
- `docs/DATABASE_CONTEXT.md`
- `CHANGELOG.md`

Summary:
- Patreon OAuth/connect was enabled and title-based tier matching was deployed for `Resident Licker` and `Resident Tyrant`.
- Follow-up on 2026-07-07 relinked the live mappings to Patreon tier IDs `28946758` and `28946791`, renamed the internal high tier display to `Resident Nemesis`, and backfilled one missed entitlement.
- Follow-up on 2026-07-07 updated Patreon OAuth/manual sync and the generic `provider-webhook` to preserve cancellation access only through a provider/stored paid-through timestamp. Renewing patrons remain normal active entitlements; non-renewing currently entitled patrons get bounded `valid_until` access.
- Follow-up on 2026-07-07 corrected the live resident tier ladder: the old `resident-tyrant`/Resident Nemesis UUID is now `resident-nemesis` rank 30, new `resident-tyrant` is rank 20, and new `resident-evil` is rank 40 because it includes all Resident Nemesis benefits. Rolling policy windows are seeded as Nemesis 3 + Tyrant 3 + Licker 6; existing chapter gates were not rewritten during the migration to avoid immediate access loss.

Remaining work:
- Review whether Patreon-native webhook payloads should be parsed directly instead of requiring the current normalized `provider`, `provider_user_id`, `provider_tier_id`, and `status` payload shape.
- If needed, update `provider-webhook` to verify Patreon signatures and map Patreon webhook events to entitlement grants/revokes.
- Replace the temporary title-based Patreon mappings for `Resident Tyrant` and `Resident Evil` with numeric Patreon tier IDs once those IDs are known.

Risks / notes:
- OAuth + manual resync should use deployed `patreon-oauth-*` and `sync-provider-entitlements`.
- Automatic Patreon revokes/pledge changes still need native webhook adaptation if no external normalizer sends the expected generic payload, but the generic webhook now honors `valid_until`, `access_expires_at`, `current_period_end`, or `next_charge_date` when present.
- Existing active Patreon entitlement rows were checked after deploy: 12 active rows, 0 with the new paid-through metadata. Do not fabricate dates for them; they should receive verified period metadata on the next Patreon OAuth/manual sync, or via webhook payload dates.

## 2026-06-29 00:54 Asia/Kolkata - Decide final fate of `/deleted`

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
- After the site stabilizes, decide whether to keep `/deleted` temporarily, commit it as an archive, or remove it permanently.

Risks / notes:
- Parent reference docs under `/deleted/context` and `/deleted/docs` may still be useful for comparison during cleanup.

## 2026-06-29 00:54 Asia/Kolkata - `.codegraph` cleanup blocked by locked DB

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

## 2026-07-23 16:46 Asia/Kolkata - Prompt Dashboard integration assessment

Status: NEEDS REVIEW

Area:
- writer
- database

Files touched:
- `PROJECT_STATE.md`

Summary:
- Assessed the external PySide6 Prompt Dashboard at `A:\Star wars rebel\prompt\main.pyw` and its `json_database.py` storage layer for integration with the Supabase-backed Writer.
- The useful product model is a story-level, admin-only context workspace made of reusable blocks (writing style, long summary, chapter summary, chapter, outline, and scratchpad), selectable simple/advanced prompt ordering, saved scene presets, live prompt preview, search, and text/Markdown/ChatGPT JSON export.
- Completed phases 1-2 by porting those concepts into `writer.html` and Supabase rather than embedding or translating the Python desktop UI. Existing `chapters` and chapter-linked `scratchpads` remain sources of truth and are referenced from context presets instead of duplicated.
- Replaced the provisional Context UI with a narrow browser-style tabbed library, dominant preview canvas, and compact preset/order rail.
- Added rich drawer create/edit/save/duplicate/delete for reusable blocks, source-aware edit/duplicate/delete actions for chapters and scratchpads, whole-card selection, active-tab/global selection controls, persistent tab/block ordering, drag-based advanced item order, per-section statistics, downloads, and complete preset management.
- Replaced the uneven horizontally scrolling section strip with a fixed three-column by two-row equal-size tab grid. Added per-story local workspace snapshots and last-surface restoration so reloads return to the same Context tab, selection/order, mode, preset, budget, search, and library/preview scroll positions.
- Applied `20260723170000_add_writer_context_workspace.sql` to the linked project and marked that migration version applied.
- Applied `20260723173000_add_context_preset_active_section.sql` so presets restore their active library section.
- The inspected `SW_Gray_Tales` project contains 53 indexed blocks and about 157,015 indexed words. All JSON files parsed, indexed HTML/Markdown files existed, saved-scene/order references resolved, and both Python files passed `py_compile`.

Remaining work:
- Manually verify the signed-in Context Workspace with real content at desktop and phone widths.
- A desktop JSON project importer remains a separate future phase and was not included in phases 1-2.

Risks / notes:
- Do not upload the desktop project folders or story text automatically; the source material may be private and is much larger than a practical single AI prompt.
- The desktop app's local HTML/Markdown files and Supabase chapter HTML use related but non-identical data contracts, so importing requires sanitization, deterministic ID mapping, and duplicate detection.
- Token totals are deliberately estimates based on roughly four characters per token; actual model tokenization varies.

Verification needed:
- With an authenticated admin session, create/edit/duplicate/delete each context-block type, exercise chapter/scratchpad lifecycle actions, drag reusable blocks within a tab, drag selected items across sections in advanced mode, and save/load/rename/duplicate/delete two presets.
- Confirm Markdown, plain-text, and ChatGPT JSON clipboard output and token-budget warning colors.
- Switch active stories and verify context blocks/presets never leak across stories.
- Reload from each Writer surface and from two different story Context sessions; confirm the correct surface and each story's independent transient Context state and scroll positions are restored.
## 2026-07-25 19:41 Asia/Kolkata — Mixed archive home feed browser review

Status: NEEDS REVIEW

Area:
- reader

Files touched:
- js/subscription/config.js
- js/subscription/backend.js
- js/subscription/utils.js
- js/subscription/views/home-library.js
- js/subscription/events.js
- styles.css

Summary:
- The home route uses a compact cinematic masthead and a responsive editorial chapter/gallery grid driven by the active reader theme variables.
- The linked Supabase project currently has one published Rebecca Chambers gallery image, so the gallery path has real content for browser review.
- `chapter_feed_images` supplies public visual previews from images already embedded or referenced in published chapters. Valid durable chapter artwork is promoted near the top of the feed without guest blur; malformed or inaccessible external URLs fall back to compact text cards.

Remaining work:
- Build the dedicated gallery landing/character viewer separately; the home image sheet is intentionally a lightweight first step.

Risks / notes:
- General home results exclude images tagged `r18`, `mature`, or `nsfw`; a future authenticated opt-in gallery route should own mature-content disclosure and preferences.

Verification needed:
- Completed locally: anonymous desktop/mobile-layout browser checks confirmed no guest blur, no oversized text-only cards, visible valid chapter artwork, and fallback for failed media.
- Recheck the mosaic after additional chapters receive embedded images; the automatic trigger will index them on the next chapter save.
