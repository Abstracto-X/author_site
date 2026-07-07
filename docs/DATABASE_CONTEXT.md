# Database Context

Generated from the linked Supabase project on 2026-06-29. This is the compact source-of-truth snapshot for tables, columns, RLS policies, functions, and storage buckets.

## Architecture

- Backend: Supabase PostgreSQL/Auth/Storage.
- Application schema: `public`; storage metadata/policies live under `storage`.
- Browser clients use the anon key only. Admin writes are protected by RLS policies and `public.is_admin()`.
- Reader access flows rely on `get_chapter_catalog`, `get_reader_chapter`, `get_my_entitlements`, and `redeem_access_key`.
- Reader notification flows use `reader_notifications`, `reader_notification_preferences`, and `reader_email_queue`. Publishing a chapter fans out in-app notifications and queued email rows to readers whose active entitlement/admin role covers the chapter's required tier.
- Patreon access flows use Edge Functions under `supabase/functions/`: `patreon-oauth-start`, `patreon-oauth-callback`, and `sync-provider-entitlements`. Patreon OAuth stores provider connections/tokens server-side, then creates `user_entitlements` from active `provider_tier_mappings`.
- Reader email notification delivery uses `supabase/functions/send-reader-email-queue`, which processes queued `reader_email_queue` rows through Resend when `RESEND_API_KEY` and `READER_EMAIL_FROM` are configured.
- Patreon provider mappings can match Patreon membership tiers by actual Patreon tier ID or by exact tier title via `provider_tier_id` / `provider_tier_label`; current live mappings use Patreon tier IDs.
- Patreon OAuth/manual sync requests member fields including `currently_entitled_tiers`, `next_charge_date`, `last_charge_date`, `pledge_cadence`, and `will_pay_amount_cents`. Renewing patrons keep normal active entitlements; canceled/non-renewing patrons who are still covered by a Patreon-reported paid period receive bounded `valid_until` access through the current period. Provider revoke/expired webhooks preserve access only to a future paid-through timestamp supplied by the provider payload or already stored entitlement metadata; otherwise they expire access immediately.
- After durable schema changes, run `NOTIFY pgrst, 'reload schema';`.

## Configured access/provider tiers

As of 2026-07-07 16:53 Asia/Kolkata, the linked project has these active Patreon-facing access tiers. Patreon mappings for Licker and Nemesis use actual Patreon tier IDs; Tyrant and Evil temporarily match by exact Patreon tier title until their numeric Patreon tier IDs are known. Rank controls cumulative access through `held.tier_rank >= required.tier_rank`, so Resident Evil is highest because it includes all Resident Nemesis benefits.

| Internal slug | Internal name | Rank | Provider | Provider tier ID | Provider tier label |
|---|---|---:|---|---|---|
| `resident-licker` | Resident Licker | 10 | `patreon` | `28946758` | `Resident Licker` |
| `resident-tyrant` | Resident Tyrant | 20 | `patreon` | `Resident Tyrant` | `Resident Tyrant` |
| `resident-nemesis` | Resident Nemesis | 30 | `patreon` | `28946791` | `Resident Nemesis` |
| `resident-evil` | Resident Evil | 40 | `patreon` | `Resident Evil` | `Resident Evil` |

The previous `resident-tyrant`/Resident Nemesis row was converted in place to `resident-nemesis`, preserving its UUID for existing entitlements and references. Current active entitlement counts immediately after the change were: Licker 14, Tyrant 0, Nemesis 10, Evil 0. Existing chapter gates were not rewritten during the migration; 7 chapters still required `resident-licker` immediately after the change.

## Configured site settings

The reader now consumes `public.site_settings` for production site identity:

| Setting key | Shape | Purpose |
|---|---|---|
| `site_identity` | JSON object with `siteName`, `siteTagline`, `pageTitle`, and `metaDescription` | Controls the reader/admin-facing site name and browser metadata. Current site name: `EvilArchives`. |
| `reader_behavior` | JSON object with `enableReaderGuides`, `globalExternalUrl`, and `providerNote` | Admin-authored defaults/notes for onboarding, provider display, and optional global external fallback. The reader loads this setting at startup; per-chapter `chapters.external_url` remains source of truth for NSFW/external chapters, with `globalExternalUrl` used only as a fallback link. |

`site_settings.setting_key` is protected by the unique index `site_settings_setting_key_key` so Admin CMS saves update the existing setting instead of creating duplicates.

## Storage buckets

| Bucket | Public | File limit | MIME allowlist |
|---|---:|---:|---|
| `author` | true | 5242880 | image/png, image/jpeg, image/gif, image/webp, image/avif |
| `backgrounds` | true | 15728640 | image/png, image/jpeg, image/gif, image/webp, image/avif |
| `chapter-images` | true | 15728640 | image/png, image/jpeg, image/gif, image/webp, image/avif |
| `characters` | true | 10485760 | image/png, image/jpeg, image/gif, image/webp, image/avif |
| `covers` | true | 10485760 | image/png, image/jpeg, image/gif, image/webp, image/avif |
| `lore` | true | 10485760 | image/png, image/jpeg, image/gif, image/webp, image/avif |
| `maps` | true | 26214400 | image/png, image/jpeg, image/gif, image/webp, image/avif |
| `Reader` | true | 5242880 | image/png, image/jpeg, image/gif, image/webp |

## Tables and columns

### `public.access_key_redemptions`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `key_id` | uuid | NO |  |
| `user_id` | uuid | NO |  |
| `entitlement_id` | uuid | YES |  |
| `redeemed_at` | timestamp with time zone / `timestamptz` | NO | now() |
| `metadata` | jsonb | NO | '{}'::jsonb |

