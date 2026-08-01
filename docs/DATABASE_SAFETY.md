# Database Safety and Local Backups

## Direct AI database access

AI agents must use the dedicated `ai_editor` PostgreSQL login for direct
production database work. The role can:

- Read, insert, and update rows in `public`.
- Use public sequences.
- Create new objects in the `public` schema.
- Bypass RLS only for the operations explicitly granted to the role.

The role cannot:

- Delete or truncate rows from existing `public` tables.
- Drop tables, schemas, views, sequences, functions, types, indexes, policies,
  or triggers.
- Administer roles or databases.
- Alter existing objects owned by `postgres`.

Tables created directly by `ai_editor` automatically receive a statement
trigger that rejects `DELETE` and `TRUNCATE` when the same login is used.

Schema alterations or destructive work must be written as a timestamped SQL
migration under `supabase/migrations/`, reviewed by the site owner, and run
manually with an administrative credential.

Tables created directly by `ai_editor` are owned by that role. For a manually
approved destructive operation on one of those tables, the administrative
session can use `SET ROLE ai_editor`; the event guard keys off `session_user`,
so an owner session remains able to perform the reviewed command. `ai_editor`
has no reciprocal membership or access to `postgres`.

The restricted connection is stored locally as `SUPABASE_AI_DB_URL`. Production
database passwords, Supabase access tokens, and service-role keys must not be
kept in the repository `.env`.

## Backup job

Windows Task Scheduler runs `scripts/database/backup-supabase.ps1` daily.

Each successful run creates the same timestamped backup set in:

- `A:\Author Site Backups`
- `G:\My Drive\Author Site Backups`

Each set contains:

- `public.backup`: `public` schema and data.
- `auth-data.backup`: Supabase Auth data.
- `storage-metadata.backup`: Storage bucket/object metadata.
- `manifest.json`: timestamp, hashes, sizes, and client version.
- `backup.log`: run log.

The PostgreSQL custom-format archives are validated with `pg_restore --list`
before being copied. Backups older than 30 days are removed only from the two
configured backup roots.

The encrypted database credential is stored with Windows DPAPI under the
current Windows user's local application-data directory. It is not present in
the repository or either backup directory.

## Important boundary

Database backups contain Storage metadata, not the actual files stored in
Supabase buckets. Covers, chapter images, character images, and other Storage
objects require a separate object-backup job if off-platform copies are needed.

## Manual run and verification

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/database/backup-supabase.ps1
```

Confirm that a new identically named directory exists under both destination
roots and that `manifest.json` lists three validated archives.

## Restore

Do not restore directly over production. Restore into a new/local Supabase
project first using `pg_restore`, verify row counts and authentication data, and
only then decide whether a production recovery is necessary.
