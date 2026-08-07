# Boosty access through Discord roles

The website does not authenticate against Boosty directly. Boosty's own Discord integration assigns one of the paid subscriber roles, then EvilArchives uses Discord OAuth to verify the signed-in reader's own server membership and roles.

## Current identifiers

| Setting | Value |
|---|---|
| Boosty page | `https://boosty.to/hornyshitler` |
| Discord application/client ID | `1535059712247074836` |
| Discord guild/server ID | `1530723815414300702` |
| OAuth callback | `https://cqgrulawpwkrdvxagzez.supabase.co/functions/v1/discord-oauth-callback` |
| Public reader return | `https://cornyshitler.pages.dev/` |

Role mappings:

| Discord role | Role ID | Internal tier |
|---|---|---|
| Resident Licker | `1535052798805147739` | `resident-licker` |
| Resident Tyrant | `1535053372955304057` | `resident-tyrant` |
| Resident Nemesis | `1535053381104836708` | `resident-nemesis` |
| Resident Evil | `1535053896597119077` | `resident-evil` |

## Discord Developer Portal

In **OAuth2 > General**:

1. Keep **Public Client** disabled. This is a confidential server-side OAuth application.
2. Save this exact redirect URI (including scheme and path):
   `https://cqgrulawpwkrdvxagzez.supabase.co/functions/v1/discord-oauth-callback`
3. Copy/reset the client secret and place it directly in Supabase Edge Function secrets. Never paste it into chat, Git, `site-config.js`, or browser code.
4. The site's Edge Function constructs the authorization URL, so the OAuth2 URL Generator is not used for production. If checking the scopes there, select only:
   - `identify`
   - `guilds.members.read`
5. Do not select `guilds`, `bot`, `applications.commands`, administrator, message-reading, or webhook permissions.
6. A Discord bot is not required for this application. Boosty's bot is the component that assigns/removes paid roles.

In the Discord server, ensure Boosty's bot role is above all four subscriber roles in the role hierarchy. Otherwise Boosty may be unable to assign or remove them.

## Supabase Edge Function secrets

Configure these in the Supabase Dashboard without committing their values:

```text
DISCORD_CLIENT_ID=1535059712247074836
DISCORD_CLIENT_SECRET=<copy privately from Discord OAuth2 General>
DISCORD_REDIRECT_URI=https://cqgrulawpwkrdvxagzez.supabase.co/functions/v1/discord-oauth-callback
DISCORD_STATE_SECRET=<new long random secret, separate from Patreon>
DISCORD_GUILD_ID=1530723815414300702
DISCORD_PUBLIC_RETURN_URL=https://cornyshitler.pages.dev/
BOOSTY_PAGE_URL=https://boosty.to/hornyshitler
BOOSTY_DISCORD_ENTITLEMENT_TTL_HOURS=72
```

The existing Supabase secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are also required by these functions.

## Deployment

Deploy the new start/callback functions and the updated shared sync function:

```powershell
supabase functions deploy discord-oauth-start
supabase functions deploy discord-oauth-callback --no-verify-jwt
supabase functions deploy sync-provider-entitlements
```

`supabase/config.toml` also declares `discord-oauth-callback` with `verify_jwt = false`. The start and sync functions remain JWT-protected. The four database mappings are idempotently defined in:

- `database/sql/2026-08-07_seed_boosty_discord_role_mappings.sql`
- `supabase/migrations/20260807130000_seed_boosty_discord_role_mappings.sql`

They were applied and verified in production through the restricted database role on 2026-08-07.

## Reader test

1. Use a Discord test member that has joined guild `1530723815414300702` and has one mapped role.
2. Sign into the website and open `#/vault`.
3. Choose **Boosty via Discord > Connect**, approve the two Discord scopes, and confirm the callback returns to the Vault.
4. Confirm the Vault shows the matching internal tier and that a chapter at or below that rank unlocks.
5. Remove the mapped role, press **Sync**, and confirm the Boosty/Discord entitlement expires.
6. Test a member outside the server and a member with no mapped role; both should remain connected but receive no paid reader tier.

## Revocation model

Role-based access is bounded to 72 hours by default and renewed on reader startup or manual sync. Missing roles are revoked immediately when a sync runs. Readers who never return cannot be checked by browser startup, so add a trusted scheduled service-role sync later if revocation must consistently happen sooner than the TTL.
