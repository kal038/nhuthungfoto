-- Migration: mutually-exclusive Telegram review notification delivery
--
-- confirmOrder sends the admin review card and then records SENT. Without a
-- claim, two confirms (double-click, client retry, redelivery) both read a
-- non-SENT status and both send, producing duplicate admin cards. Telegram
-- sendMessage has no idempotency key, so we serialise sends in the DB instead.
--
-- claim_telegram_notification() must be won before sending. The claim is a
-- lease held in telegram_send_claimed_at and is released when the status is
-- written SENT/FAILED. A stale claim (process died mid-send) expires after
-- 60 seconds so a later confirm can retry.

ALTER TABLE public.payment_orders
  ADD COLUMN IF NOT EXISTS telegram_send_claimed_at timestamptz;

CREATE OR REPLACE FUNCTION public.claim_telegram_notification(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.payment_orders;
  v_lease interval := interval '60 seconds';
BEGIN
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'Missing required parameter'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Row lock serialises concurrent claims: a blocked caller re-reads the
  -- committed claim below and loses.
  SELECT * INTO v_order
    FROM public.payment_orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found' USING ERRCODE = 'no_data_found';
  END IF;

  -- Already delivered, or another caller holds a fresh claim.
  IF v_order.telegram_notification_status = 'SENT'
     OR (v_order.telegram_send_claimed_at IS NOT NULL
         AND v_order.telegram_send_claimed_at > now() - v_lease) THEN
    RETURN false;
  END IF;

  UPDATE public.payment_orders
     SET telegram_send_claimed_at = now()
   WHERE id = p_order_id;

  RETURN true;
END;
$$;

-- Release the claim when a terminal notification status is recorded, so a
-- FAILED send can be retried and a SENT row needs no lease.
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
                                             ELSE telegram_notified_at END,
         telegram_send_claimed_at     = CASE WHEN p_status IN ('SENT', 'FAILED')
                                             THEN NULL
                                             ELSE telegram_send_claimed_at END
   WHERE id = p_order_id
   RETURNING * INTO v_order;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found' USING ERRCODE = 'no_data_found';
  END IF;

  RETURN v_order;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_telegram_notification(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_telegram_notification(uuid)
  TO service_role;