### `public.access_keys`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `key_hash` | text | NO |  |
| `key_prefix` | text | YES |  |
| `tier_id` | uuid | NO |  |
| `label` | text | YES |  |
| `campaign` | text | YES |  |
| `status` | text | NO | 'active'::text |
| `max_uses` | integer / `int4` | NO | 1 |
| `uses_count` | integer / `int4` | NO | 0 |
| `valid_from` | timestamp with time zone / `timestamptz` | NO | now() |
| `valid_until` | timestamp with time zone / `timestamptz` | YES |  |
| `entitlement_duration_days` | integer / `int4` | YES |  |
| `metadata` | jsonb | NO | '{}'::jsonb |
| `created_by` | uuid | YES |  |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |
| `updated_at` | timestamp with time zone / `timestamptz` | NO | now() |

### `public.author_links`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `profile_id` | uuid | YES |  |
| `platform_name` | text | YES |  |
| `url` | text | YES |  |
| `icon_url` | text | YES |  |
| `note` | text | YES |  |
| `sort_order` | integer / `int4` | NO | 0 |

### `public.chapters`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `story_id` | uuid | NO |  |
| `title` | text | NO |  |
| `content` | text | YES |  |
| `chapter_order` | integer / `int4` | NO | 0 |
| `word_count` | integer / `int4` | YES |  |
| `is_published` | boolean / `bool` | NO | false |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |
| `updated_at` | timestamp with time zone / `timestamptz` | NO | now() |
| `required_tier_id` | uuid | YES |  |
| `public_release_at` | timestamp with time zone / `timestamptz` | YES |  |
| `preview_text` | text | YES |  |
| `cover_image_url` | text | YES |  |
| `background_image_url` | text | YES |  |
| `referenced_image_urls` | ARRAY / `_text` | NO | '{}'::text[] |
| `media` | jsonb | NO | '[]'::jsonb |
| `is_nsfw` | boolean / `bool` | NO | false |
| `external_url` | text | YES |  |

`is_nsfw = true` chapters are external-only in the reader: local `content` is not returned by `get_reader_chapter`; the reader shows an external prompt using `external_url`.

### `public.character_gallery_images`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `character_id` | uuid | YES |  |
| `image_url` | text | NO | ''::text |
| `caption` | text | YES |  |
| `image_tags` | ARRAY / `_text` | NO | '{}'::text[] |
| `is_published` | boolean / `bool` | NO | true |
| `sort_order` | integer / `int4` | NO | 0 |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |

### `public.characters`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `story_id` | uuid | YES |  |
| `name` | text | NO | ''::text |
| `role_title` | text | YES |  |
| `biography` | text | YES |  |
| `profile_image_url` | text | YES |  |
| `sort_order` | integer / `int4` | NO | 0 |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |

### `public.comments`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `user_id` | uuid | YES |  |
| `target_id` | uuid | YES |  |
| `target_type` | text | YES |  |
| `content` | text | NO | ''::text |
| `referenced_image_url` | text | YES |  |
| `metadata` | jsonb | NO | '{}'::jsonb |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |

### `public.chapter_reactions`

Reader chapter-end reactions. One reaction per user per chapter; selecting the same reaction again removes it in the reader UI.

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `user_id` | uuid | NO |  |
| `chapter_id` | uuid | NO |  |
| `reaction` | text | NO |  |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |
| `updated_at` | timestamp with time zone / `timestamptz` | NO | now() |

### `public.entitlement_audit_log`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `user_id` | uuid | YES |  |
| `actor_user_id` | uuid | YES |  |
| `action` | text | NO |  |
| `source` | text | NO |  |
| `provider` | text | YES |  |
| `entitlement_id` | uuid | YES |  |
| `access_key_id` | uuid | YES |  |
| `details` | jsonb | NO | '{}'::jsonb |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |

### `public.image_votes`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `user_id` | uuid | YES |  |
| `image_id` | uuid | YES |  |
| `vote_value` | integer / `int4` | NO | 1 |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |

### `public.lore_categories`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `story_id` | uuid | YES |  |
| `name` | text | NO | ''::text |
| `slug` | text | YES |  |
| `sort_order` | integer / `int4` | NO | 0 |

### `public.lore_entries`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `story_id` | uuid | YES |  |
| `slug` | text | YES |  |
| `title` | text | NO | ''::text |
| `category_id` | uuid | YES |  |
| `description` | text | YES |  |
| `image_url` | text | YES |  |
| `sort_order` | integer / `int4` | NO | 0 |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |

### `public.map_request_items`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `request_id` | uuid | YES |  |
| `action` | text | YES |  |
| `entity_type` | text | YES |  |
| `entity_id` | uuid | YES |  |
| `proposed_data` | jsonb | NO | '{}'::jsonb |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |

### `public.map_requests`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `map_id` | uuid | YES |  |
| `user_id` | uuid | YES |  |
| `title` | text | NO | ''::text |
| `reason` | text | YES |  |
| `status` | text | NO | 'pending'::text |
| `feedback` | text | YES |  |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |
| `updated_at` | timestamp with time zone / `timestamptz` | NO | now() |

### `public.maps`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `story_id` | uuid | YES |  |
| `slug` | text | YES |  |
| `map_name` | text | NO | ''::text |
| `image_url` | text | NO | ''::text |
| `is_primary` | boolean / `bool` | NO | false |
| `width` | integer / `int4` | YES |  |
| `height` | integer / `int4` | YES |  |
| `is_published` | boolean / `bool` | NO | false |
| `sort_order` | integer / `int4` | NO | 0 |
| `map_type` | text | YES |  |
| `created_by` | uuid | YES |  |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |
| `updated_at` | timestamp with time zone / `timestamptz` | NO | now() |

### `public.profiles`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO |  |
| `username` | text | YES |  |
| `display_name` | text | YES |  |
| `avatar_url` | text | YES |  |
| `role` | text | NO | 'reader'::text |
| `bio` | text | YES |  |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |
| `updated_at` | timestamp with time zone / `timestamptz` | NO | now() |

