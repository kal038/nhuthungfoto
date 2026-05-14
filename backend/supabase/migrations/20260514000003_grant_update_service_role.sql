-- Migration: Grant SELECT on all public tables to service level role
GRANT UPDATE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT DELETE ON ALL TABLES IN SCHEMA public TO service_role;
