ALTER TABLE public.signup_applications
  ADD COLUMN IF NOT EXISTS gdpr_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS certified_at timestamptz,
  ADD COLUMN IF NOT EXISTS documents_validation_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS documents_checked_at timestamptz;

ALTER TABLE public.signup_applications
  DROP CONSTRAINT IF EXISTS signup_applications_documents_validation_status_check;
ALTER TABLE public.signup_applications
  ADD CONSTRAINT signup_applications_documents_validation_status_check
  CHECK (documents_validation_status IN ('pending','valid','rejected'));

CREATE INDEX IF NOT EXISTS signup_applications_documents_validation_idx
  ON public.signup_applications(documents_validation_status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.signup_applications TO authenticated;
GRANT ALL ON public.signup_applications TO service_role;

CREATE OR REPLACE FUNCTION public.autopublish_news()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.news_posts
  SET status = 'published', updated_at = now()
  WHERE status = 'draft'
    AND published_at IS NOT NULL
    AND published_at <= now();
END;
$$;
REVOKE ALL ON FUNCTION public.autopublish_news() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.autopublish_news() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'news-autopublish') THEN
    PERFORM cron.unschedule('news-autopublish');
  END IF;
END $$;
SELECT cron.schedule('news-autopublish', '* * * * *', $$SELECT public.autopublish_news();$$);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sms_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_messages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'campaigns'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
  END IF;
END $$;

UPDATE public.system_settings
SET value = '{"sms": false, "payments": false}'::jsonb, updated_at = now()
WHERE key = 'mock_mode';

DELETE FROM public.sms_messages
WHERE provider_message_id LIKE 'mock!_%' ESCAPE '!'
   OR error ILIKE '%simulation%';
DELETE FROM public.campaign_executions
WHERE error ILIKE '%simulation%';
DELETE FROM public.orders
WHERE provider_transaction_id LIKE 'mock!_%' ESCAPE '!';

INSERT INTO public.packages (slug, name, price_fcfa, sms_volume, features, featured, active, sort_order)
VALUES
 ('decouverte','Découverte',12500,500,'["25 FCFA / SMS","Nom d’expéditeur personnalisé","Rapports de livraison"]'::jsonb,false,true,1),
 ('standard','Standard',20000,1000,'["20 FCFA / SMS","API REST","Support prioritaire"]'::jsonb,true,true,2),
 ('business','Business',150000,10000,'["15 FCFA / SMS","API REST + Webhooks","Campagnes récurrentes"]'::jsonb,false,true,3),
 ('entreprise','Entreprise',1200000,100000,'["12 FCFA / SMS","SLA garanti","Accompagnement dédié"]'::jsonb,false,true,4)
ON CONFLICT (slug) DO UPDATE SET
 name = EXCLUDED.name,
 price_fcfa = EXCLUDED.price_fcfa,
 sms_volume = EXCLUDED.sms_volume,
 features = EXCLUDED.features,
 featured = EXCLUDED.featured,
 active = EXCLUDED.active,
 sort_order = EXCLUDED.sort_order;