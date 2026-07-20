
CREATE TABLE public.op_maintenance_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_order_id UUID NOT NULL REFERENCES public.op_maintenance_orders(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  rated_by_type TEXT NOT NULL CHECK (rated_by_type IN ('solicitante','admin','tecnico')),
  rated_by_name TEXT,
  rated_by_user UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_op_maintenance_ratings_unique ON public.op_maintenance_ratings(maintenance_order_id);
CREATE INDEX idx_op_maintenance_ratings_org ON public.op_maintenance_ratings(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_maintenance_ratings TO authenticated;
GRANT ALL ON public.op_maintenance_ratings TO service_role;

ALTER TABLE public.op_maintenance_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members see maint ratings of their org"
  ON public.op_maintenance_ratings FOR SELECT
  TO authenticated
  USING (public.is_member_of_org(organization_id));

CREATE POLICY "Members create maint ratings in their org"
  ON public.op_maintenance_ratings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_member_of_org(organization_id));

CREATE POLICY "Op staff manage maint ratings"
  ON public.op_maintenance_ratings FOR UPDATE
  TO authenticated
  USING (public.is_op_staff(organization_id))
  WITH CHECK (public.is_op_staff(organization_id));

CREATE POLICY "Op staff delete maint ratings"
  ON public.op_maintenance_ratings FOR DELETE
  TO authenticated
  USING (public.is_op_staff(organization_id));
