-- Audit trail for critical business operations.
-- Store changed column names only; never copy personal or message contents into the audit log.
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  resource text NOT NULL,
  resource_id text,
  changed_fields text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_resource_idx ON public.audit_logs (resource, created_at DESC);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.audit_logs TO service_role;

DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.capture_business_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_data jsonb;
  old_data jsonb;
  changed text[];
  key_name text;
  rid text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    row_data := to_jsonb(OLD);
    old_data := row_data;
  ELSIF TG_OP = 'UPDATE' THEN
    row_data := to_jsonb(NEW);
    old_data := to_jsonb(OLD);
  ELSE
    row_data := to_jsonb(NEW);
  END IF;

  rid := COALESCE(row_data ->> 'id', row_data ->> 'user_id', row_data ->> 'order_id');
  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(key) INTO changed
    FROM jsonb_each(row_data) AS n(key, value)
    WHERE old_data -> key IS DISTINCT FROM value;
  ELSIF TG_OP = 'INSERT' THEN
    SELECT array_agg(key) INTO changed FROM jsonb_object_keys(row_data) AS k(key);
  ELSE
    SELECT array_agg(key) INTO changed FROM jsonb_object_keys(old_data) AS k(key);
  END IF;

  INSERT INTO public.audit_logs(actor_id, action, resource, resource_id, changed_fields)
  VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, rid, COALESCE(changed, '{}'));

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS audit_orders_changes ON public.orders;
CREATE TRIGGER audit_orders_changes AFTER INSERT OR UPDATE OR DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.capture_business_audit();

DROP TRIGGER IF EXISTS audit_campaigns_changes ON public.campaigns;
CREATE TRIGGER audit_campaigns_changes AFTER INSERT OR UPDATE OR DELETE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.capture_business_audit();

DROP TRIGGER IF EXISTS audit_profiles_changes ON public.profiles;
CREATE TRIGGER audit_profiles_changes AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.capture_business_audit();

DROP TRIGGER IF EXISTS audit_user_roles_changes ON public.user_roles;
CREATE TRIGGER audit_user_roles_changes AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.capture_business_audit();
