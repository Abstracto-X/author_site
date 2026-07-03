# Deployment

## Static site

This is a static site. Deploy these active root files/directories:

```txt
index.html
styles.css
admin.html
js/subscription/
supabase/                  # only needed for function/source management, not static hosting
database/                  # only needed for SQL/source management, not static hosting
```

If deploying to a static host, ensure `index.html` is the public entrypoint.

## Supabase project setup

The current project has already had base + subscription SQL applied. For a new project, apply:

1. minimal base content bootstrap (see `DATABASE.md`)
2. `database/sql/2026-06-23_reader_subscription_access.sql`
3. `database/sql/2026-06-24_provider_oauth_tokens.sql`
4. `database/sql/hotfixes/2026-06-24_fix_redeem_access_key_pgcrypto_search_path.sql`
5. seed real content/tiers

## Supabase CLI

Required local env for deploy work:

```env
supabase_project_id=...
SUPABASE_ACCESS_TOKEN=sbp_...
SUPABASE_DB_PASSWORD=...
```

Link project:

```powershell
supabase link --project-ref YOUR_PROJECT_REF
```

## Edge Functions

Included functions:

```txt
patreon-oauth-start
patreon-oauth-callback
sync-provider-entitlements
provider-webhook
```

Deploy:

```powershell
supabase functions deploy patreon-oauth-start patreon-oauth-callback sync-provider-entitlements provider-webhook --project-ref YOUR_PROJECT_REF --use-api
```

Current deployment status at handoff:

- functions deployed
- functions active
- Patreon/provider config disabled in frontend
- Patreon/provider runtime secrets not set unless added later

## Function JWT settings

`supabase/config.toml`:

```toml
[functions.patreon-oauth-callback]
verify_jwt = false

[functions.provider-webhook]
verify_jwt = false
```

Expected:

- `patreon-oauth-start`: JWT required
- `sync-provider-entitlements`: JWT required
- `patreon-oauth-callback`: JWT disabled, validates state secret internally
- `provider-webhook`: JWT disabled, validates webhook secret internally

## Edge Function secrets

Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions as reserved environment variables. The CLI may refuse manually setting names beginning with `SUPABASE_`.

For Patreon/provider support, set these when enabling providers:

```env
PATREON_CLIENT_ID=...
PATREON_CLIENT_SECRET=...
PATREON_REDIRECT_URI=...
PATREON_STATE_SECRET=...
PATREON_CAMPAIGN_ID=...
PATREON_USER_AGENT=...
PROVIDER_WEBHOOK_SECRET=...
```

Example:

```powershell
supabase secrets set --project-ref YOUR_PROJECT_REF PATREON_CLIENT_ID="..." PATREON_CLIENT_SECRET="..." PATREON_REDIRECT_URI="..." PATREON_STATE_SECRET="..."
```

Do not print these values in logs.

## Enabling Patreon later

1. Add Patreon secrets.
2. Confirm function secrets are set.
3. Create `provider_tier_mappings` for Patreon tier IDs.
4. Set config:
   ```js
   providers: { patreon: true, ... }
   features: { enablePatreonConnect: true, ... }
   ```
5. Test OAuth connect and sync.
