-- Migration: Add compound index on credit_history (user_id, created_at DESC)
-- Optimizes paginated queries (getHistory) filtering by user_id and ordering by created_at DESC.
-- Replaces single-column idx_credit_history_user_id since user_id is the leading column.

DROP INDEX IF EXISTS public.idx_credit_history_user_id;

CREATE INDEX IF NOT EXISTS idx_credit_history_user_id_created_at
  ON public.credit_history (user_id, created_at DESC);
