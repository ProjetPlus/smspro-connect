-- 1. Purge des données de démonstration / simulation
DELETE FROM public.sms_messages;
DELETE FROM public.campaign_executions;
DELETE FROM public.campaigns;
DELETE FROM public.orders;
DELETE FROM public.analytics_events;
DELETE FROM public.contact_submissions;
DELETE FROM public.api_keys WHERE user_id IN (SELECT id FROM public.profiles WHERE email LIKE 'sim%@smsmobilepro.com');
DELETE FROM public.user_roles WHERE user_id IN (SELECT id FROM public.profiles WHERE email LIKE 'sim%@smsmobilepro.com');
DELETE FROM public.profiles WHERE email LIKE 'sim%@smsmobilepro.com';

-- 2. Packs SMS réels (grille tarifaire officielle)
DELETE FROM public.packages;
INSERT INTO public.packages (slug, name, price_fcfa, sms_volume, features, featured, active, sort_order) VALUES
 ('decouverte','Découverte', 12500, 500, '["25 FCFA / SMS","Nom d''expéditeur personnalisé","Support email","Rapports de livraison"]'::jsonb, false, true, 1),
 ('standard','Standard', 20000, 1000, '["20 FCFA / SMS","Nom d''expéditeur personnalisé","API REST","Support prioritaire"]'::jsonb, true, true, 2),
 ('business','Business', 150000, 10000, '["15 FCFA / SMS","API REST + Webhooks","Campagnes récurrentes","Support dédié"]'::jsonb, false, true, 3),
 ('entreprise','Entreprise', 1200000, 100000, '["12 FCFA / SMS","Volume illimité","SLA garanti","Account manager dédié"]'::jsonb, false, true, 4);

-- 3. Paramètres système
CREATE TABLE public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings admin all" ON public.system_settings FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER system_settings_updated_at BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.system_settings (key, value) VALUES
 ('mock_mode', '{"sms": false, "payments": false}'::jsonb);

-- 4. Dossiers d'inscription (KYC)
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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX signup_applications_user_id_idx ON public.signup_applications(user_id);
CREATE INDEX signup_applications_status_idx ON public.signup_applications(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signup_applications TO authenticated;
GRANT ALL ON public.signup_applications TO service_role;
ALTER TABLE public.signup_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own application read" ON public.signup_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "own application insert" ON public.signup_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own application update" ON public.signup_applications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR private.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admin application delete" ON public.signup_applications FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER signup_applications_updated_at BEFORE UPDATE ON public.signup_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();