-- Migration: credits_balance NULL-safety (reviewer fix)
-- credits_balance was nullable: NULL + amount = NULL silently kept balance NULL
-- on add_credits, while spend_credits failed closed. Root fix: NOT NULL +
-- backfill; plus COALESCE arithmetic as defense-in-depth per review.

-- ============================================
-- 1. Backfill existing NULL balances
-- ============================================
UPDATE public.profiles SET credits_balance = 0 WHERE credits_balance IS NULL;

-- ============================================
-- 2. Disallow NULL going forward (DEFAULT 0 already existed; restate explicitly)
-- ============================================
ALTER TABLE public.profiles ALTER COLUMN credits_balance SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN credits_balance SET DEFAULT 0;
