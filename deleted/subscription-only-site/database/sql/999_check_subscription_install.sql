-- Verification queries for the subscription-only Supabase install.
-- Run after applying the required SQL migrations.
-- This does not modify data.

select 'tables' as section, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles',
    'stories',
    'chapters',
    'reader_access_tiers',
    'user_entitlements',
    'provider_connections',
    'provider_tier_mappings',
    'provider_oauth_tokens',
    'access_keys',
    'access_key_redemptions',
    'entitlement_audit_logs'
  )
order by table_name;

select 'chapter_access_columns' as section, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'chapters'
  and column_name in ('required_tier_id', 'public_release_at', 'preview_text')
order by column_name;

select 'rpcs' as section, routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'get_chapter_catalog',
    'get_reader_chapter',
    'get_my_entitlements',
    'redeem_access_key'
  )
order by routine_name;

select 'rls_enabled' as section, relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in (
    'reader_access_tiers',
    'user_entitlements',
    'provider_connections',
    'provider_tier_mappings',
    'provider_oauth_tokens',
    'access_keys',
    'access_key_redemptions',
    'entitlement_audit_logs',
    'chapters'
  )
order by relname;

select 'provider_token_privileges' as section, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'provider_oauth_tokens'
order by grantee, privilege_type;
