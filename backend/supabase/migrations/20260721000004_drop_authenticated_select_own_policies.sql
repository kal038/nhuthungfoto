-- Migration: Drop authenticated SELECT-own policies — all reads now go via Hono (service_role)
--
-- Context:
--   The frontend's last direct Supabase data call (useUserProfile.ts →
--   supabase.from('profiles').select('*').eq('id', userId)) has been replaced
--   with GET /v1/profile via the Hono backend, which uses the service_role
--   key and bypasses RLS.
--
--   Every other table (submissions, credit_history, payments, reviews) was
--   already read exclusively through Hono endpoints using service_role.
--   The authenticated SELECT-own policies therefore existed only as attack
--   surface — they allowed any signed-in user to read their own rows directly
--   via PostgREST, bypassing the backend's rate limiting, logging, and
--   payload-shaping.
--
-- Effect:
--   * authenticated can no longer SELECT any rows from profiles, submissions,
--     credit_history, payments, or reviews via PostgREST.
--   * service_role (used by the Hono backend) is unaffected — it bypasses RLS.
--   * modules_select_all is intentionally KEPT — modules are public content
--     exposed to anon + authenticated (marketing/SEO landing pages).
--
-- Note:
--   The GRANT SELECT ON ALL TABLES TO authenticated from 20260514000001
--   remains in place at the database-privilege level, but with no RLS policy
--   allowing any rows, all selects return 0 rows for the authenticated role.
--   This is the desired "default-deny" posture.

-- ============================================
-- Drop all authenticated SELECT-own policies
-- ============================================
DROP POLICY IF EXISTS "self read data"            ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own         ON public.profiles;
DROP POLICY IF EXISTS submissions_select_own      ON public.submissions;
DROP POLICY IF EXISTS credit_history_select_own   ON public.credit_history;
DROP POLICY IF EXISTS payments_select_own         ON public.payments;
DROP POLICY IF EXISTS reviews_select_own          ON public.reviews;
