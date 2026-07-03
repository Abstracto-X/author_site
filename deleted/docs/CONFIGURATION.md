# Configuration

## Frontend config file

The app reads:

```txt
js/subscription/site-config.js
```

It must define:

```js
window.SUBSCRIPTION_SITE_CONFIG = {
  siteName: "Member Fiction Reader",
  siteTagline: "Premium serial fiction member library",
  publicBaseUrl: "./",
  supabase: {
    url: "https://PROJECT_REF.supabase.co",
    anonKey: "..."
  },
  auth: {
    googleEnabled: false,
    emailPasswordEnabled: true,
    oauthReturnRoute: "vault"
  },
  providers: {
    patreon: false,
    kofi: false,
    paypal: false,
    discord: false
  },
  links: {
    mainArchiveUrl: null,
    supportUrl: null,
    discordUrl: null
  },
  features: {
    enableMainArchiveLinks: false,
    enableStudioPreview: false,
    enableFixtureFallbackInProduction: false,
    enableLocalDemoReaderFeatures: true,
    enablePatreonConnect: false,
    enableAccessKeys: true,
    enableGoogleOAuth: false
  }
};
```

## Feature flags

### `enableMainArchiveLinks`

- `false` for a subscription-only site.
- If true, `links.mainArchiveUrl` must be set.
- Do not use old `index.html#gallery` or `index.html#timeline` assumptions.

### `enableStudioPreview`

- Keeps in-reader `#/studio` preview routes disabled by default.
- Production admin work should happen through `admin.html` until a smaller admin is built.

### `enableFixtureFallbackInProduction`

- Should remain `false`.
- If backend fails in production, show setup/maintenance state instead of demo stories.

### `enableLocalDemoReaderFeatures`

- Allows local/demo fixture fallback when running on localhost/file/demo mode.
- Useful for design work only.

### Provider toggles

- `providers.patreon` + `features.enablePatreonConnect` must both be true to show Patreon flows.
- Ko-fi/PayPal/Discord are placeholders unless provider adapters are implemented.

## Local `.env`

The local `.env` is for deployment/admin tasks only. Do not load it in browser code.

Expected variables currently used by developer tooling:

```env
supabase_project_id=...
supabase_anon_key=...
supabase_service_role_key=...
SUPABASE_ACCESS_TOKEN=...
SUPABASE_DB_PASSWORD=...
```

Optional Patreon/provider variables:

```env
PATREON_CLIENT_ID=...
PATREON_CLIENT_SECRET=...
PATREON_REDIRECT_URI=...
PATREON_STATE_SECRET=...
PATREON_CAMPAIGN_ID=...
PATREON_USER_AGENT=...
PROVIDER_WEBHOOK_SECRET=...
```

## OAuth redirects

If Google OAuth is enabled, Supabase Auth redirect allow-list should include root `index.html` shape, for example:

```txt
https://YOUR_DOMAIN/index.html?sub_auth=google&sub_route=vault
http://127.0.0.1:4174/index.html?sub_auth=google&sub_route=vault
http://localhost:4174/index.html?sub_auth=google&sub_route=vault
```

The app supports callback shapes:

- `?code=...`
- `#access_token=...`
- nested SPA hash such as `#/vault#access_token=...`
- Supabase password recovery links with `type=recovery` plus either `code=...` or access-token fragments
