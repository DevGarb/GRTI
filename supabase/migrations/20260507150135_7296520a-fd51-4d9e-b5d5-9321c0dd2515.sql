
-- Mechanics
CREATE TABLE public.op_mechanics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  phone text,
  specialty text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.op_mechanics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View org mechanics" ON public.op_mechanics FOR SELECT TO authenticated
USING (is_super_admin(auth.uid()) OR is_same_organization(organization_id));
CREATE POLICY "Staff manage mechanics" ON public.op_mechanics FOR ALL TO authenticated
USING (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role))))
WITH CHECK (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role))));
CREATE TRIGGER trg_op_mechanics_updated BEFORE UPDATE ON public.op_mechanics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Parts catalog
CREATE TABLE public.op_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  code text,
  default_price numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.op_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View org parts" ON public.op_parts FOR SELECT TO authenticated
USING (is_super_admin(auth.uid()) OR is_same_organization(organization_id));
CREATE POLICY "Staff manage parts" ON public.op_parts FOR ALL TO authenticated
USING (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role))))
WITH CHECK (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role))));
CREATE TRIGGER trg_op_parts_updated BEFORE UPDATE ON public.op_parts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Service Orders
CREATE TABLE public.op_service_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  os_number serial,
  company_id uuid,
  vehicle_id uuid,
  mechanic_id uuid,
  vehicle_plate text,
  vehicle_model text,
  description text,
  diagnosis text,
  status text NOT NULL DEFAULT 'Aberta',
  opened_at date NOT NULL DEFAULT CURRENT_DATE,
  finished_at date,
  total_cost numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.op_service_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View org service orders" ON public.op_service_orders FOR SELECT TO authenticated
USING (is_super_admin(auth.uid()) OR is_same_organization(organization_id));
CREATE POLICY "Staff manage service orders" ON public.op_service_orders FOR ALL TO authenticated
USING (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role))))
WITH CHECK (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role))));
CREATE TRIGGER trg_op_so_updated BEFORE UPDATE ON public.op_service_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_op_so_org_date ON public.op_service_orders(organization_id, opened_at DESC);

-- Service Order Parts
CREATE TABLE public.op_service_order_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid NOT NULL REFERENCES public.op_service_orders(id) ON DELETE CASCADE,
  part_id uuid,
  part_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.op_service_order_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View org so parts" ON public.op_service_order_parts FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.op_service_orders so WHERE so.id = service_order_id AND (is_super_admin(auth.uid()) OR is_same_organization(so.organization_id))));
CREATE POLICY "Staff manage so parts" ON public.op_service_order_parts FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.op_service_orders so WHERE so.id = service_order_id AND (is_super_admin(auth.uid()) OR (is_same_organization(so.organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role))))))
WITH CHECK (EXISTS (SELECT 1 FROM public.op_service_orders so WHERE so.id = service_order_id AND (is_super_admin(auth.uid()) OR (is_same_organization(so.organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role))))));

-- Service Order Photos
CREATE TABLE public.op_service_order_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid NOT NULL REFERENCES public.op_service_orders(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  photo_type text NOT NULL DEFAULT 'antes',
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.op_service_order_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View org so photos" ON public.op_service_order_photos FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.op_service_orders so WHERE so.id = service_order_id AND (is_super_admin(auth.uid()) OR is_same_organization(so.organization_id))));
CREATE POLICY "Staff manage so photos" ON public.op_service_order_photos FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.op_service_orders so WHERE so.id = service_order_id AND (is_super_admin(auth.uid()) OR (is_same_organization(so.organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role))))))
WITH CHECK (EXISTS (SELECT 1 FROM public.op_service_orders so WHERE so.id = service_order_id AND (is_super_admin(auth.uid()) OR (is_same_organization(so.organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role))))));

-- Storage bucket for OS photos
INSERT INTO storage.buckets (id, name, public) VALUES ('op-service-orders', 'op-service-orders', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read op-service-orders" ON storage.objects FOR SELECT
USING (bucket_id = 'op-service-orders');
CREATE POLICY "Auth upload op-service-orders" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'op-service-orders');
CREATE POLICY "Auth update op-service-orders" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'op-service-orders');
CREATE POLICY "Auth delete op-service-orders" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'op-service-orders');
