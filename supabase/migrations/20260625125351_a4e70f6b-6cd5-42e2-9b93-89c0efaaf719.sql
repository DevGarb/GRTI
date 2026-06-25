CREATE TABLE public.user_applied_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  preset_id uuid NOT NULL REFERENCES public.menu_permission_presets(id) ON DELETE CASCADE,
  applied_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_applied_presets TO authenticated;
GRANT ALL ON public.user_applied_presets TO service_role;

ALTER TABLE public.user_applied_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage applied presets in their org"
ON public.user_applied_presets
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.user_organization_roles uor
    WHERE uor.user_id = auth.uid()
      AND uor.organization_id = user_applied_presets.organization_id
      AND uor.role = 'admin'::app_role
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.user_organization_roles uor
    WHERE uor.user_id = auth.uid()
      AND uor.organization_id = user_applied_presets.organization_id
      AND uor.role = 'admin'::app_role
  )
);

CREATE POLICY "Users can see their own applied preset"
ON public.user_applied_presets
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER update_user_applied_presets_updated_at
BEFORE UPDATE ON public.user_applied_presets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();