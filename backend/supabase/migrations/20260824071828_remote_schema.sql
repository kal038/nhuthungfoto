revoke delete on table "public"."credit_history" from "anon";

revoke insert on table "public"."credit_history" from "anon";

revoke references on table "public"."credit_history" from "anon";

revoke trigger on table "public"."credit_history" from "anon";

revoke truncate on table "public"."credit_history" from "anon";

revoke update on table "public"."credit_history" from "anon";

revoke delete on table "public"."credit_history" from "authenticated";

revoke insert on table "public"."credit_history" from "authenticated";

revoke references on table "public"."credit_history" from "authenticated";

revoke trigger on table "public"."credit_history" from "authenticated";

revoke truncate on table "public"."credit_history" from "authenticated";

revoke update on table "public"."credit_history" from "authenticated";

revoke delete on table "public"."modules" from "anon";

revoke insert on table "public"."modules" from "anon";

revoke references on table "public"."modules" from "anon";

revoke trigger on table "public"."modules" from "anon";

revoke truncate on table "public"."modules" from "anon";

revoke update on table "public"."modules" from "anon";

revoke delete on table "public"."modules" from "authenticated";

revoke insert on table "public"."modules" from "authenticated";

revoke references on table "public"."modules" from "authenticated";

revoke trigger on table "public"."modules" from "authenticated";

revoke truncate on table "public"."modules" from "authenticated";

revoke update on table "public"."modules" from "authenticated";

revoke delete on table "public"."payments" from "anon";

revoke insert on table "public"."payments" from "anon";

revoke references on table "public"."payments" from "anon";

revoke trigger on table "public"."payments" from "anon";

revoke truncate on table "public"."payments" from "anon";

revoke update on table "public"."payments" from "anon";

revoke delete on table "public"."payments" from "authenticated";

revoke insert on table "public"."payments" from "authenticated";

revoke references on table "public"."payments" from "authenticated";

revoke trigger on table "public"."payments" from "authenticated";

revoke truncate on table "public"."payments" from "authenticated";

revoke update on table "public"."payments" from "authenticated";

revoke delete on table "public"."profiles" from "anon";

revoke insert on table "public"."profiles" from "anon";

revoke references on table "public"."profiles" from "anon";

revoke trigger on table "public"."profiles" from "anon";

revoke truncate on table "public"."profiles" from "anon";

revoke update on table "public"."profiles" from "anon";

revoke delete on table "public"."profiles" from "authenticated";

revoke insert on table "public"."profiles" from "authenticated";

revoke references on table "public"."profiles" from "authenticated";

revoke trigger on table "public"."profiles" from "authenticated";

revoke truncate on table "public"."profiles" from "authenticated";

revoke update on table "public"."profiles" from "authenticated";

revoke delete on table "public"."reviews" from "anon";

revoke insert on table "public"."reviews" from "anon";

revoke references on table "public"."reviews" from "anon";

revoke trigger on table "public"."reviews" from "anon";

revoke truncate on table "public"."reviews" from "anon";

revoke update on table "public"."reviews" from "anon";

revoke delete on table "public"."reviews" from "authenticated";

revoke insert on table "public"."reviews" from "authenticated";

revoke references on table "public"."reviews" from "authenticated";

revoke trigger on table "public"."reviews" from "authenticated";

revoke truncate on table "public"."reviews" from "authenticated";

revoke update on table "public"."reviews" from "authenticated";

revoke delete on table "public"."submissions" from "anon";

revoke insert on table "public"."submissions" from "anon";

revoke references on table "public"."submissions" from "anon";

revoke trigger on table "public"."submissions" from "anon";

revoke truncate on table "public"."submissions" from "anon";

revoke update on table "public"."submissions" from "anon";

revoke delete on table "public"."submissions" from "authenticated";

revoke insert on table "public"."submissions" from "authenticated";

revoke references on table "public"."submissions" from "authenticated";

revoke trigger on table "public"."submissions" from "authenticated";

revoke truncate on table "public"."submissions" from "authenticated";

revoke update on table "public"."submissions" from "authenticated";

drop index if exists "public"."idx_payments_external_ref";

drop index if exists "public"."idx_profiles_user_id";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.add_credits(p_user_id uuid, p_amount integer, p_type transaction_type DEFAULT 'PURCHASE'::transaction_type, p_metadata jsonb DEFAULT NULL::jsonb, p_idempotency_key text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_new_balance integer;
BEGIN
  -- Guard for frontend calls (malicious intent)
  IF auth.role() = 'authenticated' AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  UPDATE public.profiles
  SET credits_balance = COALESCE(credits_balance, 0) + p_amount,
      updated_at = now()
  WHERE id = p_user_id
  RETURNING credits_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'no_data_found';
  END IF;

  INSERT INTO public.credit_history (user_id, amount, type, metadata, idempotency_key)
  VALUES (p_user_id, p_amount, p_type, p_metadata, p_idempotency_key);

  RETURN v_new_balance;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.spend_credits(p_user_id uuid, p_amount integer, p_type transaction_type DEFAULT 'SPEND'::transaction_type, p_metadata jsonb DEFAULT NULL::jsonb, p_idempotency_key text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_new_balance integer;
BEGIN
  -- Security check: if called by client directly, must be their own ID
  IF auth.role() = 'authenticated' AND auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  UPDATE public.profiles
  SET credits_balance = COALESCE(credits_balance, 0) - p_amount,
      updated_at = now()
  WHERE id = p_user_id
    AND credits_balance >= p_amount
  RETURNING credits_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient credits' USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.credit_history (user_id, amount, type, metadata, idempotency_key)
  VALUES (p_user_id, -p_amount, p_type, p_metadata, p_idempotency_key);

  RETURN v_new_balance;
END;
$function$
;


