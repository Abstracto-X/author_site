# Troubleshooting

## App shell loads but content is blank

Check active JS files are not empty:

```powershell
Get-Item js/subscription/aether-app.js,js/subscription/aether-data.js,js/subscription/site-config.js
```

Then run:

```powershell
node --check js/subscription/aether-app.js
```

## Browser shows demo/fixture stories

Possible causes:

- running locally and backend failed, so local demo fallback activated
- Supabase config missing/wrong
- `stories` table missing
- no published stories/chapters
- `get_chapter_catalog` failing

Production should not show fixtures when `enableFixtureFallbackInProduction = false`.

## Supabase REST says table missing

Example:

```txt
Could not find the table 'public.stories' in the schema cache
```

Fix:

- ensure base bootstrap was applied
- ensure `stories` table exists
- reload schema cache if needed
- run verification queries from `DATABASE.md`

## Migration fails: `public.profiles` does not exist

The subscription migration assumes base content/auth tables. Apply the minimal base content bootstrap first. See `DATABASE.md`.

## Migration fails with BOM/syntax near invisible character

Some SQL files may contain a UTF-8 BOM. Read/write sanitized copies with `utf-8-sig` or use an editor/client that tolerates BOM.

## `supabase db query --file` fails with multiple commands

The CLI may run SQL as one prepared statement. Use `psql` or a Postgres driver such as Python `psycopg` for multi-statement files.

## Edge Function deploy cannot link project

Check:

```env
SUPABASE_ACCESS_TOKEN=sbp_...
supabase_project_id=...
```

A service-role key is not the same as a Supabase personal access token. CLI project management needs `sbp_...` PAT.

## Cannot set `SUPABASE_*` function secrets

Supabase reserves names beginning with `SUPABASE_`. Edge Functions receive standard Supabase env vars from the runtime; set only provider-specific secrets manually.

## Patreon buttons missing

Expected if disabled. To enable:

- `providers.patreon = true`
- `features.enablePatreonConnect = true`
- Patreon secrets set
- provider tier mappings created

## Google sign-in disabled/missing

Expected if disabled. To enable:

- `auth.googleEnabled = true`
- `features.enableGoogleOAuth = true`
- configure Supabase Auth Google provider
- add redirect allow-list for `index.html?sub_auth=google&sub_route=vault`

## Locked chapter incorrectly shows content

Stop and inspect immediately:

- browser code must not select `chapters.content`
- `get_reader_chapter` must return `content = NULL` when unauthorized
- RLS policies on `chapters` should not expose locked `content` broadly

Run the locked-content verification query in `TESTING.md`.
