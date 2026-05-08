
-- Helper expression embutido nas policies: admin OR tecnico OR desenvolvedor (super_admin já coberto pelo has_role)

-- op_maintenance_orders
DROP POLICY IF EXISTS "Staff manage maint orders" ON public.op_maintenance_orders;
CREATE POLICY "Staff manage maint orders" ON public.op_maintenance_orders
FOR ALL TO authenticated
USING (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role))))
WITH CHECK (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role))));

-- op_service_orders
DROP POLICY IF EXISTS "Staff manage service orders" ON public.op_service_orders;
CREATE POLICY "Staff manage service orders" ON public.op_service_orders
FOR ALL TO authenticated
USING (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role))))
WITH CHECK (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role))));

-- op_service_order_parts
DROP POLICY IF EXISTS "Staff manage so parts" ON public.op_service_order_parts;
CREATE POLICY "Staff manage so parts" ON public.op_service_order_parts
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM op_service_orders so WHERE so.id = service_order_id AND (is_super_admin(auth.uid()) OR (is_same_organization(so.organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role))))))
WITH CHECK (EXISTS (SELECT 1 FROM op_service_orders so WHERE so.id = service_order_id AND (is_super_admin(auth.uid()) OR (is_same_organization(so.organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role))))));

-- op_service_order_photos
DROP POLICY IF EXISTS "Staff manage so photos" ON public.op_service_order_photos;
CREATE POLICY "Staff manage so photos" ON public.op_service_order_photos
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM op_service_orders so WHERE so.id = service_order_id AND (is_super_admin(auth.uid()) OR (is_same_organization(so.organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role))))))
WITH CHECK (EXISTS (SELECT 1 FROM op_service_orders so WHERE so.id = service_order_id AND (is_super_admin(auth.uid()) OR (is_same_organization(so.organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role))))));

-- op_maintenance_photos
DROP POLICY IF EXISTS "Staff manage maint photos" ON public.op_maintenance_photos;
CREATE POLICY "Staff manage maint photos" ON public.op_maintenance_photos
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM op_maintenance_orders mo WHERE mo.id = maintenance_order_id AND (is_super_admin(auth.uid()) OR (is_same_organization(mo.organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role))))))
WITH CHECK (EXISTS (SELECT 1 FROM op_maintenance_orders mo WHERE mo.id = maintenance_order_id AND (is_super_admin(auth.uid()) OR (is_same_organization(mo.organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role))))));

-- op_deliveries
DROP POLICY IF EXISTS "Staff manage deliveries" ON public.op_deliveries;
CREATE POLICY "Staff manage deliveries" ON public.op_deliveries
FOR ALL TO authenticated
USING (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role))))
WITH CHECK (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role))));

-- op_companies
DROP POLICY IF EXISTS "Staff manage companies" ON public.op_companies;
CREATE POLICY "Staff manage companies" ON public.op_companies
FOR ALL TO authenticated
USING (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role))))
WITH CHECK (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role))));

-- op_drivers
DROP POLICY IF EXISTS "Staff manage drivers" ON public.op_drivers;
CREATE POLICY "Staff manage drivers" ON public.op_drivers
FOR ALL TO authenticated
USING (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role))))
WITH CHECK (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role))));

-- op_vehicles
DROP POLICY IF EXISTS "Staff manage vehicles" ON public.op_vehicles;
CREATE POLICY "Staff manage vehicles" ON public.op_vehicles
FOR ALL TO authenticated
USING (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role))))
WITH CHECK (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role))));

-- op_mechanics
DROP POLICY IF EXISTS "Staff manage mechanics" ON public.op_mechanics;
CREATE POLICY "Staff manage mechanics" ON public.op_mechanics
FOR ALL TO authenticated
USING (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role))))
WITH CHECK (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role))));

-- op_parts
DROP POLICY IF EXISTS "Staff manage parts" ON public.op_parts;
CREATE POLICY "Staff manage parts" ON public.op_parts
FOR ALL TO authenticated
USING (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role))))
WITH CHECK (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role))));

-- op_sites
DROP POLICY IF EXISTS "Staff manage sites" ON public.op_sites;
CREATE POLICY "Staff manage sites" ON public.op_sites
FOR ALL TO authenticated
USING (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role))))
WITH CHECK (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role))));

-- op_checklist_templates
DROP POLICY IF EXISTS "Staff manage checklist tpl" ON public.op_checklist_templates;
CREATE POLICY "Staff manage checklist tpl" ON public.op_checklist_templates
FOR ALL TO authenticated
USING (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role))))
WITH CHECK (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role))));

-- op_checklist_items
DROP POLICY IF EXISTS "Staff manage checklist items" ON public.op_checklist_items;
CREATE POLICY "Staff manage checklist items" ON public.op_checklist_items
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM op_checklist_templates t WHERE t.id = template_id AND (is_super_admin(auth.uid()) OR (is_same_organization(t.organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role))))))
WITH CHECK (EXISTS (SELECT 1 FROM op_checklist_templates t WHERE t.id = template_id AND (is_super_admin(auth.uid()) OR (is_same_organization(t.organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role))))));

-- op_checklist_executions
DROP POLICY IF EXISTS "Staff manage checklist exec" ON public.op_checklist_executions;
CREATE POLICY "Staff manage checklist exec" ON public.op_checklist_executions
FOR ALL TO authenticated
USING (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role))))
WITH CHECK (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role))));

-- op_card_notes
DROP POLICY IF EXISTS "Staff insert card notes" ON public.op_card_notes;
CREATE POLICY "Staff insert card notes" ON public.op_card_notes
FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND (is_super_admin(auth.uid()) OR (is_same_organization(organization_id) AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role)))));
