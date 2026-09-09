DROP POLICY IF EXISTS "news media read" ON storage.objects;
CREATE POLICY "news media admin read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'news-media' AND private.has_role(auth.uid(), 'admin'::app_role));