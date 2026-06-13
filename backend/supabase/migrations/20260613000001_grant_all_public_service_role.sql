-- Migration: Grant ALL permissions on public tables to service_role
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant ALL on all existing tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Grant ALL on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL ON TABLES TO service_role;

-- Grant ALL on sequences (for auto-increment IDs)
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL ON SEQUENCES TO service_role;
