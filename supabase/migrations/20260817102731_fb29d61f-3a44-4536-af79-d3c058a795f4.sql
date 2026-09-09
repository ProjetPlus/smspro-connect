CREATE TABLE public.signup_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  mobile text NOT NULL,
  civility text,
  last_name text NOT NULL,
  first_name text NOT NULL,
  country text NOT NULL,
  city text,
  job_title text,
  structure text,
  client_type text NOT NULL,
  client_type_other text,
  website text,
  sender_id text NOT NULL,
  sample_message text,
  package_slug text,
  id_document_type text,
  is_legal_representative boolean NOT NULL DEFAULT true,
  representative jsonb NOT NULL DEFAULT '{}'::jsonb,
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  gdpr_consent_at timestamptz,
  certified_at timestamptz,
  documents_validation_status text NOT NULL DEFAULT 'pending'
    CHECK (documents_validation_status IN ('pending','valid','rejected')),
  documents_checked_at timestamptz,
  tracking_code uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX signup_applications_user_id_idx ON public.signup_applications(user_id);
CREATE INDEX signup_applications_status_idx ON public.signup_applications(status);
CREATE INDEX signup_applications_documents_validation_idx ON public.signup_applications(documents_validation_status);
CREATE UNIQUE INDEX signup_applications_tracking_code_key ON public.signup_applications(tracking_code);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signup_applications TO authenticated;
GRANT ALL ON public.signup_applications TO service_role;
ALTER TABLE public.signup_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own application read" ON public.signup_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "own application insert" ON public.signup_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own application update" ON public.signup_applications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (auth.uid() = user_id OR private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "admin application delete" ON public.signup_applications FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE TRIGGER signup_applications_updated_at BEFORE UPDATE ON public.signup_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.pricing_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_sms integer NOT NULL CHECK (min_sms > 0),
  max_sms integer CHECK (max_sms IS NULL OR max_sms >= min_sms),
  unit_price_fcfa integer NOT NULL CHECK (unit_price_fcfa > 0),
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (min_sms)
);
GRANT SELECT ON public.pricing_tiers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pricing_tiers TO authenticated;
GRANT ALL ON public.pricing_tiers TO service_role;
ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active pricing tiers" ON public.pricing_tiers FOR SELECT TO anon, authenticated
  USING (active = true OR private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Admins manage pricing tiers" ON public.pricing_tiers FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE TRIGGER trg_pricing_tiers_updated BEFORE UPDATE ON public.pricing_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.pricing_tiers (min_sms, max_sms, unit_price_fcfa, label, sort_order, active) VALUES
 (200, 999, 25, '200 à 999 SMS', 1, true),
 (1000, 9999, 20, '1 000 à 9 999 SMS', 2, true),
 (10000, 99999, 15, '10 000 à 99 999 SMS', 3, true),
 (100000, NULL, 12, '100 000 SMS et plus', 4, true);

CREATE TABLE public.sms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  category text NOT NULL DEFAULT 'general' CHECK (char_length(category) BETWEEN 1 AND 60),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_templates TO authenticated;
GRANT ALL ON public.sms_templates TO service_role;
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their SMS templates" ON public.sms_templates FOR ALL TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (user_id = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role));
CREATE TRIGGER trg_sms_templates_updated BEFORE UPDATE ON public.sms_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_type text NOT NULL,
  external_id text,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','processing','processed','retrying','failed')),
  attempt_count integer NOT NULL DEFAULT 1 CHECK (attempt_count > 0),
  latency_ms integer CHECK (latency_ms IS NULL OR latency_ms >= 0),
  error_message text,
  payload_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  next_retry_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.webhook_events TO authenticated;
GRANT ALL ON public.webhook_events TO service_role;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view webhook monitoring" ON public.webhook_events FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE TRIGGER trg_webhook_events_updated BEFORE UPDATE ON public.webhook_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.sms_delivery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.sms_messages(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL CHECK (attempt_number > 0),
  provider_status text NOT NULL,
  latency_ms integer CHECK (latency_ms IS NULL OR latency_ms >= 0),
  error_code text,
  error_message text,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, attempt_number)
);
GRANT SELECT ON public.sms_delivery_attempts TO authenticated;
GRANT ALL ON public.sms_delivery_attempts TO service_role;
ALTER TABLE public.sms_delivery_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their delivery attempts" ON public.sms_delivery_attempts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sms_messages sm WHERE sm.id = message_id
    AND (sm.user_id = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role))));

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  actor_label text,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view audit logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role));

CREATE POLICY "Public read news-media" ON storage.objects FOR SELECT USING (bucket_id = 'news-media');
CREATE POLICY "Admins upload news-media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'news-media' AND private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Admins update news-media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'news-media' AND private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Admins delete news-media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'news-media' AND private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "kyc own read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kyc-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR private.has_role(auth.uid(),'admin'::public.app_role)));
CREATE POLICY "kyc own insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "kyc own update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'kyc-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR private.has_role(auth.uid(),'admin'::public.app_role)))
  WITH CHECK (bucket_id = 'kyc-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR private.has_role(auth.uid(),'admin'::public.app_role)));
CREATE POLICY "kyc own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'kyc-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR private.has_role(auth.uid(),'admin'::public.app_role)));

CREATE OR REPLACE FUNCTION public.autopublish_news()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.news_posts
  SET status = 'published', updated_at = now()
  WHERE status = 'draft' AND published_at IS NOT NULL AND published_at <= now();
END; $$;
REVOKE ALL ON FUNCTION public.autopublish_news() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.autopublish_news() TO service_role;

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.pricing_tiers;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.webhook_events;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_delivery_attempts;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.signup_applications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;