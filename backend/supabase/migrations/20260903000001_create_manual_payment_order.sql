-- Migration: create_manual_payment_order RPC
--
-- Atomic order creation for the manual (bank-transfer / VietQR) flow.
-- Service-role only. Accepts the server-validated package snapshot (keyed as
-- in backend/src/config/payment-packages.ts: id / label / credits / amountVnd),
-- expires stale PENDING_TRANSFER orders whose deadline passed, reuses the
-- user's existing active order, and relies on the partial unique index
-- idx_payment_orders_active_user to arbitrate concurrent creation.
--
-- INDEX DEPENDENCIES:
--   hard dep  idx_payment_orders_active_user — the ON CONFLICT clause below
--              matches its predicate byte-for-byte; drop it and this RPC
--              errors. Never remove (created in 20260902000001).
--   nice-to-have (perf only, no correctness): idx_payment_orders_user_created,
--              idx_payment_orders_user_status, idx_payment_orders_review_queue.
--
-- Flow inside one call (single transaction):
--   1. validate inputs
--   2. expire stale PENDING_TRANSFER orders (record terminal + resolved_at)
--   3. same client_request_id already exists -> return that row (any state;
--      makes network retries idempotent)
--   4. active order exists -> return it (never create a second)
--   5. INSERT with ON CONFLICT against the partial unique index -> create if free
--   6. lost the race -> return the winning active order

CREATE OR REPLACE FUNCTION public.create_manual_payment_order(
  p_user_id           uuid,
  p_client_request_id text,
  p_package_snapshot  jsonb,
  p_order_code        text,
  p_expires_at        timestamptz
)
RETURNS public.payment_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_package_id    text;
  v_package_label text;
  v_credit_amount integer;
  v_amount_vnd    bigint;
  v_order         public.payment_orders;
BEGIN
  -- 1. validate inputs
  IF p_user_id IS NULL OR p_client_request_id IS NULL
     OR p_order_code IS NULL OR p_expires_at IS NULL THEN
    RAISE EXCEPTION 'Missing required parameter' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_expires_at <= now() THEN
    RAISE EXCEPTION 'expires_at must be in the future' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  v_package_id    := p_package_snapshot ->> 'id';
  v_package_label := p_package_snapshot ->> 'label';
  v_credit_amount := (p_package_snapshot ->> 'credits')::integer;
  v_amount_vnd    := (p_package_snapshot ->> 'amountVnd')::bigint;

  IF v_package_id IS NULL OR v_package_label IS NULL
     OR v_credit_amount IS NULL OR v_amount_vnd IS NULL THEN
    RAISE EXCEPTION 'Invalid package snapshot' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 2. expire stale PENDING_TRANSFER orders (payment deadline passed)
  UPDATE public.payment_orders
     SET status      = 'EXPIRED',
         resolved_at = now()
   WHERE user_id    = p_user_id
     AND status     = 'PENDING_TRANSFER'
     AND expires_at < now()
     AND resolved_at IS NULL;

  -- 3. idempotent retry: same client request ID wins, in any state
  SELECT * INTO v_order
    FROM public.payment_orders
   WHERE user_id = p_user_id
     AND client_request_id = p_client_request_id
   LIMIT 1;
  IF FOUND THEN
    RETURN v_order;
  END IF;

  -- 4. reuse existing active order
  SELECT * INTO v_order
    FROM public.payment_orders
   WHERE user_id = p_user_id
     AND status IN ('PENDING_TRANSFER', 'AWAITING_REVIEW')
   LIMIT 1;
  IF FOUND THEN
    RETURN v_order;
  END IF;

  -- 5. insert; the partial unique index arbitrates concurrent creation
  INSERT INTO public.payment_orders (
    user_id, client_request_id, package_id, package_label,
    credit_amount, amount_vnd, order_code, status, expires_at
  )
  VALUES (
    p_user_id, p_client_request_id, v_package_id, v_package_label,
    v_credit_amount, v_amount_vnd, p_order_code, 'PENDING_TRANSFER', p_expires_at
  )
  ON CONFLICT (user_id) WHERE status IN ('PENDING_TRANSFER', 'AWAITING_REVIEW') --uses index idx_payment_orders_active_user for speed
  DO NOTHING
  RETURNING * INTO v_order;

  -- 6. lost the race -> return the winning active order
  IF NOT FOUND THEN
    SELECT * INTO v_order
      FROM public.payment_orders
     WHERE user_id = p_user_id
       AND status IN ('PENDING_TRANSFER', 'AWAITING_REVIEW')
     LIMIT 1;
    RETURN v_order;
  END IF;

  RETURN v_order;
END;
$$;

-- Lock down: only service_role (bypasses REVOKE) may call.
REVOKE EXECUTE ON FUNCTION public.create_manual_payment_order(uuid, text, jsonb, text, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_manual_payment_order(uuid, text, jsonb, text, timestamptz)
  TO service_role;
