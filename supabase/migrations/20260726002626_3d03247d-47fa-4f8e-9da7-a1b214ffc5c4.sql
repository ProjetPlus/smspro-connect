
-- 1. RGPD consent on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gdpr_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT false;

-- 2. Campaign scheduling / recurrence columns
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS recurrence text,           -- null | 'daily' | 'weekly' | 'monthly'
  ADD COLUMN IF NOT EXISTS recurrence_end timestamptz,
  ADD COLUMN IF NOT EXISTS next_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Africa/Abidjan';

CREATE INDEX IF NOT EXISTS idx_campaigns_next_run
  ON public.campaigns (next_run_at)
  WHERE status IN ('scheduled','recurring');

-- 3. Execution history
CREATE TABLE IF NOT EXISTS public.campaign_executions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
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

CREATE POLICY "Users see own executions" ON public.campaign_executions
  FOR SELECT USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins full access executions" ON public.campaign_executions
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_campaign_executions_campaign
  ON public.campaign_executions(campaign_id, run_at DESC);
