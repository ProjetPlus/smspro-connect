CREATE POLICY "kyc own read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kyc-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR private.has_role(auth.uid(),'admin'::app_role)));
CREATE POLICY "kyc own insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "kyc own update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'kyc-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR private.has_role(auth.uid(),'admin'::app_role)))
  WITH CHECK (bucket_id = 'kyc-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR private.has_role(auth.uid(),'admin'::app_role)));
CREATE POLICY "kyc own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'kyc-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR private.has_role(auth.uid(),'admin'::app_role)));