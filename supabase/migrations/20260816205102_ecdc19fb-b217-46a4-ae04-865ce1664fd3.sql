CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE SCHEMA IF NOT EXISTS private;

-- ========== ROLES ==========
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','client');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, anon, service_role;

CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Admins full access" ON public.user_roles FOR ALL
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- ========== PROFILES ==========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT,
  full_name TEXT,
  phone TEXT,
  company TEXT,
  sms_credits INTEGER NOT NULL DEFAULT 0,
  gdpr_consent_at TIMESTAMPTZ,
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX profiles_username_unique_idx ON public.profiles (lower(username)) WHERE username IS NOT NULL;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT
  USING (auth.uid() = id OR private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins full access" ON public.profiles FOR ALL
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  base_username text;
  final_username text;
BEGIN
  base_username := NULLIF(
    regexp_replace(lower(COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1))),'[^a-z0-9_]+','','g'),
    ''
  );
  final_username := COALESCE(base_username,'user') || '_' || substring(replace(NEW.id::text,'-','') from 1 for 8);

  INSERT INTO public.profiles (id, email, full_name, phone, company, username, gdpr_consent_at, marketing_consent)
  VALUES (
    NEW.id, NEW.email,
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

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'client') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $function$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========== PACKAGES ==========
CREATE TABLE public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price_fcfa INTEGER NOT NULL,
  sms_volume INTEGER NOT NULL,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  featured BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.packages TO anon, authenticated;
GRANT ALL ON public.packages TO service_role;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Packages are public" ON public.packages FOR SELECT TO anon, authenticated USING (active);
CREATE POLICY "Admins manage packages" ON public.packages FOR ALL
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));

INSERT INTO public.packages (slug, name, price_fcfa, sms_volume, features, featured, active, sort_order) VALUES
 ('decouverte','Découverte',12500,500,'["25 FCFA / SMS","Nom d''expéditeur personnalisé","Rapports de livraison"]'::jsonb,false,true,1),
 ('standard','Standard',20000,1000,'["20 FCFA / SMS","API REST","Support prioritaire"]'::jsonb,true,true,2),
 ('business','Business',150000,10000,'["15 FCFA / SMS","API REST + Webhooks","Campagnes récurrentes"]'::jsonb,false,true,3),
 ('entreprise','Entreprise',1200000,100000,'["12 FCFA / SMS","SLA garanti","Accompagnement dédié"]'::jsonb,false,true,4);

-- ========== ORDERS ==========
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.packages(id),
  amount_fcfa INTEGER NOT NULL,
  sms_volume INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT,
  provider_transaction_id TEXT,
  provider_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own orders" ON public.orders FOR SELECT
  USING (auth.uid() = user_id OR private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Users create own orders" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins full access" ON public.orders FOR ALL
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== CAMPAIGNS ==========
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  message TEXT NOT NULL,
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  recurrence TEXT,
  recurrence_end TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  timezone TEXT NOT NULL DEFAULT 'Africa/Abidjan',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_campaigns_next_run ON public.campaigns (next_run_at) WHERE status IN ('scheduled','recurring');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own campaigns" ON public.campaigns FOR ALL
  USING (auth.uid() = user_id OR private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (auth.uid() = user_id OR private.has_role(auth.uid(),'admin'::public.app_role));
CREATE TRIGGER trg_campaigns_updated BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== SMS MESSAGES ==========
CREATE TABLE public.sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  sender_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  provider_message_id TEXT,
  error TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sms_messages TO authenticated;
GRANT ALL ON public.sms_messages TO service_role;
ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own sms" ON public.sms_messages FOR SELECT
  USING (auth.uid() = user_id OR private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Admins full access" ON public.sms_messages FOR ALL
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE INDEX idx_sms_provider_id ON public.sms_messages (provider_message_id);
CREATE INDEX idx_sms_campaign ON public.sms_messages (campaign_id);

-- ========== CAMPAIGN EXECUTIONS ==========
CREATE TABLE public.campaign_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_at timestamptz NOT NULL DEFAULT now(),
  sent_count integer NOT NULL DEFAULT 0,
  delivered_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_executions TO authenticated;
GRANT ALL ON public.campaign_executions TO service_role;
ALTER TABLE public.campaign_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own executions" ON public.campaign_executions FOR SELECT
  USING (auth.uid() = user_id OR private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Admins full access executions" ON public.campaign_executions FOR ALL
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE INDEX idx_campaign_executions_campaign ON public.campaign_executions(campaign_id, run_at DESC);

-- ========== API KEYS ==========
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own api keys" ON public.api_keys FOR ALL
  USING (auth.uid() = user_id OR private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins full access" ON public.api_keys FOR ALL
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));

-- ========== CONTACT + ANALYTICS ==========
CREATE TABLE public.contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  source TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.contact_submissions TO anon, authenticated;
GRANT ALL ON public.contact_submissions TO service_role;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a contact form" ON public.contact_submissions FOR INSERT TO anon, authenticated
  WITH CHECK (length(name) BETWEEN 1 AND 200 AND length(email) BETWEEN 3 AND 320
    AND length(subject) BETWEEN 1 AND 200 AND length(message) BETWEEN 1 AND 5000);
CREATE POLICY "Admins full access" ON public.contact_submissions FOR ALL
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));

CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  session_id TEXT,
  page_url TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX analytics_events_event_name_idx ON public.analytics_events(event_name);
CREATE INDEX analytics_events_created_at_idx ON public.analytics_events(created_at DESC);
GRANT INSERT ON public.analytics_events TO anon, authenticated;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can record analytics events" ON public.analytics_events FOR INSERT TO anon, authenticated
  WITH CHECK (length(event_name) BETWEEN 1 AND 100);
CREATE POLICY "Admins full access" ON public.analytics_events FOR ALL
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));

