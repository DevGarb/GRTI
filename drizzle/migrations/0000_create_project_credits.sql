CREATE TABLE public.project_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  organization_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX idx_project_credits_project ON public.project_credits(project_id);
CREATE INDEX idx_project_credits_user ON public.project_credits(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_credits TO authenticated;
GRANT ALL ON public.project_credits TO service_role;

ALTER TABLE public.project_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view project credits"
ON public.project_credits FOR SELECT TO authenticated
USING (organization_id IS NULL OR public.is_member_of_org(organization_id));

CREATE POLICY "Staff can insert project credits"
ON public.project_credits FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'desenvolvedor')
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Staff can delete project credits"
ON public.project_credits FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'desenvolvedor')
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Staff can update project credits"
ON public.project_credits FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'desenvolvedor')
  OR public.is_super_admin(auth.uid())
);