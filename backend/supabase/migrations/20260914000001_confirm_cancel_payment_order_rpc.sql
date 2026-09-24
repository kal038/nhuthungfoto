-- Migration: manual payment order lifecycle RPCs (confirm / cancel)
--
-- Customer actions on a manual (bank-transfer / VietQR) order:
--   confirm_manual_payment_order: PENDING_TRANSFER -> AWAITING_REVIEW
--     (customer claims the bank transfer was sent; money is spent and
--      irreversible — moving/cancelling past this point is the admin's job)
--   cancel_manual_payment_order:  PENDING_TRANSFER -> CANCELLED
--     (customer backs out before sending money); PENDING_TRANSFER past its
--     deadline -> EXPIRED (materialized here, returned as a terminal no-op)
--
-- GUARDS (owner-scoped by user_id; raise SQLSTATE mapped by backend/lib/pg-errors):
--   - 22023 invalid_parameter_value  -> HTTP 400 (null params)
--   - P0002 no_data_found            -> HTTP 404 (no such order for this user)
--   - 55000 object_not_in_prerequisite_state -> HTTP 409 (wrong state)
--     confirm: terminal states, or PENDING_TRANSFER past the payment deadline
--              (deadline miss rejects with 409 and does NOT flip the row — an
--               uncaught RAISE aborts the txn, so a raw EXPIRED write here
--               would roll back; the create RPC materializes it later under
--               the lazy-expiry law — readers use effective_status from the
--               effective view)
--     cancel : AWAITING_REVIEW (money sent — not cancellable by the customer;
--              admin owns that state); terminal states: cancel returns the
--              row unchanged (idempotent no-op), confirm raises on terminal.
--              PENDING_TRANSFER past the deadline is materialized to EXPIRED
--              and returned (no RAISE after the write, so it persists).
--
-- Both functions row-lock the target order (FOR UPDATE) so two concurrent
-- calls race on the same row safely; both end with RETURNING the exact row
-- state produced inside this transaction (read-your-write, one atom).
--
-- INDEX POLICY: PENDING_TRANSFER -> AWAITING_REVIEW stays under the user's
-- one-active-order cap (idx_payment_orders_active_user covers both statuses),
-- so no index churn here. CANCELLED/EXPIRED free the cap for the next order
-- (the create RPC relies on that partial unique index — never drop it).

-- ============================================
-- 1. CONFIRM — customer confirms the bank transfer was sent
-- ============================================
CREATE OR REPLACE FUNCTION public.confirm_manual_payment_order(
  p_user_id  uuid,
  p_order_id uuid
)
RETURNS public.payment_orders
LANGUAGE plpgsql
SECURITY DEFINER --execute as 'postgres'
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.payment_orders;
BEGIN
  -- 1. validate inputs
  IF p_user_id IS NULL OR p_order_id IS NULL THEN
    RAISE EXCEPTION 'Missing required parameter' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 2. locate + lock the owner's order (ownership check + race-safe lock)
  SELECT * INTO v_order
    FROM public.payment_orders
   WHERE id = p_order_id
     AND user_id = p_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found' USING ERRCODE = 'no_data_found';
  END IF;

  -- 3. idempotent repeat-confirm: already at review, hand back same row
  IF v_order.status = 'AWAITING_REVIEW' THEN
    RETURN v_order;
  END IF;

  -- 4. any other non-pending state (terminal) is not confirmable
  IF v_order.status <> 'PENDING_TRANSFER' THEN
    RAISE EXCEPTION 'order % not confirmable in state %', p_order_id, v_order.status
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  -- 5. deadline passed: not confirmable (409). Do NOT add an EXPIRED UPDATE
  --    here — an uncaught RAISE aborts the transaction and rolls it back.
  --    Raw-status materialization stays with the create + cancel RPCs
  --    (lazy-expiry law); reads use effective_status from the effective view.
  IF v_order.expires_at < now() THEN
    RAISE EXCEPTION 'order % payment deadline passed', p_order_id
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  -- 6. PENDING_TRANSFER -> AWAITING_REVIEW
  UPDATE public.payment_orders
     SET status       = 'AWAITING_REVIEW',
         confirmed_at = now()
   WHERE id = v_order.id
   RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

-- ============================================
-- 2. CANCEL — customer backs out before sending money
-- ============================================
CREATE OR REPLACE FUNCTION public.cancel_manual_payment_order(
  p_user_id  uuid,
  p_order_id uuid
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
  IF p_user_id IS NULL OR p_order_id IS NULL THEN
    RAISE EXCEPTION 'Missing required parameter' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 2. locate + lock the owner's order (ownership check + race-safe lock)
  SELECT * INTO v_order
    FROM public.payment_orders
   WHERE id = p_order_id
     AND user_id = p_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found' USING ERRCODE = 'no_data_found';
  END IF;

  -- 3. terminal states: nothing to cancel, idempotent no-op return
  IF v_order.status IN ('SUCCESS', 'CANCELLED', 'EXPIRED') THEN
    RETURN v_order;
  END IF;

  -- 4. AWAITING_REVIEW: customer already claimed the transfer was sent —
  --    money is out of their hands, only admin can move the order forward
  --    or reject it. Same UX as confirm-on-terminal: 409 from the caller.
  IF v_order.status = 'AWAITING_REVIEW' THEN
    RAISE EXCEPTION 'order % awaiting review cannot be cancelled', p_order_id
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  -- 5. PENDING_TRANSFER past its deadline: materialize the lazy expiry and
  --    return the terminal row. Reached only for raw PENDING_TRANSFER (step 3
  --    handled terminals, step 4 handled AWAITING_REVIEW, which never expires).
  --    No RAISE follows, so this write PERSISTS — unlike confirm, where the
  --    409 aborts the transaction and would roll an UPDATE back.
  IF v_order.expires_at < now() THEN
    UPDATE public.payment_orders
       SET status      = 'EXPIRED',
           resolved_at = now()
     WHERE id = v_order.id
     RETURNING * INTO v_order;
    RETURN v_order;
  END IF;

  -- 6. PENDING_TRANSFER -> CANCELLED
  UPDATE public.payment_orders
     SET status      = 'CANCELLED',
         resolved_at = now()
   WHERE id = v_order.id
   RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

-- Lock down: only service_role may call (same posture as create RPC).
REVOKE EXECUTE ON FUNCTION public.confirm_manual_payment_order(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_manual_payment_order(uuid, uuid)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.cancel_manual_payment_order(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_manual_payment_order(uuid, uuid)
  TO service_role;
