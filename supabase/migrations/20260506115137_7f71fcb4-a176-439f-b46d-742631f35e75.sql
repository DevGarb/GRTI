CREATE TABLE public.user_menu_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  menu_key TEXT NOT NULL,
  granted BOOLEAN NOT NULL,
  organization_id UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, menu_key)
);

CREATE INDEX idx_user_menu_overrides_user ON public.user_menu_overrides(user_id);

ALTER TABLE public.user_menu_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own menu overrides"
ON public.user_menu_overrides FOR SELECT TO authenticated
USING (user_id = auth.uid() OR is_super_admin(auth.uid()) OR (has_role(auth.uid(), 'admin'::app_role) AND is_same_organization(organization_id)));

CREATE POLICY "Admins can insert menu overrides"
ON public.user_menu_overrides FOR INSERT TO authenticated
WITH CHECK (is_super_admin(auth.uid()) OR (has_role(auth.uid(), 'admin'::app_role) AND is_same_organization(organization_id)));

CREATE POLICY "Admins can update menu overrides"
ON public.user_menu_overrides FOR UPDATE TO authenticated
USING (is_super_admin(auth.uid()) OR (has_role(auth.uid(), 'admin'::app_role) AND is_same_organization(organization_id)))
WITH CHECK (is_super_admin(auth.uid()) OR (has_role(auth.uid(), 'admin'::app_role) AND is_same_organization(organization_id)));

CREATE POLICY "Admins can delete menu overrides"
ON public.user_menu_overrides FOR DELETE TO authenticated
USING (is_super_admin(auth.uid()) OR (has_role(auth.uid(), 'admin'::app_role) AND is_same_organization(organization_id)));

CREATE TRIGGER update_user_menu_overrides_updated_at
BEFORE UPDATE ON public.user_menu_overrides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();