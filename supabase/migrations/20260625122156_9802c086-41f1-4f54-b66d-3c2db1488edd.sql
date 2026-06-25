CREATE TABLE public.menu_permission_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_permission_presets TO authenticated;
GRANT ALL ON public.menu_permission_presets TO service_role;

ALTER TABLE public.menu_permission_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org presets"
  ON public.menu_permission_presets FOR SELECT
  TO authenticated
  USING (public.is_member_of_org(organization_id));

CREATE POLICY "Admins can insert org presets"
  ON public.menu_permission_presets FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role_in_org(auth.uid(), 'admin'::app_role, organization_id));

CREATE POLICY "Admins can update org presets"
  ON public.menu_permission_presets FOR UPDATE
  TO authenticated
  USING (public.has_role_in_org(auth.uid(), 'admin'::app_role, organization_id))
  WITH CHECK (public.has_role_in_org(auth.uid(), 'admin'::app_role, organization_id));

CREATE POLICY "Admins can delete org presets"
  ON public.menu_permission_presets FOR DELETE
  TO authenticated
  USING (public.has_role_in_org(auth.uid(), 'admin'::app_role, organization_id));

CREATE TRIGGER update_menu_permission_presets_updated_at
  BEFORE UPDATE ON public.menu_permission_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();