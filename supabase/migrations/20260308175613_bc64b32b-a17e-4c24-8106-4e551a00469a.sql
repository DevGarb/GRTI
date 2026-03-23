
-- Allow super_admin and admins to insert organizations
CREATE POLICY "Super admins can insert organizations"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow super_admin to delete organizations
CREATE POLICY "Super admins can delete organizations"
  ON public.organizations FOR DELETE
  TO authenticated
  USING (public.is_super_admin(auth.uid()));
