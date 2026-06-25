# Package Manifest

## Public site files

- `site/subscription.html`
  - Active public member reader shell.
  - Loads Supabase JS CDN, `subscription.css`, `aether-data.js`, and `aether-app.js`.
  - Contains `#global-bg`, `#app`, and `<main id="main">`.

- `site/subscription.css`
  - Active visual system: app shell, topbar/sidebar/bottom nav, glass cards, story hero, background modes, settings sheets, reader mode, mobile/desktop responsive behavior.

- `site/js/subscription/aether-app.js`
  - Active runtime monolith: routing, auth, Supabase reads, access logic, renderers, sheets, toasts, localStorage, Patreon calls.
  - Must be refactored/configured for independence.

- `site/js/subscription/aether-data.js`
  - Demo/fallback data. Must not be used as production truth.
  - Production should disable silent fixture fallback.

- `site/js/subscription/site-config.template.js`
  - Proposed config file. The current runtime does not yet consume it; next AI should wire it in.

- `site/admin.html`
  - Full original admin CMS copied as reference/temporary admin.
  - Contains much more than a subscription-only admin needs.
  - Next AI can either keep it temporarily or cut it down to member-access/content management only.

## Database files

- `database/sql/2026-06-23_reader_subscription_access.sql`
  - Main subscription schema/RLS/RPC migration.

- `database/sql/2026-06-24_provider_oauth_tokens.sql`
  - Server-only OAuth token storage for providers such as Patreon.

- `database/sql/hotfixes/2026-06-24_fix_redeem_access_key_pgcrypto_search_path.sql`
  - Fix if `redeem_access_key()` cannot resolve `pgcrypto.digest`.

- `database/sql/999_check_subscription_install.sql`
  - Verification query pack for the new Supabase DB.

## Supabase functions

- `supabase/functions/patreon-oauth-start`
- `supabase/functions/patreon-oauth-callback`
- `supabase/functions/sync-provider-entitlements`
- `supabase/functions/provider-webhook`
- `supabase/functions/_shared`

## Tools

- `tools/check_independence.ps1`
  - Searches for old Abstracto/original Supabase/main-archive references.

- `tools/bundle_subscription.js`
  - Original audit bundler. May need path edits in the new repo.

## Context files

- `context/ORIGINAL_SUBSCRIPTION_HANDOVER.md`
  - Current handover of the source subscription site.

- `context/ORIGINAL_DATABASE_CONTEXT.md`
  - Full source database documentation for reference.

- `context/ORIGINAL_SUBSCRIPTION_BUNDLE.md`
  - Combined source subscription files for AI review.
