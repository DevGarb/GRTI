
-- Create organization_webhooks table
CREATE TABLE public.organization_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  secret TEXT,
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organization_webhooks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can view org webhooks"
ON public.organization_webhooks FOR SELECT TO authenticated
USING (
  (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE profiles.user_id = auth.uid()))
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can insert org webhooks"
ON public.organization_webhooks FOR INSERT TO authenticated
WITH CHECK (
  (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE profiles.user_id = auth.uid()))
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update org webhooks"
ON public.organization_webhooks FOR UPDATE TO authenticated
USING (
  (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE profiles.user_id = auth.uid()))
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete org webhooks"
ON public.organization_webhooks FOR DELETE TO authenticated
USING (
  (organization_id IN (SELECT profiles.organization_id FROM profiles WHERE profiles.user_id = auth.uid()))
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Updated_at trigger
CREATE TRIGGER update_organization_webhooks_updated_at
  BEFORE UPDATE ON public.organization_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
