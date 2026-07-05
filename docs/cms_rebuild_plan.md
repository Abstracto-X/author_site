# Admin/Author Studio Rebuild Plan

## Summary
Rebuild `admin.html` surgically into a webnovel subscription cockpit while keeping the no-framework monolithic architecture. Remove the reader-side `/studio` prototype surface as an active product, but port its useful writing-editor ideas into Admin CMS. Admin v1 will focus on story/chapter publishing, rich chapter writing, rolling tier access, reader CRM, comments/reactions, and subscription settings.

## Key Changes
- Replace current admin IA with primary sections:
  - Dashboard
  - Stories
  - Writer / Chapters
  - Rolling Access
  - Readers / CRM
  - Community
  - Site Settings
  - Story Extras
- Move characters, lore, gallery, maps, timeline, wallpapers, and map requests into secondary “Story Extras”; do not make them first-class nav.
- Stop loading/removing active reader-side Author Studio routes from `index.html`; `/studio` should redirect/admin-gate to `admin.html`.
- Replace chapter textarea modal with a focused rich editor:
  - contenteditable writing canvas
  - title, story, chapter order, publish state, tier state, NSFW flag, external URL
  - word count, autosave draft, preview text helper
  - save draft / publish controls
  - sanitized HTML saved to existing `chapters.content`
- Update reader rendering to preserve safe basic formatting:
  - paragraphs
  - headings
  - blockquotes
  - bold/italic
  - scene breaks
  - no arbitrary scripts/styles/iframes

## Schema / Interface Changes
- Add `public.story_access_policies`:
  - `id uuid`
  - `story_id uuid references stories(id)`
  - `enabled boolean default true`
  - `rules jsonb not null`
  - `created_at`, `updated_at`
- Store rolling rules per story as JSON like:
  - Tier 2: latest 10 chapters
  - Tier 1: latest 5 chapters after Tier 2 window
  - older chapters become public/free
- Add chapter NSFW/external fields:
  - `chapters.is_nsfw boolean default false`
  - `chapters.external_url text`
- Rolling access behavior:
  - On chapter publish/save, automatically recalculate that story’s published chapters by `chapter_order`.
  - NSFW chapters count in rolling positions but always remain external-locked in reader UI.
  - Non-NSFW older chapters beyond configured tier windows become free/public by setting `required_tier_id = null`.
- Reader NSFW behavior:
  - If `is_nsfw = true`, do not render local chapter content.
  - Show a clear prompt that the chapter must be viewed externally.
  - Link to that chapter’s `external_url`.

## Admin Features
- Rolling Access view:
  - per-story rule editor
  - tier window inputs
  - live matrix showing chapter → required tier/free/external
  - “recalculate now” action
  - auto-apply after publish/save
- Writer / Chapters view:
  - story selector
  - chapter list with status, tier, public/free, NSFW/external, words
  - rich editor opens inline/fullscreen instead of small modal
- Reader / CRM:
  - reader profile search
  - entitlement list
  - provider connection visibility
  - access key redemption visibility
  - entitlement audit log view
  - manual grant/revoke retained but cleaned up
- Community:
  - chapter comments moderation/read view
  - reaction totals by story/chapter
  - links from comments to reader profile and chapter
- Site Settings:
  - reader identity
  - provider settings display
  - guide/onboarding toggles
  - subscription behavior defaults
  - global external/Webnovel fallback optional, but per-chapter URL remains source of truth

## Test Plan
- Run `node --check` for all touched reader scripts.
- Manually verify Admin CMS:
  - login/admin gate
  - story create/edit
  - rich chapter save/edit
  - publish triggers rolling access recalculation
  - NSFW chapter stores external URL and remains external-locked
  - reader CRM loads profiles/entitlements/provider data
  - community view loads comments and reactions
- Verify Supabase:
  - migrations are idempotent
  - `NOTIFY pgrst, 'reload schema';` included
  - RLS policies allow admin writes and safe public/reader reads only where intended
- Verify reader:
  - normal chapter renders sanitized basic formatting
  - locked/free/tier chapters still work
  - NSFW chapter shows external prompt only
  - no `/studio` prototype UI remains visible

## Assumptions
- Keep `admin.html` monolithic; no framework, no bundler.
- Use new DB table for rolling access policies.
- Save editor output as sanitized HTML in `chapters.content`.
- NSFW chapters are per-chapter, have per-chapter external URLs, count in rolling positions, and never render local content.
- Existing uncommitted work should be preserved; implementation must not overwrite unrelated changes.
