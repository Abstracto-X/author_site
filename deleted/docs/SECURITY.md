# Security

## Hard rules

- Never expose `supabase_service_role_key` in frontend code.
- Never commit `.env` or provider secrets.
- Never log OAuth access tokens or refresh tokens.
- Never store plaintext access keys in the database.
- Never put active plaintext access keys in docs/frontend code.
- Never fetch locked chapter bodies directly from `chapters.content` in browser code.
- Locked/full chapter content must come through `get_reader_chapter` only.

## Frontend key boundary

The browser may use only:

- Supabase project URL
- Supabase anon/publishable key

These live in:

```txt
js/subscription/site-config.js
```

Service role belongs only in secure server/Edge Function contexts.

## Content boundary

Safe browser queries:

- published story metadata
- `get_chapter_catalog`
- `get_reader_chapter` RPC call
- auth/profile/own entitlements under RLS

Unsafe browser behavior:

```js
supabase.from('chapters').select('content')
```

Do not add this for reader use.

## Access key handling

Correct model:

1. User submits plaintext code once.
2. DB function hashes submitted code.
3. Hash is compared to `access_keys.key_hash`.
4. Entitlement is created if valid.
5. Plaintext is not stored.

## Provider OAuth tokens

- Stored in `provider_oauth_tokens`.
- Service-role/Edge Functions only.
- Do not expose via RLS to browser roles.
- Do not log token payloads.

## RLS expectations

RLS should enforce:

- public can see only published/free-safe content
- own profile/entitlement reads for authenticated users
- admin-only management of tiers/keys/grants/provider mappings
- provider tokens blocked from browser roles

## If something is uncertain

For security-sensitive changes, prefer failing closed:

- show locked/gated state
- show setup/maintenance state
- require explicit admin/provider configuration
- do not silently unlock or expose content
