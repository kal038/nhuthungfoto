-- Migration: payment_orders_effective view
--
-- READ-SIDE CANONICAL SOURCE for order state. ALWAYS read orders via this field "effective_status"
-- view (effective_status). Never read raw payment_orders.status for
-- user/UI/admin/status reads — lazy expiry leaves stale PENDING_TRANSFER
-- rows untouched until a create-RPC touch materializes the flip.
--
--   status = PENDING_TRANSFER AND expires_at < now()  ->  EXPIRED
--   otherwise                                          ->  status
--
-- service_role reads order state via this view; writes still go through the
-- RPCs (create_manual_payment_order / lifecycle / grant). AWAITING_REVIEW
-- never expires (admin queue), so it passes through unchanged.
--
-- security_invoker (PG15+): make sure we run this as caller (service_role) instead of owner (postgres). Else we leak everything.

CREATE VIEW public.payment_orders_effective
WITH (security_invoker = true)
AS
SELECT *,
       CASE
         WHEN status = 'PENDING_TRANSFER' AND expires_at < now() THEN 'EXPIRED'
         ELSE status
       END AS effective_status
  FROM public.payment_orders;

-- Access control: service_role only, consistent with the base table.
REVOKE ALL ON public.payment_orders_effective FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.payment_orders_effective TO service_role;