Reader accounts can update their own `username`, `display_name`, and `avatar_url` through existing `profiles_own_update` RLS. Reader avatar uploads use the `Reader/<user_id>/profile/...` storage path.

### `public.reader_notification_preferences`

Per-reader chapter notification settings.

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `user_id` | uuid | NO |  |
| `browser_enabled` | boolean / `bool` | NO | true |
| `email_enabled` | boolean / `bool` | NO | true |
| `new_chapters_enabled` | boolean / `bool` | NO | true |
| `minimum_tier_rank` | integer / `int4` | NO | 0 |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |
| `updated_at` | timestamp with time zone / `timestamptz` | NO | now() |

Readers can read/update their own row; admins can manage all rows.

### `public.reader_notifications`

Per-reader in-app notifications, currently generated for chapter publishes/republishes relevant to the reader's access tier.

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `user_id` | uuid | NO |  |
| `story_id` | uuid | YES |  |
| `chapter_id` | uuid | YES |  |
| `notification_type` | text | NO | 'chapter'::text |
| `title` | text | NO |  |
| `body` | text | NO | ''::text |
| `url` | text | YES |  |
| `required_tier_id` | uuid | YES |  |
| `required_tier_rank` | integer / `int4` | NO | 0 |
| `read_at` | timestamp with time zone / `timestamptz` | YES |  |
| `dismissed_at` | timestamp with time zone / `timestamptz` | YES |  |
| `metadata` | jsonb | NO | '{}'::jsonb |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |

Readers can read/update their own notifications; admins can manage all rows. `(user_id, chapter_id, notification_type)` is unique to avoid duplicate chapter alerts.

### `public.reader_email_queue`

Server-side email queue rows created when chapter notifications fan out. This records intended email sends; a separate sender/Edge Function can process queued rows using a configured email provider.

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `notification_id` | uuid | YES |  |
| `user_id` | uuid | NO |  |
| `to_email` | text | NO |  |
| `subject` | text | NO |  |
| `body` | text | NO |  |
| `status` | text | NO | 'queued'::text |
| `error` | text | YES |  |
| `sent_at` | timestamp with time zone / `timestamptz` | YES |  |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |

Only admins can read/manage email queue rows.

### `public.provider_connections`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `user_id` | uuid | NO |  |
| `provider` | text | NO |  |
| `provider_user_id` | text | NO |  |
| `provider_account_label` | text | YES |  |
| `status` | text | NO | 'active'::text |
| `metadata` | jsonb | NO | '{}'::jsonb |
| `last_synced_at` | timestamp with time zone / `timestamptz` | YES |  |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |
| `updated_at` | timestamp with time zone / `timestamptz` | NO | now() |

### `public.provider_oauth_tokens`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `user_id` | uuid | NO |  |
| `provider` | text | NO |  |
| `provider_connection_id` | uuid | YES |  |
| `provider_user_id` | text | YES |  |
| `access_token` | text | NO |  |
| `refresh_token` | text | YES |  |
| `token_type` | text | NO | 'Bearer'::text |
| `scopes` | ARRAY / `_text` | NO | '{}'::text[] |
| `expires_at` | timestamp with time zone / `timestamptz` | YES |  |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |
| `updated_at` | timestamp with time zone / `timestamptz` | NO | now() |

### `public.provider_tier_mappings`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `provider` | text | NO |  |
| `provider_tier_id` | text | NO |  |
| `provider_tier_label` | text | YES |  |
| `tier_id` | uuid | NO |  |
| `is_active` | boolean / `bool` | NO | true |
| `metadata` | jsonb | NO | '{}'::jsonb |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |

### `public.reader_access_tiers`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `slug` | text | NO |  |
| `name` | text | NO |  |
| `description` | text | YES |  |
| `tier_rank` | integer / `int4` | NO | 0 |
| `is_active` | boolean / `bool` | NO | true |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |
| `updated_at` | timestamp with time zone / `timestamptz` | NO | now() |

### `public.site_settings`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `setting_key` | text | NO |  |
| `setting_value` | jsonb | NO | '{}'::jsonb |

### `public.stories`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `slug` | text | NO |  |
| `title` | text | NO |  |
| `author` | text | YES |  |
| `author_name` | text | YES |  |
| `short_description` | text | YES |  |
| `synopsis` | text | YES |  |
| `description` | text | YES |  |
| `genre` | text | YES |  |
| `category` | text | YES |  |
| `status` | text | YES | 'ongoing'::text |
| `cover_image_url` | text | YES |  |
| `cover_url` | text | YES |  |
| `background_image_url` | text | YES |  |
| `theme_color` | text | YES |  |
| `secondary_color` | text | YES |  |
| `accent_color` | text | YES |  |
| `tags` | jsonb | NO | '[]'::jsonb |
| `sort_order` | integer / `int4` | NO | 0 |
| `is_published` | boolean / `bool` | NO | false |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |
| `updated_at` | timestamp with time zone / `timestamptz` | NO | now() |
| `loader_theme` | text | NO | 'lightsaber'::text |
| `world_title` | text | YES |  |

### `public.story_access_policies`

Rolling subscription access rules for Admin CMS. One policy per story. Admin can write; published-story policies can be read publicly for transparency/config-driven UI.

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `story_id` | uuid | NO |  |
| `enabled` | boolean / `bool` | NO | true |
| `rules` | jsonb | NO | '{}'::jsonb |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |
| `updated_at` | timestamp with time zone / `timestamptz` | NO | now() |

Rule JSON currently uses `{"windows":[{"tier_id":"<reader_access_tiers.id>","count":10}]}`. Admin applies higher-rank tiers first to newest published chapters by `chapter_order`; non-NSFW chapters beyond configured windows become free by setting `chapters.required_tier_id = null`. The current resident-tier policy window is cumulative by rank: Resident Nemesis count 3, Resident Tyrant count 3, Resident Licker count 6. Resident Evil has no separate slice because its rank 40 inherits all Nemesis/Tyrant/Licker gated chapters.

