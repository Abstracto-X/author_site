# Testing

## Required local checks

Run from project root:

```powershell
./tools/check_independence.ps1
node --check js/subscription/aether-app.js
node --check js/subscription/aether-data.js
node --check js/subscription/site-config.js
```

If editing `admin.html`, extract/check inline JS or smoke test in browser.

## Local HTTP server

Do not test via `file://` for auth/RPC flows.

```powershell
python -m http.server 4174
```

Open:

```txt
http://127.0.0.1:4174/index.html
```

## Expected public reader checks

- Site loads without missing JS/CSS errors.
- Real backend story appears.
- Historical fixture story names do not appear when backend loads.
- Anonymous reader can see catalog cards.
- Free chapter can be opened/read.
- Locked chapter shows preview/gate.
- Unauthorized locked chapter body is not returned.

## Browser smoke signal

Current known-good signs:

```txt
HAS_REAL_SAMPLE: True
HAS_FIXTURE_GLASS: False
```

Do not rely on the specific sample story forever; if real production content replaces it, update checks accordingly.

## Database checks

Verify tables and RPCs:

```sql
select count(*) from public.stories where is_published = true;

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('get_chapter_catalog','get_reader_chapter','get_my_entitlements','redeem_access_key');
```

Verify locked content is null for unauthorized context:

```sql
select title, content is null as content_is_null, can_read, access_state
from public.get_reader_chapter('LOCKED_CHAPTER_UUID');
```

Expected:

```txt
content_is_null = true
can_read = false
```

## Access key testing

Use a non-committed test key generated for the environment. Do not write active plaintext keys into docs, frontend code, screenshots, or commit history.

Flow:

1. Sign in with email/password.
2. Open Vault / redeem key.
3. Submit key.
4. Confirm `get_my_entitlements()` returns active entitlement.
5. Confirm locked chapter unlocks.

## Password recovery testing

1. Open the account sheet and choose **Forgot password?**
2. Submit a real or test email address.
3. Confirm Supabase sends a recovery email.
4. Open the recovery link and verify the app prompts for a new password.
5. Set a new password and confirm the account returns to normal reading access.

## Google OAuth testing

Only if enabled in config and Supabase Auth provider:

- callback URL should target `index.html?sub_auth=google&sub_route=vault`
- test both local and production allow-list entries
- confirm user returns signed in to Vault

## Patreon testing

Only if enabled:

1. Secrets set.
2. Functions deployed.
3. Provider tier mappings created.
4. User connects Patreon.
5. Manual sync creates/refreshes entitlement.
6. Expired/revoked provider state removes access.
