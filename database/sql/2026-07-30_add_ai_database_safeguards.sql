-- Reference copy of:
-- supabase/migrations/20260730103000_add_ai_database_safeguards.sql
--
-- Restrict direct AI database work to non-destructive operations.
-- The login password is intentionally configured outside this migration.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ai_editor') THEN
    CREATE ROLE ai_editor
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION
      BYPASSRLS
      NOINHERIT;
  END IF;
END;
$$;

-- Supabase's postgres role can create a restricted BYPASSRLS role through
-- Supautils, but it is intentionally not a full superuser and cannot re-state
-- every security attribute through ALTER ROLE. Keep re-runs limited to LOGIN.
ALTER ROLE ai_editor NOLOGIN;

ALTER ROLE ai_editor SET statement_timeout = '2min';
ALTER ROLE ai_editor SET lock_timeout = '10s';
ALTER ROLE ai_editor SET idle_in_transaction_session_timeout = '2min';

-- Allows the human-held postgres login to SET ROLE ai_editor when manually
-- maintaining an object owned by ai_editor. This does not grant ai_editor any
-- membership in postgres or any administrative privilege.
GRANT ai_editor TO postgres;

DO $$
BEGIN
  EXECUTE format(
    'GRANT CONNECT ON DATABASE %I TO ai_editor',
    current_database()
  );
END;
$$;

GRANT USAGE, CREATE ON SCHEMA public TO ai_editor;

GRANT SELECT, INSERT, UPDATE
  ON ALL TABLES IN SCHEMA public
  TO ai_editor;

REVOKE DELETE, TRUNCATE
  ON ALL TABLES IN SCHEMA public
  FROM ai_editor;

GRANT USAGE, SELECT, UPDATE
  ON ALL SEQUENCES IN SCHEMA public
  TO ai_editor;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE ON TABLES TO ai_editor;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ai_editor;

CREATE OR REPLACE FUNCTION public.block_ai_destructive_ddl()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF session_user = 'ai_editor' THEN
    RAISE EXCEPTION
      'ai_editor cannot execute %. Create a reviewed SQL migration for manual execution.',
      tg_tag
      USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.block_ai_destructive_ddl() FROM PUBLIC;

DROP EVENT TRIGGER IF EXISTS block_ai_destructive_ddl;

CREATE EVENT TRIGGER block_ai_destructive_ddl
  ON ddl_command_start
  WHEN TAG IN (
    'DROP TABLE',
    'DROP SCHEMA',
    'DROP VIEW',
    'DROP MATERIALIZED VIEW',
    'DROP FOREIGN TABLE',
    'DROP SEQUENCE',
    'DROP FUNCTION',
    'DROP PROCEDURE',
    'DROP TYPE',
    'DROP DOMAIN',
    'DROP INDEX',
    'DROP POLICY',
    'DROP TRIGGER'
  )
  EXECUTE FUNCTION public.block_ai_destructive_ddl();

CREATE OR REPLACE FUNCTION public.block_ai_destructive_dml()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF session_user = 'ai_editor' THEN
    RAISE EXCEPTION
      'ai_editor cannot execute % on %. Create a reviewed SQL migration for manual execution.',
      tg_op,
      tg_table_schema || '.' || tg_table_name
      USING ERRCODE = '42501';
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.block_ai_destructive_dml() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.block_ai_destructive_dml() TO ai_editor;

CREATE OR REPLACE FUNCTION public.guard_ai_created_public_tables()
RETURNS event_trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
  command_row record;
BEGIN
  IF session_user <> 'ai_editor' THEN
    RETURN;
  END IF;

  FOR command_row IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table', 'partitioned table')
      AND schema_name = 'public'
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgrelid = command_row.objid
        AND tgname = 'block_ai_destructive_dml'
        AND NOT tgisinternal
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER block_ai_destructive_dml
           BEFORE DELETE OR TRUNCATE ON %s
           FOR EACH STATEMENT
           EXECUTE FUNCTION public.block_ai_destructive_dml()',
        command_row.object_identity
      );
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_ai_created_public_tables() FROM PUBLIC;

DROP EVENT TRIGGER IF EXISTS guard_ai_created_public_tables;

CREATE EVENT TRIGGER guard_ai_created_public_tables
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION public.guard_ai_created_public_tables();

COMMENT ON ROLE ai_editor IS
  'Restricted direct database role for AI agents: SELECT/INSERT/UPDATE and CREATE in public; no destructive DML/DDL.';

COMMENT ON FUNCTION public.block_ai_destructive_ddl() IS
  'Rejects DROP operations attempted through the ai_editor login.';

COMMENT ON FUNCTION public.block_ai_destructive_dml() IS
  'Rejects DELETE/TRUNCATE by ai_editor on tables created by that role.';

COMMENT ON FUNCTION public.guard_ai_created_public_tables() IS
  'Adds DELETE/TRUNCATE protection to public tables created by ai_editor.';

NOTIFY pgrst, 'reload schema';
