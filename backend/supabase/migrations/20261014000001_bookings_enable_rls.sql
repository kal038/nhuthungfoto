-- Migration: enable RLS on public.bookings and backfill profiles.email
--
-- 1. The Cal.com booking mirror is service-role only: grants were revoked from
--    PUBLIC/anon/authenticated in 20261012000001, but RLS was never enabled.
--    Enable it as the deny-all backstop so any future accidental grant cannot
--    expose rows without a policy.
-- 2. Backfill public.profiles.email (and email_verified) from auth.users for
--    accounts created before 20260721000001 restored email to handle_new_user.

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

UPDATE public.profiles p
SET email = lower(u.email),
    email_verified = COALESCE(p.email_verified, u.email_confirmed_at IS NOT NULL)
FROM auth.users u
WHERE p.id = u.id
  AND p.email IS NULL;
