-- Migration: Tighten RLS — drop unused authenticated write policies and revoke
-- EXECUTE on trigger-only SECURITY DEFINER functions.
--
-- Context:
--   * The frontend never writes to profiles / submissions directly via Supabase.
--     All writes go through the Hono backend (service_role), which bypasses RLS.
--     The "own row" INSERT/UPDATE policies for authenticated users therefore
--     exist purely as attack surface — e.g. a malicious client could create
--     submissions with arbitrary status/review_type, or self-elevate
--     skill_level / username / current_module on profiles.
--   * The trigger functions handle_new_user / handle_user_update / grant_credits
--     are fired by their respective triggers and are not called via RPC by the
--     backend. They were still EXECUTE-able by anon/authenticated via
--     /rest/v1/rpc/... (flagged by the Supabase security advisor
--     anon_security_definer_function_executable / authenticated_security_definer_function_executable).
--
-- Effect:
--   * authenticated can now only READ its own data on every table.
--   * All writes (including profile updates and submission creation) must go
--     through the Hono backend using the service_role key.
--   * Trigger functions are no longer callable via the PostgREST API. Trigger
--     execution is unaffected (triggers fire as the function owner, which is
--     postgres, regardless of REVOKE on anon/authenticated).

-- ============================================
-- 1. DROP unused authenticated write policies
-- ============================================

-- profiles: authenticated no longer needs UPDATE on its own row.
-- PATCH /v1/profile runs via service_role (RLS-bypassing) in the Hono backend.
-- Sensitive fields (credits_balance, email_verified, phone_verified) were
-- already blocked by the protect_profile_sensitive_fields trigger; this drops
-- the entire UPDATE path for authenticated as defense-in-depth, also closing
-- self-modification of username / skill_level / current_module / locale / etc.
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

-- submissions: authenticated no longer needs INSERT on its own row.
-- POST /v1/submissions runs via service_role in the Hono backend, which also
-- validates module_id, generates the presigned R2 URL, and enforces file
-- size/type limits. Direct client INSERT bypassed all of that and allowed
-- arbitrary status / review_type / processed_photo_key.
DROP POLICY IF EXISTS submissions_insert_own ON public.submissions;

-- ============================================
-- 2. REVOKE EXECUTE on trigger-only SECURITY DEFINER functions
--    from PUBLIC / anon / authenticated.
--    service_role and the function owner (postgres) keep EXECUTE.
--    spend_credits and add_credits were already REVOKEd in 20260720000001
--    and service_role EXECUTE was restored in 20260721000001.
-- ============================================
REVOKE EXECUTE ON FUNCTION public.handle_new_user()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_user_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_credits()      FROM PUBLIC, anon, authenticated;
