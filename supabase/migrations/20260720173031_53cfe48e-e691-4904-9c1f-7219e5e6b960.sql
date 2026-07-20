
CREATE TABLE public.op_maint_technicians (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  specialty TEXT,
  user_id UUID,
  pin TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_maint_technicians TO authenticated;
GRANT ALL ON public.op_maint_technicians TO service_role;

ALTER TABLE public.op_maint_technicians ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read maint technicians"
ON public.op_maint_technicians FOR SELECT TO authenticated
USING (organization_id IN (SELECT uo.organization_id FROM public.user_organizations uo WHERE uo.user_id = auth.uid()));

CREATE POLICY "org admins manage maint technicians"
ON public.op_maint_technicians FOR ALL TO authenticated
USING (organization_id IN (SELECT uo.organization_id FROM public.user_organizations uo WHERE uo.user_id = auth.uid()))
WITH CHECK (organization_id IN (SELECT uo.organization_id FROM public.user_organizations uo WHERE uo.user_id = auth.uid()));

CREATE UNIQUE INDEX op_maint_technicians_pin_per_org
ON public.op_maint_technicians (organization_id, pin) WHERE pin IS NOT NULL;

CREATE TRIGGER update_op_maint_technicians_updated_at
BEFORE UPDATE ON public.op_maint_technicians
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.op_maintenance_orders
ADD COLUMN IF NOT EXISTS assigned_technician_id UUID REFERENCES public.op_maint_technicians(id) ON DELETE SET NULL;

-- Copy over any existing mechanic assignments into technicians so nothing is lost visually.
INSERT INTO public.op_maint_technicians (organization_id, name, phone, specialty, user_id, pin, is_active, created_by)
SELECT organization_id, name, phone, specialty, user_id, pin, COALESCE(is_active, true), created_by
FROM public.op_mechanics
WHERE id IN (SELECT DISTINCT assigned_mechanic_id FROM public.op_maintenance_orders WHERE assigned_mechanic_id IS NOT NULL)
ON CONFLICT DO NOTHING;
