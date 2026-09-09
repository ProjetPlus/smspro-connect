
CREATE TABLE public.news_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at TIMESTAMPTZ,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.news_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.news_posts TO authenticated;
GRANT ALL ON public.news_posts TO service_role;

ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published news"
  ON public.news_posts FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can view all news"
  ON public.news_posts FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert news"
  ON public.news_posts FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update news"
  ON public.news_posts FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete news"
  ON public.news_posts FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_news_posts_updated_at
  BEFORE UPDATE ON public.news_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_news_posts_status_pub ON public.news_posts(status, published_at DESC);

-- Storage RLS for news-media bucket
CREATE POLICY "Public read news-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'news-media');

CREATE POLICY "Admins upload news-media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'news-media' AND private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update news-media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'news-media' AND private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete news-media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'news-media' AND private.has_role(auth.uid(), 'admin'));
