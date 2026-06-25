# Subscription-Only Site Starter Package

This package extracts the current Aether Pages subscription/member-reader surface so another project can become an independent subscription-only fiction site backed by a new Supabase database.

Generated from the Abstracto Tales repository on 2026-06-25.

## What this package contains

```txt
site/
  subscription.html                  # active public member reader shell
  subscription.css                   # active member reader stylesheet
  admin.html                         # full current admin CMS; use as reference or temporary admin
  js/subscription/aether-app.js      # active Aether Pages bridge runtime
  js/subscription/aether-data.js     # fallback/demo data only, not security
  js/subscription/site-config.template.js

database/sql/
  2026-06-23_reader_subscription_access.sql
  2026-06-24_provider_oauth_tokens.sql
  hotfixes/2026-06-24_fix_redeem_access_key_pgcrypto_search_path.sql
  999_check_subscription_install.sql

supabase/
  config.toml
  functions/                         # Patreon/connect/sync/webhook Edge Functions

tools/
  bundle_subscription.js             # copied original bundler for audit bundles
  check_independence.ps1             # scans for old hardcoded project/site references

context/
  ORIGINAL_SUBSCRIPTION_HANDOVER.md
  ORIGINAL_DATABASE_CONTEXT.md
  ORIGINAL_SUBSCRIPTION_BUNDLE.md

README.md
TODO.md
DATABASE_SCHEMA_AND_SETUP.md
INDEPENDENCE_REQUIREMENTS.md
NEW_PROJECT_AI_PROMPT.md
ENV.example
PACKAGE_MANIFEST.md
```

## Important warning

This is an extraction package, not a finished independent repo. The current app still has hardcoded Abstracto/Supabase references inside `aether-app.js` and `admin.html`. The next AI should centralize those values into `site-config.template.js` or an equivalent config file before production.

Do **not** copy any real `.env` from the old project. Use `ENV.example` and set fresh secrets for the new Supabase project.

## Fast setup overview

1. Create a new empty repo/project.
2. Copy `site/*` into the web root.
3. Create a new Supabase project.
4. Run the SQL files in `database/sql/` in order.
5. Deploy the Edge Functions from `supabase/functions/` if Patreon is needed.
6. Set Edge Function secrets from `ENV.example`.
7. Enable Supabase Auth providers: email/password and Google if desired.
8. Update redirect allow-list URLs for the new domain.
9. Ask the next AI to complete `INDEPENDENCE_REQUIREMENTS.md`.
10. Run `tools/check_independence.ps1` and remove old project references.
11. Seed stories, chapters, tiers, and optional Patreon mappings.
12. Verify free chapter, locked chapter, access key, Google login, and Patreon connect flows.

## Recommended first command in the new project

Open `NEW_PROJECT_AI_PROMPT.md` and give it to the next AI together with this entire package.

## No build step

The runtime is plain HTML/CSS/JS. Supabase JS is loaded by CDN. No React, Vue, bundler, npm build, or framework is required.
