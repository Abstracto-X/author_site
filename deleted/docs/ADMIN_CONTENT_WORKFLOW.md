# Admin and Content Workflow

## Current admin surface

The current admin is:

```txt
admin.html
```

It is a large temporary/full CMS from the extracted project, updated to read root `js/subscription/site-config.js` and link back to `index.html`.

## Admin access

Admin access is controlled by `profiles.role = 'admin'`.

After a user signs up/signs in, promote them manually in SQL:

```sql
update public.profiles
set role = 'admin'
where id = 'AUTH_USER_UUID_HERE';
```

## Minimum admin features to preserve

Future refactors may replace `admin.html` with a smaller admin, but must preserve:

- story CRUD
- chapter CRUD
- chapter required tier
- public release date
- preview text
- access tier CRUD
- access key creation/management
- manual entitlements
- provider tier mappings

## Story publishing checklist

A story appears in the reader when:

- row exists in `stories`
- `slug` is unique and non-empty
- `title` is set
- `is_published = true`
- it has at least one published chapter returned by `get_chapter_catalog`

## Chapter publishing checklist

A chapter appears in catalog when:

- row exists in `chapters`
- `story_id` points to published story
- `title` is set
- `chapter_order` is set
- `is_published = true`

Free/public chapter:

```txt
required_tier_id = null
```

Locked/member chapter:

```txt
required_tier_id = reader_access_tiers.id
preview_text = safe teaser only
public_release_at = optional future/date unlock
```

## Access tier workflow

Create rows in `reader_access_tiers`:

- `slug`: stable identifier, e.g. `member`
- `name`: display name
- `tier_rank`: entitlement comparison rank
- `is_active`: true

Higher `tier_rank` satisfies lower/equal required tiers.

## Access key workflow

Access keys must be hashed; do not insert plaintext keys into DB.

Use the admin UI or `redeem_access_key` compatible creation logic:

- hash `upper(code)` with SHA-256
- store hash in `access_keys.key_hash`
- store only prefix in `access_keys.key_prefix`
- show plaintext once to the author/user
- never commit plaintext keys to docs or frontend code

## Manual entitlements

Manual grants are rows in `user_entitlements`:

- `user_id`
- `tier_id`
- `source = 'manual'`
- `status = 'active'`
- `valid_from`
- optional `valid_until`

Expired/revoked entitlements should stop unlocking chapters.

## Provider tier mappings

Provider mappings normalize external providers to internal tiers:

```txt
provider = patreon | kofi | paypal | discord | manual
provider_tier_id = external tier/product/role id
tier_id = reader_access_tiers.id
is_active = true
```

Provider-specific logic belongs in Edge Functions/adapters, not in browser access checks.
