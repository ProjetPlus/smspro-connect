ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS signup_application_id uuid REFERENCES public.signup_applications(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS email_error text,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;

ALTER TABLE public.signup_applications
  ADD COLUMN IF NOT EXISTS credited_at timestamptz,
  ADD COLUMN IF NOT EXISTS credited_sms integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS notifications_signup_app_idx ON public.notifications(signup_application_id);

INSERT INTO public.system_settings(key, value)
VALUES ('sms_provider', '{"active":"ntouch","ntouch":{"configured":false}}'::jsonb)
ON CONFLICT (key) DO NOTHING;