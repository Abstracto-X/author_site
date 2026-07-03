# Author Subscription Site Documentation

This `docs/` folder is the clean handoff for future AI/dev work on this project. It describes the current independent subscription-reader build, not the old extracted starter package.

## Start here

1. [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md) — what this site is and how it is laid out now.
2. [`AI_DEVELOPER_GUIDE.md`](AI_DEVELOPER_GUIDE.md) — rules for future AI agents working in this repo.
3. [`CONFIGURATION.md`](CONFIGURATION.md) — frontend config, auth/provider flags, and env handling.
4. [`DATABASE.md`](DATABASE.md) — Supabase schema, migrations, RPCs, and seed/content notes.
5. [`ADMIN_CONTENT_WORKFLOW.md`](ADMIN_CONTENT_WORKFLOW.md) — how authors/admins manage stories, chapters, tiers, keys, and grants.
6. [`DEPLOYMENT.md`](DEPLOYMENT.md) — static-site, Supabase SQL, Edge Function, and secret deployment notes.
7. [`TESTING.md`](TESTING.md) — smoke tests and acceptance checks.
8. [`SECURITY.md`](SECURITY.md) — non-negotiable security boundaries.
9. [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md) — common failures and fixes.

## Current high-level status

- Public reader entrypoint is now root `index.html`.
- CSS is root `styles.css`.
- Runtime JavaScript is under `js/subscription/`.
- Admin CMS is root `admin.html`.
- Supabase is configured through `js/subscription/site-config.js` plus local `.env` for deployment tasks.
- Real backend content is loading from Supabase.
- Demo fixture content is allowed only for local/demo fallback and should not appear in production mode.
- Edge Functions are deployed, but Patreon/provider features remain disabled unless secrets/config are added.

## Do not use old docs as authoritative

The old root files such as `README.md`, `TODO.md`, `INDEPENDENCE_REQUIREMENTS.md`, `DATABASE_SCHEMA_AND_SETUP.md`, and `context/*` are historical extraction/starter references. They can be useful for archaeology, but future development should follow this `docs/` folder first.
