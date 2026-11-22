-- Noroset: idempotent role creation.
-- Passwords are injected by replacing the __MIGRATOR_PASSWORD__ / __APP_PASSWORD__
-- placeholders (see docker/initdb/00-roles.sh, or run the same sed manually in production):
--   sed -e "s|__MIGRATOR_PASSWORD__|$NOROSET_MIGRATOR_PASSWORD|g" \
--       -e "s|__APP_PASSWORD__|$NOROSET_APP_PASSWORD|g" \
--       packages/db/sql/roles.sql | psql "$DATABASE_URL"

DO $do$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'noroset_migrator') THEN
    CREATE ROLE noroset_migrator;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'noroset_app') THEN
    CREATE ROLE noroset_app;
  END IF;
END
$do$;

ALTER ROLE noroset_migrator WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD '__MIGRATOR_PASSWORD__';
ALTER ROLE noroset_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD '__APP_PASSWORD__';

-- migrator: owner of tables, runs migrations (needs CREATE on schema).
GRANT ALL ON SCHEMA public TO noroset_migrator;
-- app: only USAGE on schema; table access is granted explicitly in migrations.
GRANT USAGE ON SCHEMA public TO noroset_app;

-- drizzle migration bookkeeping schema (owned by migrator).
CREATE SCHEMA IF NOT EXISTS drizzle AUTHORIZATION noroset_migrator;

-- migrator needs CREATE on the database to create schemas (drizzle bookkeeping).
DO $do$
BEGIN
  EXECUTE format('GRANT CREATE ON DATABASE %I TO noroset_migrator', current_database());
END
$do$;

-- Future tables created by migrator must NOT be auto-accessible; access is explicit.
ALTER DEFAULT PRIVILEGES FOR ROLE noroset_migrator IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE noroset_migrator IN SCHEMA public REVOKE ALL ON TABLES FROM noroset_app;