Policies: `story_access_policies_admin_all` permits admin write/manage access through `public.is_admin()`; `story_access_policies_public_read` permits read access for enabled policies belonging to published stories.

### `public.story_wallpapers`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `story_id` | uuid | YES |  |
| `image_url` | text | NO | ''::text |
| `label` | text | YES |  |
| `sort_order` | integer / `int4` | NO | 0 |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |

### `public.timeline_event_characters`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `event_id` | uuid | YES |  |
| `character_id` | uuid | YES |  |

### `public.timeline_events`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `story_id` | uuid | YES |  |
| `event_date` | text | YES |  |
| `title` | text | NO | ''::text |
| `description` | text | YES |  |
| `event_order` | integer / `int4` | NO | 0 |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |

### `public.user_entitlements`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `user_id` | uuid | NO |  |
| `tier_id` | uuid | NO |  |
| `source` | text | NO | 'manual'::text |
| `provider` | text | YES |  |
| `provider_connection_id` | uuid | YES |  |
| `status` | text | NO | 'active'::text |
| `valid_from` | timestamp with time zone / `timestamptz` | NO | now() |
| `valid_until` | timestamp with time zone / `timestamptz` | YES |  |
| `metadata` | jsonb | NO | '{}'::jsonb |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |
| `updated_at` | timestamp with time zone / `timestamptz` | NO | now() |

### `public.writer_node_links`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `source_node_id` | uuid | YES |  |
| `target_node_id` | uuid | YES |  |
| `link_type` | text | YES |  |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |

### `public.writer_nodes`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `story_id` | uuid | YES |  |
| `parent_id` | uuid | YES |  |
| `title` | text | NO | ''::text |
| `content` | text | YES |  |
| `type` | USER-DEFINED / `node_type_enum` | NO | 'document'::node_type_enum |
| `status` | text | NO | 'outline'::text |
| `sort_order` | integer / `int4` | NO | 0 |
| `word_count` | integer / `int4` | NO | 0 |
| `image_url` | text | YES |  |
| `metadata` | jsonb | NO | '{}'::jsonb |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |
| `updated_at` | timestamp with time zone / `timestamptz` | NO | now() |

### `storage.buckets`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | text | NO |  |
| `name` | text | NO |  |
| `owner` | uuid | YES |  |
| `created_at` | timestamp with time zone / `timestamptz` | YES | now() |
| `updated_at` | timestamp with time zone / `timestamptz` | YES | now() |
| `public` | boolean / `bool` | YES | false |
| `avif_autodetection` | boolean / `bool` | YES | false |
| `file_size_limit` | bigint / `int8` | YES |  |
| `allowed_mime_types` | ARRAY / `_text` | YES |  |
| `owner_id` | text | YES |  |
| `type` | USER-DEFINED / `buckettype` | NO | 'STANDARD'::storage.buckettype |

### `storage.buckets_analytics`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `name` | text | NO |  |
| `type` | USER-DEFINED / `buckettype` | NO | 'ANALYTICS'::storage.buckettype |
| `format` | text | NO | 'ICEBERG'::text |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |
| `updated_at` | timestamp with time zone / `timestamptz` | NO | now() |
| `id` | uuid | NO | gen_random_uuid() |
| `deleted_at` | timestamp with time zone / `timestamptz` | YES |  |

### `storage.buckets_vectors`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | text | NO |  |
| `type` | USER-DEFINED / `buckettype` | NO | 'VECTOR'::storage.buckettype |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |
| `updated_at` | timestamp with time zone / `timestamptz` | NO | now() |

### `storage.migrations`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | integer / `int4` | NO |  |
| `name` | character varying / `varchar` | NO |  |
| `hash` | character varying / `varchar` | NO |  |
| `executed_at` | timestamp without time zone / `timestamp` | YES | CURRENT_TIMESTAMP |

### `storage.objects`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `bucket_id` | text | YES |  |
| `name` | text | YES |  |
| `owner` | uuid | YES |  |
| `created_at` | timestamp with time zone / `timestamptz` | YES | now() |
| `updated_at` | timestamp with time zone / `timestamptz` | YES | now() |
| `last_accessed_at` | timestamp with time zone / `timestamptz` | YES | now() |
| `metadata` | jsonb | YES |  |
| `path_tokens` | ARRAY / `_text` | YES |  |
| `version` | text | YES |  |
| `owner_id` | text | YES |  |
| `user_metadata` | jsonb | YES |  |

### `storage.s3_multipart_uploads`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | text | NO |  |
| `in_progress_size` | bigint / `int8` | NO | 0 |
| `upload_signature` | text | NO |  |
| `bucket_id` | text | NO |  |
| `key` | text | NO |  |
| `version` | text | NO |  |
| `owner_id` | text | YES |  |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |
| `user_metadata` | jsonb | YES |  |
| `metadata` | jsonb | YES |  |

### `storage.s3_multipart_uploads_parts`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | uuid | NO | gen_random_uuid() |
| `upload_id` | text | NO |  |
| `size` | bigint / `int8` | NO | 0 |
| `part_number` | integer / `int4` | NO |  |
| `bucket_id` | text | NO |  |
| `key` | text | NO |  |
| `etag` | text | NO |  |
| `owner_id` | text | YES |  |
| `version` | text | NO |  |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |

### `storage.vector_indexes`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| `id` | text | NO | gen_random_uuid() |
| `name` | text | NO |  |
| `bucket_id` | text | NO |  |
| `data_type` | text | NO |  |
| `dimension` | integer / `int4` | NO |  |
| `distance_metric` | text | NO |  |
| `metadata_configuration` | jsonb | YES |  |
| `created_at` | timestamp with time zone / `timestamptz` | NO | now() |
| `updated_at` | timestamp with time zone / `timestamptz` | NO | now() |

## RLS policies

