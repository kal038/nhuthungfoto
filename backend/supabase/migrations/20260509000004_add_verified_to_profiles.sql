-- Add phone_verified and email_verified fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN email_verified boolean;

-- Auto-create profile on new auth.user, make sure to copy email and credit info
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone_verified, email_verified)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email, new.raw_user_meta_data->>'phone_verified', new.raw_user_meta_data->>'email_verified');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;