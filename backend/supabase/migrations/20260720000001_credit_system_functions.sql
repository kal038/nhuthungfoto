-- Migration: Credit System ACID Functions + Starter Credits Trigger
-- Replaces existing spend_credits with audit-logging version
-- Adds add_credits function and email-verification trigger

-- ============================================
-- 0. ADD idempotency_key to credit_history
-- ============================================
ALTER TABLE public.credit_history
ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE;

-- ============================================
-- 1. REPLACE spend_credits() — now with audit log + idempotency + security
-- ============================================
DROP FUNCTION IF EXISTS public.spend_credits(uuid, integer);

CREATE OR REPLACE FUNCTION public.spend_credits(
  p_user_id uuid,
  p_amount integer,
  p_type transaction_type DEFAULT 'SPEND',
  p_metadata jsonb DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
)
RETURNS integer AS

$$
DECLARE
  v_new_balance integer;
BEGIN
  -- Security check: if called by client directly, must be their own ID
  IF auth.role() = 'authenticated' AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  UPDATE public.profiles
  SET credits_balance = credits_balance - p_amount,
      updated_at = now()
  WHERE id = p_user_id
    AND credits_balance >= p_amount
  RETURNING credits_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  INSERT INTO public.credit_history (user_id, amount, type, metadata, idempotency_key)
  VALUES (p_user_id, -p_amount, p_type, p_metadata, p_idempotency_key);

  RETURN v_new_balance;
END;
$$ 

LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. NEW add_credits() — atomic top-up with audit log + idempotency + security
-- ============================================
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id uuid,
  p_amount integer,
  p_type transaction_type DEFAULT 'PURCHASE',
  p_metadata jsonb DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
)
RETURNS integer AS 

$$
DECLARE
  v_new_balance integer;
BEGIN
  -- Guard for frontend calls (malicious intent)
  IF auth.role() = 'authenticated' AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  UPDATE public.profiles
  SET credits_balance = credits_balance + p_amount,
      updated_at = now()
  WHERE id = p_user_id
  RETURNING credits_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  INSERT INTO public.credit_history (user_id, amount, type, metadata, idempotency_key)
  VALUES (p_user_id, p_amount, p_type, p_metadata, p_idempotency_key);

  RETURN v_new_balance;
END;
$$

LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. NEW grant_credits() — trigger on email verification
-- ============================================
CREATE OR REPLACE FUNCTION public.grant_credits()

RETURNS TRIGGER AS $$

DECLARE
  v_already_claimed boolean;
BEGIN
  -- Only fire when email_verified flips to true
  IF NEW.email_verified = true AND (OLD.email_verified IS NULL OR OLD.email_verified = false) THEN
    -- Idempotency: check no existing STARTER_BONUS
    SELECT EXISTS(
      SELECT 1 FROM public.credit_history
      WHERE user_id = NEW.id AND type = 'STARTER_BONUS'
    ) INTO v_already_claimed;

    IF NOT v_already_claimed THEN
      PERFORM public.add_credits(
        NEW.id,
        10,
        'STARTER_BONUS',
        '{"reason": "email_verification_bonus"}'::jsonb,
        'starter_bonus_' || NEW.id::text
      );
    END IF;
  END IF;

  RETURN NEW;
END;

$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. CREATE TRIGGER for starter credits
-- ============================================
DROP TRIGGER IF EXISTS on_profile_verified ON public.profiles;
CREATE TRIGGER on_profile_verified
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.grant_credits();

-- ============================================
-- 5. REVOKE public access to RPCs to avoid malicious client calls
-- ============================================
REVOKE EXECUTE ON FUNCTION public.spend_credits FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_credits FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_credits FROM PUBLIC, anon, authenticated;
