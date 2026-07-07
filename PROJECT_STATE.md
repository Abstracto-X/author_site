# Project State

Active memory for unfinished work, deferred decisions, risky areas, and follow-up tasks. Completed durable changes belong in `CHANGELOG.md`; current system behavior belongs in `docs/`.

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
