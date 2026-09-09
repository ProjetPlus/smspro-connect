ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

UPDATE public.profiles
SET username = 'smsmobilepro',
    gdpr_consent_at = COALESCE(gdpr_consent_at, now()),
    marketing_consent = COALESCE(marketing_consent, false),
    updated_at = now()
WHERE email = 'admin@smsmobilepro.com';

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
    regexp_replace(
      lower(COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))),
      '[^a-z0-9_]+',
      '',
      'g'
    ),
    ''
  );
  final_username := COALESCE(base_username, 'user') || '_' || substring(replace(NEW.id::text, '-', '') from 1 for 8);

  INSERT INTO public.profiles (id, email, full_name, phone, company, username, gdpr_consent_at, marketing_consent)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'company',
    final_username,
    CASE WHEN NEW.raw_user_meta_data ? 'gdpr_consent_at' THEN (NEW.raw_user_meta_data->>'gdpr_consent_at')::timestamptz ELSE NULL END,
    COALESCE((NEW.raw_user_meta_data->>'marketing_consent')::boolean, false)
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    username = COALESCE(public.profiles.username, EXCLUDED.username),
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client')
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $function$;