| Schema | Table | Policy | Command | Roles | Using | With check |
|---|---|---|---|---|---|---|
| `public` | `access_key_redemptions` | `access_key_redemptions_admin_all` | ALL | public | is_admin() | is_admin() |
| `public` | `access_key_redemptions` | `access_key_redemptions_own_read` | SELECT | public | ((user_id = auth.uid()) OR is_admin()) |  |
| `public` | `access_keys` | `access_keys_admin_all` | ALL | public | is_admin() | is_admin() |
| `public` | `author_links` | `parent_compat_author_links_admin_all` | ALL | public | is_admin() | is_admin() |
| `public` | `author_links` | `parent_compat_author_links_public_read` | SELECT | public | true |  |
| `public` | `chapters` | `chapters_admin_all` | ALL | public | is_admin() | is_admin() |
| `public` | `chapters` | `chapters_entitled_select` | SELECT | public | ((is_published = true) AND (required_tier_id IS NOT NULL) AND (auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1<br>   FROM ((user_entitlements ue<br>     JOIN reader_access_tiers held ON ((held.id = ue.tier_id)))<br>     JOIN reader_access_tiers required ON ((required.id = chapters.required_tier_id)))<br>  WHERE ((ue.user_id = auth.uid()) AND (ue.status = 'active'::text) AND ((ue.valid_from IS NULL) OR (ue.valid_from <= now())) AND ((ue.valid_until IS NULL) OR (ue.valid_until > now())) AND (held.is_active = true) AND (held.tier_rank >= required.tier_rank)))) AND (EXISTS ( SELECT 1<br>   FROM stories s<br>  WHERE ((s.id = chapters.story_id) AND (s.is_published = true))))) |  |
| `public` | `chapters` | `chapters_public_free_select` | SELECT | public | ((is_published = true) AND ((required_tier_id IS NULL) OR ((public_release_at IS NOT NULL) AND (public_release_at <= now()))) AND (EXISTS ( SELECT 1<br>   FROM stories s<br>  WHERE ((s.id = chapters.story_id) AND (s.is_published = true))))) |  |
| `public` | `character_gallery_images` | `parent_compat_gallery_admin_all` | ALL | public | is_admin() | is_admin() |
| `public` | `character_gallery_images` | `parent_compat_gallery_public_read` | SELECT | public | ((is_published = true) AND (EXISTS ( SELECT 1<br>   FROM (characters c<br>     JOIN stories s ON ((s.id = c.story_id)))<br>  WHERE ((c.id = character_gallery_images.character_id) AND (s.is_published = true))))) |  |
| `public` | `characters` | `parent_compat_characters_admin_all` | ALL | public | is_admin() | is_admin() |
| `public` | `characters` | `parent_compat_characters_public_read` | SELECT | public | (EXISTS ( SELECT 1<br>   FROM stories s<br>  WHERE ((s.id = characters.story_id) AND (s.is_published = true)))) |  |
| `public` | `comments` | `parent_compat_comments_own_delete` | DELETE | public | ((auth.uid() = user_id) OR is_admin()) |  |
| `public` | `comments` | `parent_compat_comments_own_insert` | INSERT | public |  | (auth.uid() = user_id) |
| `public` | `comments` | `parent_compat_comments_own_update` | UPDATE | public | ((auth.uid() = user_id) OR is_admin()) | ((auth.uid() = user_id) OR is_admin()) |
| `public` | `comments` | `parent_compat_comments_public_read` | SELECT | public | true |  |
| `public` | `chapter_reactions` | `chapter_reactions_public_read` | SELECT | public | true |  |
| `public` | `chapter_reactions` | `chapter_reactions_own_insert` | INSERT | public |  | (auth.uid() = user_id) |
| `public` | `chapter_reactions` | `chapter_reactions_own_update` | UPDATE | public | ((auth.uid() = user_id) OR is_admin()) | ((auth.uid() = user_id) OR is_admin()) |
| `public` | `chapter_reactions` | `chapter_reactions_own_delete` | DELETE | public | ((auth.uid() = user_id) OR is_admin()) |  |
| `public` | `entitlement_audit_log` | `entitlement_audit_admin_insert` | INSERT | public |  | is_admin() |
| `public` | `entitlement_audit_log` | `entitlement_audit_admin_read` | SELECT | public | is_admin() |  |
| `public` | `image_votes` | `parent_compat_image_votes_own_delete` | DELETE | public | ((auth.uid() = user_id) OR is_admin()) |  |
| `public` | `image_votes` | `parent_compat_image_votes_own_insert` | INSERT | public |  | (auth.uid() = user_id) |
| `public` | `image_votes` | `parent_compat_image_votes_own_update` | UPDATE | public | (auth.uid() = user_id) | (auth.uid() = user_id) |
| `public` | `image_votes` | `parent_compat_image_votes_public_read` | SELECT | public | true |  |
| `public` | `lore_categories` | `parent_compat_lore_categories_admin_all` | ALL | public | is_admin() | is_admin() |
| `public` | `lore_categories` | `parent_compat_lore_categories_public_read` | SELECT | public | (EXISTS ( SELECT 1<br>   FROM stories s<br>  WHERE ((s.id = lore_categories.story_id) AND (s.is_published = true)))) |  |
| `public` | `lore_entries` | `parent_compat_lore_entries_admin_all` | ALL | public | is_admin() | is_admin() |
| `public` | `lore_entries` | `parent_compat_lore_entries_public_read` | SELECT | public | (EXISTS ( SELECT 1<br>   FROM stories s<br>  WHERE ((s.id = lore_entries.story_id) AND (s.is_published = true)))) |  |
| `public` | `map_request_items` | `parent_compat_map_request_items_admin_all` | ALL | public | is_admin() | is_admin() |
| `public` | `map_request_items` | `parent_compat_map_request_items_own_insert` | INSERT | public |  | (EXISTS ( SELECT 1<br>   FROM map_requests r<br>  WHERE ((r.id = map_request_items.request_id) AND (r.user_id = auth.uid())))) |
| `public` | `map_request_items` | `parent_compat_map_request_items_own_read` | SELECT | public | (EXISTS ( SELECT 1<br>   FROM map_requests r<br>  WHERE ((r.id = map_request_items.request_id) AND ((r.user_id = auth.uid()) OR is_admin())))) |  |
| `public` | `map_requests` | `parent_compat_map_requests_admin_update` | UPDATE | public | ((auth.uid() = user_id) OR is_admin()) | ((auth.uid() = user_id) OR is_admin()) |
| `public` | `map_requests` | `parent_compat_map_requests_own_insert` | INSERT | public |  | (auth.uid() = user_id) |
| `public` | `map_requests` | `parent_compat_map_requests_own_read` | SELECT | public | ((auth.uid() = user_id) OR is_admin()) |  |
| `public` | `maps` | `parent_compat_maps_admin_all` | ALL | public | is_admin() | is_admin() |
| `public` | `maps` | `parent_compat_maps_public_read` | SELECT | public | ((is_published = true) AND (EXISTS ( SELECT 1<br>   FROM stories s<br>  WHERE ((s.id = maps.story_id) AND (s.is_published = true))))) |  |
| `public` | `profiles` | `profiles_own_read` | SELECT | public | ((id = auth.uid()) OR is_admin()) |  |
| `public` | `profiles` | `profiles_own_update` | UPDATE | public | ((id = auth.uid()) OR is_admin()) | ((id = auth.uid()) OR is_admin()) |
| `public` | `provider_connections` | `provider_connections_admin_all` | ALL | public | is_admin() | is_admin() |
| `public` | `provider_connections` | `provider_connections_own_read` | SELECT | public | ((user_id = auth.uid()) OR is_admin()) |  |
| `public` | `provider_tier_mappings` | `provider_tier_mappings_admin_all` | ALL | public | is_admin() | is_admin() |
| `public` | `reader_access_tiers` | `reader_access_tiers_admin_all` | ALL | public | is_admin() | is_admin() |
| `public` | `reader_access_tiers` | `reader_access_tiers_public_read` | SELECT | public | (is_active = true) |  |
| `public` | `site_settings` | `parent_compat_site_settings_admin_all` | ALL | public | is_admin() | is_admin() |
| `public` | `site_settings` | `parent_compat_site_settings_public_read` | SELECT | public | true |  |
| `public` | `stories` | `stories_admin_all` | ALL | public | is_admin() | is_admin() |
| `public` | `stories` | `stories_public_published_select` | SELECT | public | ((is_published = true) OR is_admin()) |  |
| `public` | `story_wallpapers` | `parent_compat_wallpapers_admin_all` | ALL | public | is_admin() | is_admin() |
| `public` | `story_wallpapers` | `parent_compat_wallpapers_public_read` | SELECT | public | (EXISTS ( SELECT 1<br>   FROM stories s<br>  WHERE ((s.id = story_wallpapers.story_id) AND (s.is_published = true)))) |  |
| `public` | `timeline_event_characters` | `parent_compat_timeline_chars_admin_all` | ALL | public | is_admin() | is_admin() |
| `public` | `timeline_event_characters` | `parent_compat_timeline_chars_public_read` | SELECT | public | true |  |
| `public` | `timeline_events` | `parent_compat_timeline_admin_all` | ALL | public | is_admin() | is_admin() |
| `public` | `timeline_events` | `parent_compat_timeline_public_read` | SELECT | public | (EXISTS ( SELECT 1<br>   FROM stories s<br>  WHERE ((s.id = timeline_events.story_id) AND (s.is_published = true)))) |  |
| `public` | `user_entitlements` | `user_entitlements_admin_all` | ALL | public | is_admin() | is_admin() |
| `public` | `user_entitlements` | `user_entitlements_own_read` | SELECT | public | ((user_id = auth.uid()) OR is_admin()) |  |
| `public` | `writer_node_links` | `parent_compat_writer_links_admin_all` | ALL | public | is_admin() | is_admin() |
| `public` | `writer_nodes` | `parent_compat_writer_nodes_admin_all` | ALL | public | is_admin() | is_admin() |
| `storage` | `objects` | `storage_admin_delete_author_assets` | DELETE | public | ((bucket_id = ANY (ARRAY['covers'::text, 'backgrounds'::text, 'chapter-images'::text, 'characters'::text, 'lore'::text, 'maps'::text, 'author'::text])) AND is_admin()) |  |
| `storage` | `objects` | `storage_admin_insert_author_assets` | INSERT | public |  | ((bucket_id = ANY (ARRAY['covers'::text, 'backgrounds'::text, 'chapter-images'::text, 'characters'::text, 'lore'::text, 'maps'::text, 'author'::text])) AND is_admin()) |
| `storage` | `objects` | `storage_admin_update_author_assets` | UPDATE | public | ((bucket_id = ANY (ARRAY['covers'::text, 'backgrounds'::text, 'chapter-images'::text, 'characters'::text, 'lore'::text, 'maps'::text, 'author'::text])) AND is_admin()) | ((bucket_id = ANY (ARRAY['covers'::text, 'backgrounds'::text, 'chapter-images'::text, 'characters'::text, 'lore'::text, 'maps'::text, 'author'::text])) AND is_admin()) |
| `storage` | `objects` | `storage_public_read_author_assets` | SELECT | public | (bucket_id = ANY (ARRAY['covers'::text, 'backgrounds'::text, 'chapter-images'::text, 'characters'::text, 'lore'::text, 'maps'::text, 'author'::text])) |  |
| `storage` | `objects` | `storage_reader_delete_own` | DELETE | public | ((bucket_id = 'Reader'::text) AND (auth.uid() IS NOT NULL) AND (split_part(name, '/'::text, 1) = (auth.uid())::text)) |  |
| `storage` | `objects` | `storage_reader_insert_own` | INSERT | public |  | ((bucket_id = 'Reader'::text) AND (auth.uid() IS NOT NULL) AND (split_part(name, '/'::text, 1) = (auth.uid())::text)) |
| `storage` | `objects` | `storage_reader_public_read` | SELECT | public | (bucket_id = 'Reader'::text) |  |
| `storage` | `objects` | `storage_reader_update_own` | UPDATE | public | ((bucket_id = 'Reader'::text) AND (auth.uid() IS NOT NULL) AND (split_part(name, '/'::text, 1) = (auth.uid())::text)) | ((bucket_id = 'Reader'::text) AND (auth.uid() IS NOT NULL) AND (split_part(name, '/'::text, 1) = (auth.uid())::text)) |

