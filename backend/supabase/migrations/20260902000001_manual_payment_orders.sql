-- Migration: Manual payment-order model
--
-- Creates the order table for the manual (bank-transfer / VietQR) credit
-- purchase flow. Each order snapshots the server-validated package, records
-- lifecycle timestamps, and moves through the order_status state machine
-- documented in AGENTS.md:
--
--   PENDING_TRANSFER -> AWAITING_REVIEW -> SUCCESS
--   PENDING_TRANSFER -> CANCELLED | EXPIRED
--   AWAITING_REVIEW  -> CANCELLED (admin rejection)
-- Invariant: active statuses: PENDING_TRANSFER, AWAITING_REVIEW | terminal statuses: SUCCESS, CANCELLED, EXPIRED | Each user_id can have max 1 id at same time

-- ============================================
-- 1. ENUMS
-- ============================================
CREATE TYPE public.order_status AS ENUM (
  'PENDING_TRANSFER',
  'AWAITING_REVIEW',
  'SUCCESS',
  'CANCELLED',
  'EXPIRED'
);
CREATE TYPE public.telegram_notification_status AS ENUM (
  'PENDING',
  'SENT',
  'FAILED'
);

-- ============================================
-- 2. TABLE
-- ============================================
CREATE TABLE public.payment_orders (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Client-generated idempotency key for one logical purchase intent.
  client_request_id            text NOT NULL,

  -- Server-validated package snapshot (flattened).
  package_id                   text NOT NULL,
  package_label                text NOT NULL,
  credit_amount                integer NOT NULL CHECK (credit_amount > 0),
  amount_vnd                   bigint NOT NULL CHECK (amount_vnd > 0),

  -- Human-readable order code used as the bank-transfer message / QR reference.
  order_code                   text NOT NULL CHECK (order_code ~ '^[A-Z0-9]{7}$'),

  status                       public.order_status NOT NULL DEFAULT 'PENDING_TRANSFER',

  -- Payment deadline (server-computed); once passed, stale PENDING_TRANSFER
  -- orders are expired by the order-creation RPC.
  expires_at                   timestamptz NOT NULL,

  -- PENDING_TRANSFER -> AWAITING_REVIEW transition (customer confirmation).
  confirmed_at                 timestamptz,

  -- Telegram review-notification bookkeeping (nullable until first attempt).
  telegram_notification_status public.telegram_notification_status,
  telegram_notified_at         timestamptz,

  -- Admin approval / rejection metadata (e.g. { admin_user_id, method,
  -- chat_id, approved_at }); captured by the credit-grant and lifecycle RPCs.
  approval_metadata            jsonb,

  created_at                   timestamptz NOT NULL DEFAULT now(),
  -- Timestamp when the order reached a terminal state (SUCCESS/CANCELLED/EXPIRED).
  resolved_at                  timestamptz,

  -- Idempotency / ordering guarantees.
  CONSTRAINT payment_orders_user_client_request_unique
    UNIQUE (user_id, client_request_id),
  CONSTRAINT payment_orders_order_code_unique
    UNIQUE (order_code)
);

-- ============================================
-- 2b. PAYMENTS LEDGER LINK
-- ============================================
-- payment_orders = manual-flow WORKFLOW; payments = unified money ledger
-- (manual today, Stripe later). Nullable FK links a payment row to its manual
-- order; non-manual providers (future Stripe) leave it NULL.
ALTER TABLE public.payments
  ADD COLUMN payment_orders_id uuid REFERENCES public.payment_orders(id) ON DELETE SET NULL;

-- ============================================
-- 3. INDEXES
-- ============================================

-- At most one ACTIVE order per user: partial unique index across the two
-- non-terminal, in-flight statuses. Protects against concurrent creation
-- (the order-creation RPC relies on this to win the race).
CREATE UNIQUE INDEX idx_payment_orders_active_user
  ON public.payment_orders (user_id)
  WHERE status IN ('PENDING_TRANSFER', 'AWAITING_REVIEW');

-- User-facing lookups: active order / history listing by user.
CREATE INDEX idx_payment_orders_user_created
  ON public.payment_orders (user_id, created_at DESC);
CREATE INDEX idx_payment_orders_user_status
  ON public.payment_orders (user_id, status);

-- Admin review queue: oldest-first FIFO over orders awaiting admin approval.
CREATE INDEX idx_payment_orders_review_queue
  ON public.payment_orders (confirmed_at)
  WHERE status = 'AWAITING_REVIEW';

-- ============================================
-- 4. ROW LEVEL SECURITY — enabled, no client policies
-- ============================================
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. ACCESS CONTROL — service_role only
-- ============================================
-- Earlier migrations set DEFAULT PRIVILEGES granting SELECT on new tables to
-- anon/authenticated; revoke that explicitly. service_role already inherits
-- ALL via default privileges (20260613000001); the explicit grant is
-- defensive and documents intent.
REVOKE ALL ON TABLE public.payment_orders FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.payment_orders TO service_role;
