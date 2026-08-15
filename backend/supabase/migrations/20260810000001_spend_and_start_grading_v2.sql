-- Migration: Conditional status in spend_and_start_grading
-- HUNG submissions skip GRADING and go straight to AWAITING_HUNG (XOR model).
-- AI submissions continue to use GRADING as before.

CREATE OR REPLACE FUNCTION public.spend_and_start_grading(
  p_user_id         uuid,
  p_submission_id   uuid,
  p_amount          integer,
  p_review_type     review_type,
  p_metadata        jsonb DEFAULT NULL,
  p_idempotency_key text  DEFAULT NULL
)
RETURNS integer AS

$$
DECLARE
  v_owner       uuid;
  v_status      submission_status;
  v_new_balance integer;
BEGIN
  -- Security: if called by client directly, must be their own ID
  IF auth.role() = 'authenticated' AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive' USING ERRCODE = '22023';
  END IF;

  -- Lock the submission row for the transaction to serialize concurrent grades.
  SELECT user_id, status
    INTO v_owner, v_status
    FROM public.submissions
   WHERE id = p_submission_id
   FOR UPDATE;

  IF NOT FOUND OR v_owner IS DISTINCT FROM p_user_id THEN
    -- Don't leak existence of another user's submission.
    RAISE EXCEPTION 'Submission not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_status <> 'UPLOADED' THEN
    RAISE EXCEPTION 'Submission not in UPLOADED status: %', v_status
      USING ERRCODE = '55000'; -- object_not_in_prerequisite_state
  END IF;

  UPDATE public.profiles
     SET credits_balance = credits_balance - p_amount,
         updated_at      = now()
   WHERE id = p_user_id
     AND credits_balance >= p_amount
   RETURNING credits_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient credits' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.credit_history (user_id, amount, type, metadata, idempotency_key)
  VALUES (p_user_id, -p_amount, 'SPEND', p_metadata, p_idempotency_key);

  -- XOR: HUNG goes straight to AWAITING_HUNG, AI goes to GRADING
  UPDATE public.submissions
     SET status      = CASE WHEN p_review_type = 'HUNG' THEN 'AWAITING_HUNG'
                            ELSE 'GRADING' END,
         review_type = p_review_type
   WHERE id = p_submission_id;

  RETURN v_new_balance;
END;
$$

LANGUAGE plpgsql SECURITY DEFINER;

-- Lock down: only service_role (bypasses REVOKE) may call.
REVOKE EXECUTE ON FUNCTION public.spend_and_start_grading FROM PUBLIC, anon, authenticated;
