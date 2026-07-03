# Database

## Supabase status

The current Supabase project has been initialized for this reader. The following were applied:

1. Minimal base content bootstrap:
   - `profiles`
   - `stories`
   - `chapters`
   - `is_admin()`
   - new-user profile trigger
   - basic RLS/grants
2. Subscription migration:
   - `database/sql/2026-06-23_reader_subscription_access.sql`
3. Provider OAuth token migration:
   - `database/sql/2026-06-24_provider_oauth_tokens.sql`
4. Access-key pgcrypto hotfix:
   - `database/sql/hotfixes/2026-06-24_fix_redeem_access_key_pgcrypto_search_path.sql`
5. Sample content seed:
   - one tier
   - one published story
   - one free chapter
   - one locked/member chapter
   - one hashed setup access key

Do not document active plaintext access keys in committed docs.

## Required tables

Core public/content tables:

- `profiles`
- `stories`
- `chapters`

Subscription/provider tables:

- `reader_access_tiers`
- `user_entitlements`
- `provider_connections`
- `provider_tier_mappings`
- `provider_oauth_tokens`
- `access_keys`
- `access_key_redemptions`
- `entitlement_audit_log`

Note: the historical check file references `entitlement_audit_logs` plural, but the migration creates `entitlement_audit_log` singular. Treat singular as the real table unless a future migration intentionally changes it.

## Required RPCs

### `get_chapter_catalog(target_story_id UUID)`

Returns safe chapter metadata:

- id
- story id
- title
- order
- word count
- preview text
- required tier labels
- public release date
- access state
- can_read

It must never return full locked chapter content.

### `get_reader_chapter(target_chapter_id UUID)`

Returns full chapter content only when:

- chapter is public/free, or
- user is admin, or
- user has active entitlement meeting required tier

For unauthorized locked chapters it returns `content = NULL` and `can_read = false`.

### `get_my_entitlements()`

Returns active/current entitlement information for the signed-in user.

### `redeem_access_key(submitted_code TEXT)`

Redeems a plaintext submitted code by hashing it and matching `access_keys.key_hash`. Plaintext codes are never stored.

## Important security model

- Browser can query story rows and safe chapter catalog.
- Browser must not select locked `chapters.content` directly.
- Full reader body must go through `get_reader_chapter`.
- RLS and SECURITY DEFINER functions are the enforcement boundary.
- Provider OAuth tokens are service-role only.

## Running SQL manually

If needed, direct DB execution can use project ref + DB password from `.env`. Do not print secrets.

The included Supabase CLI `db query --file` may fail on multi-statement files because it uses prepared statements. Use a real Postgres client or a Python driver such as `psycopg` for multi-statement migrations.

## Verification queries

Check required objects:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles','stories','chapters','reader_access_tiers','user_entitlements',
    'provider_connections','provider_tier_mappings','provider_oauth_tokens',
    'access_keys','access_key_redemptions'
  )
order by table_name;

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('get_chapter_catalog','get_reader_chapter','get_my_entitlements','redeem_access_key')
order by routine_name;
```

Check unauthorized locked content behavior:

```sql
select title, content is null as content_is_null, can_read, access_state
from public.get_reader_chapter('LOCKED_CHAPTER_UUID');
```

Expected for unauthenticated/no entitlement:

```txt
content_is_null = true
can_read = false
```
