-- Migration: Fix RLS policies, add indexes, and harden functions
-- Applied on top of 20260427071151_initial_schema.sql

-- ============================================
-- 1. FIX BROKEN / DANGEROUS RLS POLICIES
-- ============================================

-- Drop overly permissive policies that allowed any authenticated user admin rights.
-- Admin writes will be handled by the Hono backend using the service_role key.
DROP POLICY IF EXISTS modules_admin_write ON public.modules;
DROP POLICY IF EXISTS submissions_admin_all ON public.submissions;

-- ============================================
-- 2. FIX PROFILES RLS (ensure table is locked down)
-- ============================================

-- If the initial migration failed to enable RLS due to the missing semicolon,
-- ensure it is enabled now.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Re-create policies idempotently so they are guaranteed to exist and be correct.
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 3. HARDEN submissions TABLE
-- ============================================

-- Prevent orphaned submissions without an owner.
ALTER TABLE public.submissions
  ALTER COLUMN user_id SET NOT NULL;

-- ============================================
-- 4. ADD MISSING INDEXES
-- ============================================

-- Speed up reviews lookups by submission.
CREATE INDEX IF NOT EXISTS idx_reviews_submission_id ON public.reviews(submission_id);

-- Covering index for the RLS subquery in reviews_select_own.
CREATE INDEX IF NOT EXISTS idx_submissions_id_user_id ON public.submissions(id, user_id);

-- ============================================
-- 5. HARDEN spend_credits FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.spend_credits(
  user_id uuid,
  amount integer
)
RETURNS integer AS $$
DECLARE
  new_balance integer;
BEGIN
  -- Reject non-positive amounts (prevents credit inflation via negative spend).
  IF amount <= 0 THEN
    RAISE EXCEPTION 'spend_credits: amount must be positive, got %', amount;
  END IF;

  UPDATE public.profiles
  SET credits_balance = credits_balance - amount,
      updated_at = now()
  WHERE id = user_id
    AND credits_balance >= amount
  RETURNING credits_balance INTO new_balance;

  -- If no row was updated, the user had insufficient credits.
  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'spend_credits: insufficient credits for user %', user_id;
  END IF;

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
