
CREATE TABLE public.api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  token text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can select api_tokens" ON public.api_tokens
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert api_tokens" ON public.api_tokens
  FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update api_tokens" ON public.api_tokens
  FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete api_tokens" ON public.api_tokens
  FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()));
