CREATE TABLE public.assistant_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text,
  email text,
  phone text,
  country text,
  city text,
  interest text,
  status text NOT NULL DEFAULT 'new',
  notes text,
  message_count integer NOT NULL DEFAULT 0,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_leads TO authenticated;
GRANT ALL ON public.assistant_leads TO service_role;
ALTER TABLE public.assistant_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage assistant leads" ON public.assistant_leads FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_assistant_leads_updated BEFORE UPDATE ON public.assistant_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.assistant_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES public.assistant_leads(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_assistant_messages_session ON public.assistant_messages(session_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_messages TO authenticated;
GRANT ALL ON public.assistant_messages TO service_role;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage assistant messages" ON public.assistant_messages FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.assistant_knowledge (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  source text NOT NULL DEFAULT 'admin',
  active boolean NOT NULL DEFAULT true,
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_knowledge TO authenticated;
GRANT ALL ON public.assistant_knowledge TO service_role;
ALTER TABLE public.assistant_knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage assistant knowledge" ON public.assistant_knowledge FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_assistant_knowledge_updated BEFORE UPDATE ON public.assistant_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();