## Public functions / RPCs

### `public.chapter_is_public(chapter_row chapters)`

Returns: `boolean`

<details><summary>Definition</summary>

```sql
CREATE OR REPLACE FUNCTION public.chapter_is_public(chapter_row chapters)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
    SELECT chapter_row.is_published = TRUE
       AND (
            chapter_row.required_tier_id IS NULL
            OR (chapter_row.public_release_at IS NOT NULL AND chapter_row.public_release_at <= NOW())
       );
$function$

```

</details>

### `public.get_chapter_catalog(target_story_id uuid)`

Returns: `TABLE(id uuid, story_id uuid, title text, chapter_order integer, word_count integer, preview_text text, required_tier_id uuid, required_tier_name text, required_tier_slug text, required_tier_rank integer, public_release_at timestamp with time zone, access_state text, can_read boolean, created_at timestamp with time zone, updated_at timestamp with time zone, is_nsfw boolean, external_url text)`

CMS rebuild note: this RPC now includes `is_nsfw` and `external_url` so the reader can show external-only chapter prompts from catalog data.

<details><summary>Definition</summary>

```sql
CREATE OR REPLACE FUNCTION public.get_chapter_catalog(target_story_id uuid)
 RETURNS TABLE(id uuid, story_id uuid, title text, chapter_order integer, word_count integer, preview_text text, required_tier_id uuid, required_tier_name text, required_tier_slug text, required_tier_rank integer, public_release_at timestamp with time zone, access_state text, can_read boolean, created_at timestamp with time zone, updated_at timestamp with time zone, is_nsfw boolean, external_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT
        c.id,
        c.story_id,
        c.title,
        c.chapter_order,
        c.word_count,
        c.preview_text,
        c.required_tier_id,
        t.name AS required_tier_name,
        t.slug AS required_tier_slug,
        t.tier_rank AS required_tier_rank,
        c.public_release_at,
        CASE
            WHEN public.chapter_is_public(c) THEN 'free'
            WHEN auth.uid() IS NULL THEN 'locked_tier'
            WHEN public.has_active_entitlement(auth.uid(), c.required_tier_id) THEN 'unlocked'
            WHEN c.public_release_at IS NOT NULL AND c.public_release_at > NOW() THEN 'early_access'
            ELSE 'locked_tier'
        END AS access_state,
        (public.chapter_is_public(c) OR public.is_admin() OR public.has_active_entitlement(auth.uid(), c.required_tier_id)) AS can_read,
        c.created_at,
        c.updated_at,
        c.is_nsfw,
        c.external_url
    FROM public.chapters c
    LEFT JOIN public.reader_access_tiers t ON t.id = c.required_tier_id
    JOIN public.stories s ON s.id = c.story_id
    WHERE c.story_id = target_story_id
      AND c.is_published = TRUE
      AND s.is_published = TRUE
    ORDER BY c.chapter_order;
$function$

```

