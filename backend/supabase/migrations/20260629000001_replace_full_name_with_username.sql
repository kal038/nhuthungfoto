-- Migration: Replace full_name with username in profiles table

-- 1. Drop full_name column, add username column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS full_name;
ALTER TABLE public.profiles ADD COLUMN username text;

-- 2. Backfill existing users with a generated username
-- Uses email prefix or 'user' + first 8 chars of user id
UPDATE public.profiles
SET username = lower(regexp_replace(
  coalesce(split_part(email, '@', 1), 'user'),
  '[^a-zA-Z0-9_-]', '', 'g'
)) || '-' || substr(id::text, 1, 8)
WHERE username IS NULL;

-- 3. Enforce username constraints
ALTER TABLE public.profiles ALTER COLUMN username SET NOT NULL;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_format
  CHECK (length(username) >= 4 AND username ~ '^[a-zA-Z0-9_-]+$');

-- 4. Create index for fast username lookups
CREATE INDEX idx_profiles_username ON public.profiles(username);

-- 5. Update handle_new_user trigger to use username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  desired_username text;
  clean_username text;
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

  INSERT INTO public.profiles (id, username)
  VALUES (new.id, clean_username);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
