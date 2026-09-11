CREATE TABLE IF NOT EXISTS public.email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipients text[] NOT NULL,
  subject text NOT NULL,
  html text NOT NULL,
  text_body text,
  reply_to text,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_outbox_status_idx ON public.email_outbox (status, created_at);

GRANT ALL ON public.email_outbox TO service_role;
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view outbox" ON public.email_outbox;
CREATE POLICY "Admins can view outbox" ON public.email_outbox
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.email_outbox_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS email_outbox_touch ON public.email_outbox;
CREATE TRIGGER email_outbox_touch BEFORE UPDATE ON public.email_outbox
FOR EACH ROW EXECUTE FUNCTION public.email_outbox_touch();