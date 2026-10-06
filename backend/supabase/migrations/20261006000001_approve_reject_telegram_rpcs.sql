-- Migration: admin payment order resolution RPCs (approve / reject)
-- + telegram notification status update RPC
--
-- Admin actions on a manual (bank-transfer / VietQR) order:
--   approve_manual_payment_order: AWAITING_REVIEW → SUCCESS
--     (admin verified bank statement; grants credits + inserts payments
--      ledger row + flips status — all in one atomic transaction)
--   reject_manual_payment_order:  AWAITING_REVIEW → CANCELLED
--     (admin did not find matching bank transfer)
--   update_telegram_notification_status: bookkeeping after confirm RPC
--     (records whether the Telegram review card was delivered)
--
-- GUARDS (raise SQLSTATE mapped by backend/lib/pg-errors):
--   - 22023 invalid_parameter_value  → HTTP 400 (null params)
--   - P0002 no_data_found            → HTTP 404 (no such order)
--   - 55000 object_not_in_prerequisite_state → HTTP 409 (wrong state)
--
-- All three are SECURITY DEFINER, service_role-only — same posture as
-- create / confirm / cancel RPCs.

-- ============================================
-- 1. APPROVE — admin verifies bank transfer and grants credits
-- ============================================
CREATE OR REPLACE FUNCTION public.approve_manual_payment_order(
  p_order_id          uuid,
  p_approval_metadata jsonb DEFAULT NULL
)
RETURNS public.payment_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order   public.payment_orders;
  v_balance integer;
BEGIN
  -- 1. validate inputs
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'Missing required parameter'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 2. locate + lock
  SELECT * INTO v_order
    FROM public.payment_orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found' USING ERRCODE = 'no_data_found';
  END IF;

  -- 3. idempotent: already SUCCESS → return (ALREADY_GRANTED)
  IF v_order.status = 'SUCCESS' THEN
    RETURN v_order;
  END IF;

  -- 4. only AWAITING_REVIEW can be approved
  IF v_order.status <> 'AWAITING_REVIEW' THEN
    RAISE EXCEPTION 'order % not approvable in state %', p_order_id, v_order.status
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  -- 5. grant credits (same transaction — atomic with the status flip)
  v_balance := public.add_credits(
    p_user_id         := v_order.user_id,
    p_amount          := v_order.credit_amount,
    p_type            := 'PURCHASE',
    p_metadata        := jsonb_build_object(
                           'payment_order_id', v_order.id,
                           'order_code',       v_order.order_code,
                           'amount_vnd',       v_order.amount_vnd
                         ),
    p_idempotency_key := 'payment-order:' || v_order.id::text
  );

  -- 6. insert unified payments ledger row
  INSERT INTO public.payments (user_id, amount, provider, external_ref, payment_orders_id)
  VALUES (v_order.user_id, v_order.amount_vnd, 'manual', v_order.order_code, v_order.id);

  -- 7. AWAITING_REVIEW → SUCCESS
  UPDATE public.payment_orders
     SET status            = 'SUCCESS',
         resolved_at       = now(),
         approval_metadata = COALESCE(p_approval_metadata, '{}'::jsonb)
   WHERE id = v_order.id
   RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

-- ============================================
-- 2. REJECT — admin did not find matching transfer
-- ============================================
CREATE OR REPLACE FUNCTION public.reject_manual_payment_order(
  p_order_id          uuid,
  p_approval_metadata jsonb DEFAULT NULL
)
RETURNS public.payment_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.payment_orders;
BEGIN
  -- 1. validate inputs
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'Missing required parameter'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 2. locate + lock
  SELECT * INTO v_order
    FROM public.payment_orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found' USING ERRCODE = 'no_data_found';
  END IF;

  -- 3. terminal states: idempotent no-op
  IF v_order.status IN ('SUCCESS', 'CANCELLED', 'EXPIRED') THEN
    RETURN v_order;
  END IF;

  -- 4. only AWAITING_REVIEW can be rejected by admin
  IF v_order.status <> 'AWAITING_REVIEW' THEN
    RAISE EXCEPTION 'order % not rejectable in state %', p_order_id, v_order.status
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  -- 5. AWAITING_REVIEW → CANCELLED
  UPDATE public.payment_orders
     SET status            = 'CANCELLED',
         resolved_at       = now(),
         approval_metadata = COALESCE(p_approval_metadata, '{}'::jsonb)
   WHERE id = v_order.id
   RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

-- ============================================
-- 3. UPDATE TELEGRAM NOTIFICATION STATUS
-- ============================================
CREATE OR REPLACE FUNCTION public.update_telegram_notification_status(
  p_order_id uuid,
  p_status   public.telegram_notification_status
)
RETURNS public.payment_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.payment_orders;
BEGIN
  IF p_order_id IS NULL OR p_status IS NULL THEN
    RAISE EXCEPTION 'Missing required parameter'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  UPDATE public.payment_orders
     SET telegram_notification_status = p_status,
         telegram_notified_at         = CASE WHEN p_status = 'SENT' THEN now()
                                             ELSE telegram_notified_at END
   WHERE id = p_order_id
   RETURNING * INTO v_order;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found' USING ERRCODE = 'no_data_found';
  END IF;

  RETURN v_order;
END;
$$;

-- ============================================
-- 4. ACCESS CONTROL — service_role only
-- ============================================
REVOKE EXECUTE ON FUNCTION public.approve_manual_payment_order(uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_manual_payment_order(uuid, jsonb)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.reject_manual_payment_order(uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reject_manual_payment_order(uuid, jsonb)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.update_telegram_notification_status(uuid, public.telegram_notification_status)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_telegram_notification_status(uuid, public.telegram_notification_status)
  TO service_role;
