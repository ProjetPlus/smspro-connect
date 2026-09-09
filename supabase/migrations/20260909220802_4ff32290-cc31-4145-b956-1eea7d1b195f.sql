-- 1) Les tarifs n'ont pas besoin du temps réel : on retire la table de la publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.pricing_tiers;

-- 2) Durcissement des politiques de lecture des tables diffusées en temps réel
DROP POLICY IF EXISTS "Users see own sms" ON public.sms_messages;
CREATE POLICY "Users see own sms" ON public.sms_messages
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins full access" ON public.sms_messages;
CREATE POLICY "Admins full access" ON public.sms_messages
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins full access" ON public.analytics_events;
CREATE POLICY "Admins full access" ON public.analytics_events
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins full access" ON public.contact_submissions;
CREATE POLICY "Admins full access" ON public.contact_submissions
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
