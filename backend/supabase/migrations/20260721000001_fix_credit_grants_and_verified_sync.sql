-- Migration: Fix credit RPC grants, email-verification sync, and profile hardening
-- 1. service_role lost EXECUTE on credit RPCs after REVOKE in 20260720000001 — restore it
-- 2. Nothing ever flipped profiles.email_verified — sync it from auth.users.email_confirmed_at
-- 3. Grant starter bonus at signup when email is already verified (e.g. OAuth)
-- 4. Block authenticated users from self-modifying credits_balance / verified flags
-- 5. Defense-in-depth CHECK on credits_balance

-- ============================================
-- 1. RESTORE service_role EXECUTE on credit RPCs
-- (backend calls these via PostgREST as service_role)
-- ============================================
GRANT EXECUTE ON FUNCTION public.spend_credits(uuid, integer, transaction_type, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_credits(uuid, integer, transaction_type, jsonb, text) TO service_role;

-- ============================================
-- 2. SYNC email_verified FROM auth.users.email_confirmed_at
-- Previously only `email` was synced and only when it changed,
-- so profiles.email_verified never became true organically.
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET email = new.email,
      email_verified = (new.email_confirmed_at IS NOT NULL)
  WHERE id = new.id;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
AFTER UPDATE ON auth.users
FOR EACH ROW
WHEN (
  OLD.email IS DISTINCT FROM NEW.email
  OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at
)
EXECUTE FUNCTION public.handle_user_update();

-- ============================================
-- 3. SIGNUP: restore email/verified columns + grant bonus
-- when the email is already verified at account creation.
-- (20260629000001 dropped email/email_verified/phone_verified
-- from the INSERT; the AFTER UPDATE grant trigger never fires
-- for users verified at signup.)
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  desired_username text;
  clean_username text;
  v_email_verified boolean;
BEGIN
  -- Try to get username from user metadata, fallback to email prefix
  desired_username := new.raw_user_meta_data->>'username';

  IF desired_username IS NULL OR desired_username = '' THEN
    desired_username := split_part(new.email, '@', 1);
  END IF;

  -- Clean username: lowercase, remove invalid chars
  clean_username := lower(regexp_replace(desired_username, '[^a-zA-Z0-9_-]', '', 'g'));

  -- Ensure minimum length
  IF length(clean_username) < 4 THEN
    clean_username := 'user-' || substr(new.id::text, 1, 8);
  END IF;

  v_email_verified := (new.email_confirmed_at IS NOT NULL)
    OR (new.raw_user_meta_data->>'email_verified')::boolean IS TRUE;

  INSERT INTO public.profiles (id, username, email, phone_verified, email_verified)
  VALUES (
    new.id,
    clean_username,
    new.email,
    (new.raw_user_meta_data->>'phone_verified')::boolean,
    v_email_verified
  );

  -- Starter bonus for users already verified at signup (e.g. OAuth).
  -- Idempotency key matches the verification trigger's, so only one bonus ever lands.
  IF v_email_verified THEN
    PERFORM public.add_credits(
      new.id,
      10,
      'STARTER_BONUS',
      '{"reason": "email_verification_bonus"}'::jsonb,
      'starter_bonus_' || new.id::text
    );
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. GUARD: block self-modification of sensitive columns
-- profiles_update_own RLS allows authenticated users to update
-- every column of their own row (including credits_balance).
-- Column-level REVOKE cannot override the table-level grant, so
-- use a trigger. Only restricts the 'authenticated' role — the
-- backend (service_role), gotrue sync, and admin paths are unaffected.
-- ============================================
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    IF NEW.credits_balance IS DISTINCT FROM OLD.credits_balance THEN
      RAISE EXCEPTION 'Cannot modify credits_balance';
    END IF;
    IF NEW.email_verified IS DISTINCT FROM OLD.email_verified THEN
      RAISE EXCEPTION 'Cannot modify email_verified';
    END IF;
    IF NEW.phone_verified IS DISTINCT FROM OLD.phone_verified THEN
      RAISE EXCEPTION 'Cannot modify phone_verified';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER protect_profile_sensitive_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_sensitive_fields();

-- ============================================
-- 5. Defense-in-depth: balance can never go negative
-- ============================================
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_credits_balance_nonnegative CHECK (credits_balance >= 0);