</details>

### `public.get_my_entitlements()`

Returns: `TABLE(id uuid, tier_id uuid, tier_name text, tier_slug text, tier_rank integer, source text, provider text, status text, valid_from timestamp with time zone, valid_until timestamp with time zone, is_active boolean, created_at timestamp with time zone)`

<details><summary>Definition</summary>

```sql
CREATE OR REPLACE FUNCTION public.get_my_entitlements()
 RETURNS TABLE(id uuid, tier_id uuid, tier_name text, tier_slug text, tier_rank integer, source text, provider text, status text, valid_from timestamp with time zone, valid_until timestamp with time zone, is_active boolean, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT
        ue.id,
        ue.tier_id,
        t.name,
        t.slug,
        t.tier_rank,
        ue.source,
        ue.provider,
        ue.status,
        ue.valid_from,
        ue.valid_until,
        (ue.status = 'active' AND ue.valid_from <= NOW() AND (ue.valid_until IS NULL OR ue.valid_until > NOW())) AS is_active,
        ue.created_at
    FROM public.user_entitlements ue
    JOIN public.reader_access_tiers t ON t.id = ue.tier_id
    WHERE ue.user_id = auth.uid()
    ORDER BY is_active DESC, t.tier_rank DESC, ue.created_at DESC;
$function$

```

</details>

### `public.get_reader_chapter(target_chapter_id uuid)`

Returns: `TABLE(id uuid, story_id uuid, title text, content text, chapter_order integer, word_count integer, preview_text text, required_tier_id uuid, required_tier_name text, access_state text, can_read boolean, created_at timestamp with time zone, updated_at timestamp with time zone, is_nsfw boolean, external_url text)`

CMS rebuild note: this RPC returns `content = NULL` for `is_nsfw` chapters even when `can_read = true`; clients must use `external_url`.

<details><summary>Definition</summary>

