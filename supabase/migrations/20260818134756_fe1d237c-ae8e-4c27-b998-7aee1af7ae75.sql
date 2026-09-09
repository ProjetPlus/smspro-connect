DROP POLICY IF EXISTS "kyc own read" ON storage.objects;
DROP POLICY IF EXISTS "kyc own insert" ON storage.objects;
DROP POLICY IF EXISTS "kyc own update" ON storage.objects;
DROP POLICY IF EXISTS "kyc own delete" ON storage.objects;
DROP POLICY IF EXISTS "kyc admin all" ON storage.objects;
DROP POLICY IF EXISTS "news media read" ON storage.objects;
DROP POLICY IF EXISTS "news media admin write" ON storage.objects;

CREATE POLICY "kyc own read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "kyc own insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "kyc own update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "kyc own delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "kyc admin all" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'kyc-documents' AND private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'kyc-documents' AND private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "news media read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'news-media');

CREATE POLICY "news media admin write" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'news-media' AND private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (bucket_id = 'news-media' AND private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audience text NOT NULL DEFAULT 'admin',
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'signup',
  title text NOT NULL,
  body text,
  link text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications admin all" ON public.notifications;
CREATE POLICY "notifications admin all" ON public.notifications FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "notifications own read" ON public.notifications;
CREATE POLICY "notifications own read" ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS notifications_created_idx ON public.notifications (created_at DESC);