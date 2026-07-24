# Project State

Active memory for unfinished work, deferred decisions, risky areas, and follow-up tasks. Completed durable changes belong in `CHANGELOG.md`; current system behavior belongs in `docs/`.

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
