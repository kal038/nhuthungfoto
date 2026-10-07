-- Migration: record approved manual payments as SUCCESS in the unified ledger
--
-- approve_manual_payment_order originally inserted the payments row without a
-- status, so it fell back to the column default 'PENDING' even though the order
-- had just been approved. This redefines the RPC to insert status = 'SUCCESS'
-- and backfills any manual ledger rows left PENDING for already-SUCCESS orders.

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
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'Missing required parameter'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT * INTO v_order
    FROM public.payment_orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found' USING ERRCODE = 'no_data_found';
  END IF;

  -- already SUCCESS → return (ALREADY_GRANTED)
  IF v_order.status = 'SUCCESS' THEN
    RETURN v_order;
  END IF;

  IF v_order.status <> 'AWAITING_REVIEW' THEN
    RAISE EXCEPTION 'order % not approvable in state %', p_order_id, v_order.status
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

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

  INSERT INTO public.payments (user_id, amount, provider, status, external_ref, payment_orders_id)
  VALUES (v_order.user_id, v_order.amount_vnd, 'manual', 'SUCCESS', v_order.order_code, v_order.id);

  UPDATE public.payment_orders
     SET status            = 'SUCCESS',
         resolved_at       = now(),
         approval_metadata = COALESCE(p_approval_metadata, '{}'::jsonb)
   WHERE id = v_order.id
   RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

-- Backfill ledger rows created before the fix for orders that are already SUCCESS.
UPDATE public.payments p
   SET status = 'SUCCESS'
  FROM public.payment_orders o
 WHERE p.payment_orders_id = o.id
   AND p.provider = 'manual'
   AND p.status = 'PENDING'
   AND o.status = 'SUCCESS';

REVOKE EXECUTE ON FUNCTION public.approve_manual_payment_order(uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_manual_payment_order(uuid, jsonb)
  TO service_role;
