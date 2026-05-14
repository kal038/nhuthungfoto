-- Migration: Grant SELECT on all public tables to API roles
-- Fixes 42501 "permission denied" caused by missing table privileges
-- even when RLS policies are correctly defined.

-- 1. Ensure the API roles can see the schema
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- 2. Grant SELECT on all existing tables in public schema
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated, anon;

-- 3. Automatically grant SELECT on future tables created in public schema
--    (applies to tables created by the role executing this migration, i.e. postgres)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT ON TABLES TO authenticated, anon;

