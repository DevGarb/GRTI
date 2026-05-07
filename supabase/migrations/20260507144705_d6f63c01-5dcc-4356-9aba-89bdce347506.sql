
-- user_organizations: multi-org membership
CREATE TABLE public.user_organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memberships" ON public.user_organizations
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_super_admin(auth.uid()) OR (has_role(auth.uid(),'admin') AND is_same_organization(organization_id)));
CREATE POLICY "Admins manage memberships" ON public.user_organizations
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR (has_role(auth.uid(),'admin') AND is_same_organization(organization_id)))
  WITH CHECK (is_super_admin(auth.uid()) OR (has_role(auth.uid(),'admin') AND is_same_organization(organization_id)));

-- Backfill from current profiles
INSERT INTO public.user_organizations (user_id, organization_id)
SELECT user_id, organization_id FROM public.profiles
WHERE organization_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- op_companies
CREATE TABLE public.op_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.op_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View org companies" ON public.op_companies FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR is_same_organization(organization_id));
CREATE POLICY "Staff manage companies" ON public.op_companies FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'tecnico'))))
  WITH CHECK (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'tecnico'))));
CREATE TRIGGER trg_op_companies_updated BEFORE UPDATE ON public.op_companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- op_drivers
CREATE TABLE public.op_drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID,
  name TEXT NOT NULL,
  phone TEXT,
  default_vehicle_type TEXT NOT NULL DEFAULT 'Moto',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.op_drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View org drivers" ON public.op_drivers FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR is_same_organization(organization_id));
CREATE POLICY "Staff manage drivers" ON public.op_drivers FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'tecnico'))))
  WITH CHECK (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'tecnico'))));
CREATE TRIGGER trg_op_drivers_updated BEFORE UPDATE ON public.op_drivers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- op_vehicles
CREATE TABLE public.op_vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  plate TEXT NOT NULL,
  model TEXT,
  vehicle_type TEXT NOT NULL DEFAULT 'Moto',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.op_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View org vehicles" ON public.op_vehicles FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR is_same_organization(organization_id));
CREATE POLICY "Staff manage vehicles" ON public.op_vehicles FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'tecnico'))))
  WITH CHECK (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'tecnico'))));
CREATE TRIGGER trg_op_vehicles_updated BEFORE UPDATE ON public.op_vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- op_deliveries
CREATE TABLE public.op_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  company_id UUID,
  driver_id UUID,
  vehicle_id UUID,
  type TEXT NOT NULL DEFAULT 'Entrega',
  period TEXT NOT NULL DEFAULT 'Manhã',
  scheduled_date DATE NOT NULL,
  address TEXT,
  associated_name TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Pendente',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.op_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View org deliveries" ON public.op_deliveries FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR is_same_organization(organization_id));
CREATE POLICY "Staff manage deliveries" ON public.op_deliveries FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'tecnico'))))
  WITH CHECK (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'tecnico'))));
CREATE TRIGGER trg_op_deliveries_updated BEFORE UPDATE ON public.op_deliveries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_op_deliveries_org_date ON public.op_deliveries(organization_id, scheduled_date);
CREATE INDEX idx_op_deliveries_driver ON public.op_deliveries(driver_id);