-- ========== NEWS ==========
CREATE TABLE public.news_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.news_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.news_categories TO authenticated;
GRANT ALL ON public.news_categories TO service_role;
ALTER TABLE public.news_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cats public read" ON public.news_categories FOR SELECT USING (true);
CREATE POLICY "cats admin write" ON public.news_categories FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE TRIGGER trg_news_categories_updated BEFORE UPDATE ON public.news_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.news_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at TIMESTAMPTZ,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.news_categories(id) ON DELETE SET NULL,
  tags text[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.news_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.news_posts TO authenticated;
GRANT ALL ON public.news_posts TO service_role;
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view published news" ON public.news_posts FOR SELECT USING (status = 'published');
CREATE POLICY "Admins can view all news" ON public.news_posts FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Admins can insert news" ON public.news_posts FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Admins can update news" ON public.news_posts FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Admins can delete news" ON public.news_posts FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE TRIGGER update_news_posts_updated_at BEFORE UPDATE ON public.news_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_news_posts_status_pub ON public.news_posts(status, published_at DESC);
CREATE INDEX idx_news_posts_category ON public.news_posts(category_id);
CREATE INDEX idx_news_posts_tags ON public.news_posts USING gin(tags);
CREATE INDEX idx_news_posts_title_trgm ON public.news_posts USING gin (title extensions.gin_trgm_ops);

-- ========== HERO SLIDES ==========
CREATE TABLE public.hero_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_url text NOT NULL,
  eyebrow text NOT NULL DEFAULT '',
  title text NOT NULL,
  subtitle text,
  href text,
  cta text,
  kind text NOT NULL DEFAULT 'other' CHECK (kind IN ('sms','email','uemoa','news','money','other')),
  position integer NOT NULL DEFAULT 0,
  duration_ms integer NOT NULL DEFAULT 5000,
  pause_on_hover boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hero_slides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hero_slides TO authenticated;
GRANT ALL ON public.hero_slides TO service_role;
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hero public read active" ON public.hero_slides FOR SELECT USING (is_active = true);
CREATE POLICY "hero admin all" ON public.hero_slides FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE TRIGGER trg_hero_slides_updated BEFORE UPDATE ON public.hero_slides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_hero_active_pos ON public.hero_slides(is_active, position);

-- ========== SYSTEM SETTINGS ==========
CREATE TABLE public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings admin all" ON public.system_settings FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE TRIGGER system_settings_updated_at BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.system_settings (key, value) VALUES ('mock_mode','{"sms": false, "payments": false}'::jsonb);

-- ========== SIGNUP APPLICATIONS ==========
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

-- ========== PRICING TIERS ==========
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

-- ========== SMS TEMPLATES ==========
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

-- ========== WEBHOOK EVENTS ==========
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

-- ========== DELIVERY ATTEMPTS ==========
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

-- ========== AUDIT LOGS ==========
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

-- ========== STORAGE POLICIES ==========
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

-- ========== AUTOPUBLISH CRON ==========
CREATE OR REPLACE FUNCTION public.autopublish_news()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.news_posts
  SET status = 'published', updated_at = now()
  WHERE status = 'draft' AND published_at IS NOT NULL AND published_at <= now();
END; $$;
REVOKE ALL ON FUNCTION public.autopublish_news() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.autopublish_news() TO service_role;

-- ========== REALTIME ==========
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