# Project Overview

## Purpose

This is an independent subscription-only fiction reader site for an author/member audience. It is a static frontend backed by Supabase for:

- auth
- story/chapter catalog
- secure chapter reading
- reader access tiers
- access key redemption
- manual entitlements
- provider mappings and provider sync plumbing

It is not the original source platform and should not depend on any old archive/gallery/timeline site.

## Current root layout

```txt
index.html                         # public reader shell
styles.css                         # public reader styles
admin.html                         # temporary/full admin CMS
js/subscription/
  aether-app.js                    # main vanilla JS app/runtime
  aether-data.js                   # local/demo fixture data only
  site-config.js                   # real frontend config, not committed with secrets ideally
  site-config.template.js          # placeholder/template config

database/sql/
  2026-06-23_reader_subscription_access.sql
  2026-06-24_provider_oauth_tokens.sql
  hotfixes/2026-06-24_fix_redeem_access_key_pgcrypto_search_path.sql
  999_check_subscription_install.sql

supabase/
  config.toml
  functions/
    patreon-oauth-start/
    patreon-oauth-callback/
    sync-provider-entitlements/
    provider-webhook/
    _shared/

tools/
  check_independence.ps1           # scans active root layout for old project references

docs/                              # current AI/dev documentation
```

## Important legacy directories/files

Some historical copies may still exist, such as:

```txt
site/
subscription-only-site/
context/
```

Treat them as archival/reference material unless a task explicitly asks to clean them up. The active site is the root layout above.

## Runtime constraints

- Plain HTML/CSS/JavaScript only.
- No React/Vue/Angular.
- No bundler/build step.
- No npm runtime dependency for the browser app.
- Supabase JS is loaded by CDN in `index.html`.

## Main data flow

1. Browser loads `index.html`.
2. `index.html` loads:
   - `styles.css`
   - `js/subscription/site-config.js`
   - Supabase JS CDN
   - `js/subscription/aether-data.js`
   - `js/subscription/aether-app.js`
3. `aether-app.js` reads `window.SUBSCRIPTION_SITE_CONFIG`.
4. App uses Supabase anon key for auth/catalog/RPC calls.
5. Chapter catalog uses `get_chapter_catalog`.
6. Full chapter content uses `get_reader_chapter` only.
7. Locked chapter content must never be selected directly from `chapters.content` in browser code.