```sql
CREATE OR REPLACE FUNCTION public.get_reader_chapter(target_chapter_id uuid)
 RETURNS TABLE(id uuid, story_id uuid, title text, content text, chapter_order integer, word_count integer, preview_text text, required_tier_id uuid, required_tier_name text, access_state text, can_read boolean, created_at timestamp with time zone, updated_at timestamp with time zone, is_nsfw boolean, external_url text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.story_id,
        c.title,
        CASE
            WHEN c.is_nsfw THEN NULL
            WHEN (public.chapter_is_public(c) OR public.is_admin() OR public.has_active_entitlement(auth.uid(), c.required_tier_id)) THEN c.content
            ELSE NULL
        END AS content,
        c.chapter_order,
        c.word_count,
        c.preview_text,
        c.required_tier_id,
        t.name AS required_tier_name,
        CASE
            WHEN public.chapter_is_public(c) THEN 'free'
            WHEN auth.uid() IS NULL THEN 'locked_tier'
            WHEN public.has_active_entitlement(auth.uid(), c.required_tier_id) THEN 'unlocked'
            WHEN c.public_release_at IS NOT NULL AND c.public_release_at > NOW() THEN 'early_access'
            ELSE 'locked_tier'
        END AS access_state,
        (public.chapter_is_public(c) OR public.is_admin() OR public.has_active_entitlement(auth.uid(), c.required_tier_id)) AS can_read,
        c.created_at,
        c.updated_at,
        c.is_nsfw,
        c.external_url
    FROM public.chapters c
    LEFT JOIN public.reader_access_tiers t ON t.id = c.required_tier_id
    JOIN public.stories s ON s.id = c.story_id
    WHERE c.id = target_chapter_id
      AND c.is_published = TRUE
      AND s.is_published = TRUE;
END;
$function$

```

</details>

### `public.handle_new_user_profile()`

Returns: `trigger`

<details><summary>Definition</summary>

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'user_name', NEW.raw_user_meta_data->>'preferred_username'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$

```

</details>

### `public.enqueue_chapter_publish_notifications()`

Returns: `trigger`

Creates per-reader `reader_notifications` rows and queued `reader_email_queue` rows when a chapter is inserted/published or its title/tier changes while published. A reader is eligible when the chapter is public, their profile role is admin, or `has_active_entitlement(reader, required_tier_id)` is true. Email rows are queued only when the reader's notification preferences allow email and their auth account has an email address.

### `public.has_active_entitlement(target_user_id uuid, target_tier_id uuid)`

Returns: `boolean`

<details><summary>Definition</summary>

```sql
CREATE OR REPLACE FUNCTION public.has_active_entitlement(target_user_id uuid, target_tier_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT target_tier_id IS NULL OR EXISTS (
        SELECT 1
        FROM public.user_entitlements ue
        JOIN public.reader_access_tiers held ON held.id = ue.tier_id
        JOIN public.reader_access_tiers required ON required.id = target_tier_id
        WHERE ue.user_id = target_user_id
          AND ue.status = 'active'
          AND (ue.valid_from IS NULL OR ue.valid_from <= NOW())
          AND (ue.valid_until IS NULL OR ue.valid_until > NOW())
          AND held.is_active = TRUE
          AND held.tier_rank >= required.tier_rank
    );
$function$

```

</details>

### `public.is_admin()`

Returns: `boolean`

<details><summary>Definition</summary>

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$function$

```

</details>

### `public.redeem_access_key(submitted_code text)`

Returns: `jsonb`

<details><summary>Definition</summary>

```sql
CREATE OR REPLACE FUNCTION public.redeem_access_key(submitted_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    normalized TEXT;
    hashed TEXT;
    key_row public.access_keys%ROWTYPE;
    new_entitlement_id UUID;
    expiry TIMESTAMPTZ;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Sign in before redeeming an access key.';
    END IF;

    normalized := upper(regexp_replace(trim(submitted_code), '\s+', '', 'g'));
    hashed := encode(digest(normalized, 'sha256'), 'hex');

    SELECT * INTO key_row
    FROM public.access_keys
    WHERE key_hash = hashed
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Access key not found.';
    END IF;
    IF key_row.status <> 'active' THEN
        RAISE EXCEPTION 'Access key is not active.';
    END IF;
    IF key_row.valid_from IS NOT NULL AND key_row.valid_from > NOW() THEN
        RAISE EXCEPTION 'Access key is not active yet.';
    END IF;
    IF key_row.valid_until IS NOT NULL AND key_row.valid_until <= NOW() THEN
        RAISE EXCEPTION 'Access key has expired.';
    END IF;
    IF key_row.uses_count >= key_row.max_uses THEN
        RAISE EXCEPTION 'Access key has reached its redemption limit.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.access_key_redemptions WHERE key_id = key_row.id AND user_id = auth.uid()) THEN
        RAISE EXCEPTION 'This access key has already been redeemed by your account.';
    END IF;

    expiry := CASE
        WHEN key_row.entitlement_duration_days IS NULL THEN NULL
        ELSE NOW() + make_interval(days => key_row.entitlement_duration_days)
    END;

    INSERT INTO public.user_entitlements(user_id, tier_id, source, status, valid_from, valid_until, metadata)
    VALUES (auth.uid(), key_row.tier_id, 'access_key', 'active', NOW(), expiry, jsonb_build_object('access_key_id', key_row.id, 'campaign', key_row.campaign))
    RETURNING id INTO new_entitlement_id;

    INSERT INTO public.access_key_redemptions(key_id, user_id, entitlement_id)
    VALUES (key_row.id, auth.uid(), new_entitlement_id);

    UPDATE public.access_keys
    SET uses_count = uses_count + 1,
        updated_at = NOW()
    WHERE id = key_row.id;

    INSERT INTO public.entitlement_audit_log(user_id, action, source, entitlement_id, access_key_id, details)
    VALUES (auth.uid(), 'redeem_access_key', 'access_key', new_entitlement_id, key_row.id, jsonb_build_object('key_prefix', key_row.key_prefix));

    RETURN jsonb_build_object('ok', TRUE, 'entitlement_id', new_entitlement_id, 'valid_until', expiry);
END;
$function$

```

</details>

### `public.rls_auto_enable()`

Returns: `event_trigger`

<details><summary>Definition</summary>

```sql
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$

```

</details>
