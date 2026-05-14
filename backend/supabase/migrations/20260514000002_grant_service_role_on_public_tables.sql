-- Migration: Grant SELECT on all public tables to service level role

-- 1. Ensure the API roles can see the schema
GRANT USAGE ON SCHEMA public TO service_role;

-- 2. Grant SELECT on all existing tables in public schema
GRANT SELECT ON ALL TABLES IN SCHEMA public TO service_role;
GRANT UPDATE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT DELETE ON ALL TABLES IN SCHEMA public TO service_role;

-- 3. Automatically grant SELECT on future tables created in public schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT ON TABLES TO service_role;


