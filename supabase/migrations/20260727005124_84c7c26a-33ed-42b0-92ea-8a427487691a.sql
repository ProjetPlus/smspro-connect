
-- =========================================================
-- 1. NEWS CATEGORIES
-- =========================================================
CREATE TABLE IF NOT EXISTS public.news_categories (
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

-- =========================================================
-- 2. NEWS POSTS: category + tags + search index
-- =========================================================
ALTER TABLE public.news_posts
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.news_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_news_posts_category ON public.news_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_news_posts_tags ON public.news_posts USING gin(tags);
-- Enable trigram then create trigram index
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_news_posts_title_trgm ON public.news_posts USING gin (title gin_trgm_ops);

-- =========================================================
-- 3. HERO SLIDES CMS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.hero_slides (
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

CREATE INDEX IF NOT EXISTS idx_hero_active_pos ON public.hero_slides(is_active, position);

-- =========================================================
-- 4. AUTO-PUBLISH scheduled news via pg_cron
-- =========================================================
CREATE OR REPLACE FUNCTION public.autopublish_news()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.news_posts
  SET status = 'published'
  WHERE status = 'draft'
    AND published_at IS NOT NULL
    AND published_at <= now();
$$;
REVOKE ALL ON FUNCTION public.autopublish_news() FROM PUBLIC, anon, authenticated;

-- Unschedule if exists (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('news-autopublish');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule('news-autopublish', '* * * * *', $$SELECT public.autopublish_news();$$);
