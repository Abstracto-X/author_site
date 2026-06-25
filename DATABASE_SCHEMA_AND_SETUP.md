# Database Schema And Setup Guide

This package includes the exact SQL migrations used by the source project. This document summarizes what the new independent site needs and how the objects fit together.

## 1. Run order

In the new Supabase SQL Editor, run:

```txt
1. database/sql/2026-06-23_reader_subscription_access.sql
2. database/sql/2026-06-24_provider_oauth_tokens.sql   -- if Patreon/provider OAuth is needed
3. database/sql/999_check_subscription_install.sql      -- verification only
```

If access-key redemption fails with `function digest(text, unknown) does not exist`, run:

```txt
database/sql/hotfixes/2026-06-24_fix_redeem_access_key_pgcrypto_search_path.sql
```

## 2. Core content tables expected by the frontend

The frontend expects these content tables. The migration may create/alter some subscription columns, but the new DB must have actual content rows.

### `profiles`

Usually mirrors `auth.users`.

Important columns:

| Column | Purpose |
| --- | --- |
| `id` | UUID matching `auth.users.id`. |
| `username` | Optional display/login lookup. |
| `display_name` | Reader/admin display name. |
| `avatar_url` | Optional profile avatar. |
| `role` | Use `admin` for admin CMS access. |

### `stories`

Important columns used by subscription UI:

| Column | Purpose |
| --- | --- |
| `id` | Story id. |
| `slug` | URL slug for `#/story/:slug`. |
| `title` | Display title. |
| `author` / `author_name` | Display author. |
| `short_description` / `synopsis` / `description` | Story copy. |
| `genre` / `category` | Story metadata. |
| `status` | Optional display status. |
| `cover_image_url` / `cover_url` | Story cover. |
| `background_image_url` | Story background fallback. |
| `is_published` | Must be true to show. |
| `created_at` / `updated_at` | Sorting/update feed. |

### `chapters`

Important columns:

| Column | Purpose |
| --- | --- |
| `id` | Chapter id. |
| `story_id` | FK to `stories.id`. |
| `title` | Chapter title. |
| `content` | Full content. Must not be directly fetched for locked chapters. |
| `chapter_order` | Catalog order. |
| `word_count` | Read time estimate. |
| `is_published` | Must be true to show. |
| `created_at` / `updated_at` | Updates feed. |
| `required_tier_id` | FK to `reader_access_tiers.id`; null means free/public when published. |
| `public_release_at` | Optional date when early access becomes public. |
| `preview_text` | Safe teaser for locked chapters. Never full content. |

## 3. Optional enrichment tables

The current UI attempts to load these but handles failures. Create them if you want the richer story hub.

### `characters`

Used for cast tiles and optional main-archive links.

Expected fields include:

- `id`
- `story_id`
- `name`
- `role_title`
- `biography`
- `profile_image_url`
- `sort_order`

### `lore_entries`

Used for glossary tiles.

Expected fields include:

- `id`
- `story_id`
- `title`
- `description`
- `image_url`
- `sort_order`

### `timeline_events`

Used for story timeline summary/CTA.

Expected fields include:

- `id`
- `story_id`
- `title`
- `description`
- `event_date`
- `event_order`

### `story_wallpapers`

Used by background artwork swatches.

Expected fields include:

- `id`
- `story_id`
- `title`
- `image_url`
- `sort_order`

## 4. Subscription access tables

### `reader_access_tiers`

Internal tier definitions. Provider tiers map to these, and chapters require these.

Important columns:

| Column | Purpose |
| --- | --- |
| `id` | Tier id. |
| `slug` | Stable key, e.g. `member`, `archivist`. |
| `name` | Display name. |
| `description` | Display copy. |
| `tier_rank` | Higher/lower access ordering depending SQL implementation. |
| `is_active` | Whether tier is active. |

### `user_entitlements`

Normalized access grants from any source.

Important columns:

| Column | Purpose |
| --- | --- |
| `id` | Entitlement id. |
| `user_id` | Reader profile/auth id. |
| `tier_id` | FK to `reader_access_tiers.id`. |
| `source` | `patreon`, `access_key`, `manual`, `discord`, `kofi`, `paypal`, etc. |
| `provider` | Optional provider name. |
| `provider_connection_id` | Optional FK to provider connection. |
| `status` | `active`, `expired`, `revoked`, `pending`. |
| `valid_from` | Start time. |
| `valid_until` | Expiry; null means no listed expiry. |
| `metadata` | Source-specific JSON. |

### `provider_connections`

Links a site account to an external provider identity.

Important columns:

- `user_id`
- `provider`
- `provider_user_id`
- `provider_account_label`
- `status`
- `metadata`

### `provider_tier_mappings`

Maps external provider tier/product/role IDs to internal tiers.

Important columns:

- `provider`
- `provider_tier_id`
- `provider_tier_label`
- `tier_id`
- `is_active`
- `metadata`

### `provider_oauth_tokens`

Server-only provider token storage.

Important: browser roles must not be able to read this table. Edge Functions use service role.

### `access_keys`

Stores hashed access keys.

Important columns:

- `key_hash`
- `key_prefix`
- `tier_id`
- `label`
- `campaign`
- `status`
- `max_uses`
- `uses_count`
- `valid_until`
- `entitlement_duration_days`
- `created_by`

Plaintext keys must be shown once and never stored.

### `access_key_redemptions`

Records key redemption events.

Important columns:

- `key_id`
- `user_id`
- `entitlement_id`
- `redeemed_at`
- `metadata`

### `entitlement_audit_logs`

Audit trail for access events.

## 5. Required RPC functions

### `get_chapter_catalog(target_story_id)`

Returns safe catalog metadata only:

- chapter id/order/title
- release/access state
- tier labels
- preview text
- `can_read`

Must never return full locked chapter content.

### `get_reader_chapter(target_chapter_id)`

Returns full chapter content only when:

- chapter is free/public,
- user is admin,
- or user has active entitlement.

Locked responses must return `content = NULL` or equivalent no-content result.

### `get_my_entitlements()`

Returns the signed-in user's entitlement summary.

### `redeem_access_key(submitted_code)`

Validates a plaintext submitted code by hashing it, checking status/expiry/uses, creating an entitlement, recording redemption, and logging audit.

## 6. RLS expectations

- `reader_access_tiers` active rows can be readable publicly.
- `user_entitlements` are readable by owner/admin.
- `provider_connections` are readable by owner/admin.
- `access_keys` are admin-only.
- `provider_tier_mappings` are admin-only or controlled per policy.
- `provider_oauth_tokens` are service-role only.
- `chapters.content` must not leak to unauthorized users.

## 7. Initial seed checklist

After SQL:

```sql
insert into public.reader_access_tiers (slug, name, description, tier_rank, is_active)
values
  ('member', 'Member', 'Standard member access', 1, true),
  ('archivist', 'Archivist', 'Higher tier access', 2, true);
```

Then create stories/chapters through admin or SQL. For a locked chapter:

```sql
update public.chapters
set required_tier_id = (select id from public.reader_access_tiers where slug = 'member'),
    preview_text = 'A safe teaser goes here.'
where id = 'CHAPTER_UUID';
```

For manual access:

```sql
insert into public.user_entitlements (user_id, tier_id, source, status, valid_from)
values (
  'USER_UUID',
  (select id from public.reader_access_tiers where slug = 'member'),
  'manual',
  'active',
  now()
);
```
