-- Migration: Raise official PostgreSQL SQLSTATE codes from credit functions
-- Lets callers map errors via error.code instead of matching message text.
-- Codes (https://www.postgresql.org/docs/current/errcodes-appendix.html):
--   42501 insufficient_privilege  -> unauthorized caller
--   22023 invalid_parameter_value -> non-positive amount
--   23514 check_violation         -> insufficient credits (matches the
--                                    profiles_credits_balance_nonnegative CHECK)
--   P0002 no_data_found           -> user not found
-- CREATE OR REPLACE preserves existing ACLs (service_role grant stays).

-- ============================================
-- 1. spend_credits() — same logic, coded raises
-- ============================================
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
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  UPDATE public.profiles
  SET credits_balance = credits_balance - p_amount,
      updated_at = now()
  WHERE id = p_user_id
    AND credits_balance >= p_amount
  RETURNING credits_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient credits' USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.credit_history (user_id, amount, type, metadata, idempotency_key)
  VALUES (p_user_id, -p_amount, p_type, p_metadata, p_idempotency_key);

  RETURN v_new_balance;
END;
$$

LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. add_credits() — same logic, coded raises
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
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  UPDATE public.profiles
  SET credits_balance = credits_balance + p_amount,
      updated_at = now()
  WHERE id = p_user_id
  RETURNING credits_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'no_data_found';
  END IF;

  INSERT INTO public.credit_history (user_id, amount, type, metadata, idempotency_key)
  VALUES (p_user_id, p_amount, p_type, p_metadata, p_idempotency_key);

  RETURN v_new_balance;
END;
$$

LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. guard trigger — coded raises (42501) so direct client
-- attempts surface as permission errors, not generic 400s
-- ============================================
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    IF NEW.credits_balance IS DISTINCT FROM OLD.credits_balance THEN
      RAISE EXCEPTION 'Cannot modify credits_balance' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.email_verified IS DISTINCT FROM OLD.email_verified THEN
      RAISE EXCEPTION 'Cannot modify email_verified' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.phone_verified IS DISTINCT FROM OLD.phone_verified THEN
      RAISE EXCEPTION 'Cannot modify phone_verified' USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
