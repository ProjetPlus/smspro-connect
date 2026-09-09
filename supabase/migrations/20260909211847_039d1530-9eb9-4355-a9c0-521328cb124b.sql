ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS dial_code text,
  ADD COLUMN IF NOT EXISTS phone_e164 text,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'pending_verification';

ALTER TABLE public.signup_applications
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  code_hash text NOT NULL,
  channel text NOT NULL DEFAULT 'sms',
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS phone_verifications_user_idx ON public.phone_verifications (user_id, created_at DESC);

GRANT ALL ON public.phone_verifications TO service_role;
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  base_username text;
  final_username text;
BEGIN
  base_username := NULLIF(
    regexp_replace(lower(COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1))),'[^a-z0-9_]+','','g'),
    ''
  );
  final_username := COALESCE(base_username,'user') || '_' || substring(replace(NEW.id::text,'-','') from 1 for 8);

  INSERT INTO public.profiles (
    id, email, full_name, phone, company, username, country, city, dial_code, phone_e164,
    gdpr_consent_at, marketing_consent
  )
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'company',
    final_username,
    NEW.raw_user_meta_data->>'country',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'dial_code',
    NEW.raw_user_meta_data->>'phone_e164',
    CASE WHEN NEW.raw_user_meta_data ? 'gdpr_consent_at' THEN (NEW.raw_user_meta_data->>'gdpr_consent_at')::timestamptz ELSE NULL END,
    COALESCE((NEW.raw_user_meta_data->>'marketing_consent')::boolean, false)
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    username = COALESCE(public.profiles.username, EXCLUDED.username),
    country = COALESCE(EXCLUDED.country, public.profiles.country),
    city = COALESCE(EXCLUDED.city, public.profiles.city),
    dial_code = COALESCE(EXCLUDED.dial_code, public.profiles.dial_code),
    phone_e164 = COALESCE(EXCLUDED.phone_e164, public.profiles.phone_e164),
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'client') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $function$;