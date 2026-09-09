-- 1. Analytics: no direct client inserts (server function uses service role)
DROP POLICY IF EXISTS "Anyone can record analytics events" ON public.analytics_events;
REVOKE INSERT, SELECT, UPDATE, DELETE ON public.analytics_events FROM anon;
REVOKE INSERT ON public.analytics_events FROM authenticated;
GRANT ALL ON public.analytics_events TO service_role;

-- 2. Contact submissions: no direct client inserts (server function uses service role)
DROP POLICY IF EXISTS "Anyone can submit a contact form" ON public.contact_submissions;
REVOKE INSERT, SELECT, UPDATE, DELETE ON public.contact_submissions FROM anon;
REVOKE INSERT ON public.contact_submissions FROM authenticated;
GRANT ALL ON public.contact_submissions TO service_role;

-- 3. Campaigns: ensure anon has no access at all
REVOKE ALL ON public.campaigns FROM anon;
DROP POLICY IF EXISTS "Users manage own campaigns" ON public.campaigns;
CREATE POLICY "Users manage own campaigns" ON public.campaigns
  FOR ALL TO authenticated
  USING ((auth.uid() = user_id) OR private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK ((auth.uid() = user_id) OR private.has_role(auth.uid(), 'admin'::app_role));

-- 4. Storage: remove public read on news-media (app uses signed URLs)
DROP POLICY IF EXISTS "Public read news-media" ON storage.objects;