
-- Sedes/Locais
CREATE TABLE public.op_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  address text,
  responsible text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.op_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View org sites" ON public.op_sites FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR is_same_organization(organization_id));
CREATE POLICY "Staff manage sites" ON public.op_sites FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'tecnico'))))
  WITH CHECK (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'tecnico'))));
CREATE TRIGGER trg_op_sites_updated BEFORE UPDATE ON public.op_sites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ordens de Manutenção
CREATE SEQUENCE IF NOT EXISTS op_maintenance_orders_om_number_seq START 1;
CREATE TABLE public.op_maintenance_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  om_number integer NOT NULL DEFAULT nextval('op_maintenance_orders_om_number_seq'),
  site_id uuid,
  category text NOT NULL DEFAULT 'Outros', -- Elétrica, Hidráulica, Civil, Ar-condicionado, Outros
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'Aberta', -- Aberta, Em execução, Concluída, Cancelada
  priority text NOT NULL DEFAULT 'Média', -- Baixa, Média, Alta, Urgente
  responsible text,
  deadline date,
  opened_at date NOT NULL DEFAULT CURRENT_DATE,
  finished_at date,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.op_maintenance_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View org maint orders" ON public.op_maintenance_orders FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR is_same_organization(organization_id));
CREATE POLICY "Staff manage maint orders" ON public.op_maintenance_orders FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'tecnico'))))
  WITH CHECK (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'tecnico'))));
CREATE TRIGGER trg_op_maint_orders_updated BEFORE UPDATE ON public.op_maintenance_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fotos das OMs
CREATE TABLE public.op_maintenance_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_order_id uuid NOT NULL,
  photo_url text NOT NULL,
  photo_type text NOT NULL DEFAULT 'antes', -- antes / depois
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.op_maintenance_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View org maint photos" ON public.op_maintenance_photos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM op_maintenance_orders mo WHERE mo.id = op_maintenance_photos.maintenance_order_id
    AND (is_super_admin(auth.uid()) OR is_same_organization(mo.organization_id))));
CREATE POLICY "Staff manage maint photos" ON public.op_maintenance_photos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM op_maintenance_orders mo WHERE mo.id = op_maintenance_photos.maintenance_order_id
    AND (is_super_admin(auth.uid()) OR (is_same_organization(mo.organization_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'tecnico'))))))
  WITH CHECK (EXISTS (SELECT 1 FROM op_maintenance_orders mo WHERE mo.id = op_maintenance_photos.maintenance_order_id
    AND (is_super_admin(auth.uid()) OR (is_same_organization(mo.organization_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'tecnico'))))));

-- Checklist Templates
CREATE TABLE public.op_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  site_id uuid,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.op_checklist_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View org checklist tpl" ON public.op_checklist_templates FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR is_same_organization(organization_id));
CREATE POLICY "Staff manage checklist tpl" ON public.op_checklist_templates FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'tecnico'))))
  WITH CHECK (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'tecnico'))));
CREATE TRIGGER trg_op_chk_tpl_updated BEFORE UPDATE ON public.op_checklist_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Itens dos Templates
CREATE TABLE public.op_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL,
  label text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.op_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View org checklist items" ON public.op_checklist_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM op_checklist_templates t WHERE t.id = op_checklist_items.template_id
    AND (is_super_admin(auth.uid()) OR is_same_organization(t.organization_id))));
CREATE POLICY "Staff manage checklist items" ON public.op_checklist_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM op_checklist_templates t WHERE t.id = op_checklist_items.template_id
    AND (is_super_admin(auth.uid()) OR (is_same_organization(t.organization_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'tecnico'))))))
  WITH CHECK (EXISTS (SELECT 1 FROM op_checklist_templates t WHERE t.id = op_checklist_items.template_id
    AND (is_super_admin(auth.uid()) OR (is_same_organization(t.organization_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'tecnico'))))));

-- Execuções de Checklist
CREATE TABLE public.op_checklist_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  template_id uuid NOT NULL,
  site_id uuid,
  executed_at date NOT NULL DEFAULT CURRENT_DATE,
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  executed_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.op_checklist_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View org checklist exec" ON public.op_checklist_executions FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR is_same_organization(organization_id));
CREATE POLICY "Staff manage checklist exec" ON public.op_checklist_executions FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'tecnico'))))
  WITH CHECK (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'tecnico'))));

-- Storage policies para o bucket op-service-orders (reutilizando para fotos de manutenção)
CREATE POLICY "Auth read maint photos bucket" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'op-service-orders');
CREATE POLICY "Auth upload maint photos bucket" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'op-service-orders');
CREATE POLICY "Auth update maint photos bucket" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'op-service-orders');
CREATE POLICY "Auth delete maint photos bucket" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'op-service-orders');
