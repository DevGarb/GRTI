
-- 1) Helpers
CREATE OR REPLACE FUNCTION public.is_member_of_org(_org uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.organization_id = _org)
    OR EXISTS (SELECT 1 FROM public.user_organizations uo WHERE uo.user_id = auth.uid() AND uo.organization_id = _org);
$$;

CREATE OR REPLACE FUNCTION public.is_op_staff(_org uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.is_super_admin(auth.uid())
    OR (
      public.is_member_of_org(_org)
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin'::app_role,'tecnico'::app_role,'desenvolvedor'::app_role)
      )
    );
$$;

-- 2) Recriar policies em todas as tabelas op_*

-- op_service_orders
DROP POLICY IF EXISTS "Staff manage service orders" ON public.op_service_orders;
DROP POLICY IF EXISTS "View org service orders" ON public.op_service_orders;
CREATE POLICY "op_so_select" ON public.op_service_orders FOR SELECT TO authenticated USING (public.is_member_of_org(organization_id));
CREATE POLICY "op_so_insert" ON public.op_service_orders FOR INSERT TO authenticated WITH CHECK (public.is_op_staff(organization_id));
CREATE POLICY "op_so_update" ON public.op_service_orders FOR UPDATE TO authenticated USING (public.is_op_staff(organization_id)) WITH CHECK (public.is_op_staff(organization_id));
CREATE POLICY "op_so_delete" ON public.op_service_orders FOR DELETE TO authenticated USING (public.is_op_staff(organization_id));

-- op_service_order_parts
DROP POLICY IF EXISTS "Staff manage so parts" ON public.op_service_order_parts;
DROP POLICY IF EXISTS "View org so parts" ON public.op_service_order_parts;
CREATE POLICY "op_sop_select" ON public.op_service_order_parts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.op_service_orders so WHERE so.id = service_order_id AND public.is_member_of_org(so.organization_id)));
CREATE POLICY "op_sop_write" ON public.op_service_order_parts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.op_service_orders so WHERE so.id = service_order_id AND public.is_op_staff(so.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.op_service_orders so WHERE so.id = service_order_id AND public.is_op_staff(so.organization_id)));

-- op_service_order_photos
DROP POLICY IF EXISTS "Staff manage so photos" ON public.op_service_order_photos;
DROP POLICY IF EXISTS "View org so photos" ON public.op_service_order_photos;
CREATE POLICY "op_soph_select" ON public.op_service_order_photos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.op_service_orders so WHERE so.id = service_order_id AND public.is_member_of_org(so.organization_id)));
CREATE POLICY "op_soph_write" ON public.op_service_order_photos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.op_service_orders so WHERE so.id = service_order_id AND public.is_op_staff(so.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.op_service_orders so WHERE so.id = service_order_id AND public.is_op_staff(so.organization_id)));

-- op_maintenance_orders
DROP POLICY IF EXISTS "Staff manage maint orders" ON public.op_maintenance_orders;
DROP POLICY IF EXISTS "View org maint orders" ON public.op_maintenance_orders;
CREATE POLICY "op_mo_select" ON public.op_maintenance_orders FOR SELECT TO authenticated USING (public.is_member_of_org(organization_id));
CREATE POLICY "op_mo_insert" ON public.op_maintenance_orders FOR INSERT TO authenticated WITH CHECK (public.is_op_staff(organization_id));
CREATE POLICY "op_mo_update" ON public.op_maintenance_orders FOR UPDATE TO authenticated USING (public.is_op_staff(organization_id)) WITH CHECK (public.is_op_staff(organization_id));
CREATE POLICY "op_mo_delete" ON public.op_maintenance_orders FOR DELETE TO authenticated USING (public.is_op_staff(organization_id));

-- op_maintenance_photos
DROP POLICY IF EXISTS "Staff manage maint photos" ON public.op_maintenance_photos;
DROP POLICY IF EXISTS "View org maint photos" ON public.op_maintenance_photos;
CREATE POLICY "op_moph_select" ON public.op_maintenance_photos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.op_maintenance_orders mo WHERE mo.id = maintenance_order_id AND public.is_member_of_org(mo.organization_id)));
CREATE POLICY "op_moph_write" ON public.op_maintenance_photos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.op_maintenance_orders mo WHERE mo.id = maintenance_order_id AND public.is_op_staff(mo.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.op_maintenance_orders mo WHERE mo.id = maintenance_order_id AND public.is_op_staff(mo.organization_id)));

-- op_deliveries
DROP POLICY IF EXISTS "Staff manage deliveries" ON public.op_deliveries;
DROP POLICY IF EXISTS "View org deliveries" ON public.op_deliveries;
CREATE POLICY "op_del_select" ON public.op_deliveries FOR SELECT TO authenticated USING (public.is_member_of_org(organization_id));
CREATE POLICY "op_del_insert" ON public.op_deliveries FOR INSERT TO authenticated WITH CHECK (public.is_op_staff(organization_id));
CREATE POLICY "op_del_update" ON public.op_deliveries FOR UPDATE TO authenticated USING (public.is_op_staff(organization_id)) WITH CHECK (public.is_op_staff(organization_id));
CREATE POLICY "op_del_delete" ON public.op_deliveries FOR DELETE TO authenticated USING (public.is_op_staff(organization_id));

-- op_companies
DROP POLICY IF EXISTS "Staff manage companies" ON public.op_companies;
DROP POLICY IF EXISTS "View org companies" ON public.op_companies;
CREATE POLICY "op_co_select" ON public.op_companies FOR SELECT TO authenticated USING (public.is_member_of_org(organization_id));
CREATE POLICY "op_co_write" ON public.op_companies FOR ALL TO authenticated USING (public.is_op_staff(organization_id)) WITH CHECK (public.is_op_staff(organization_id));

-- op_drivers
DROP POLICY IF EXISTS "Staff manage drivers" ON public.op_drivers;
DROP POLICY IF EXISTS "View org drivers" ON public.op_drivers;
CREATE POLICY "op_dr_select" ON public.op_drivers FOR SELECT TO authenticated USING (public.is_member_of_org(organization_id));
CREATE POLICY "op_dr_write" ON public.op_drivers FOR ALL TO authenticated USING (public.is_op_staff(organization_id)) WITH CHECK (public.is_op_staff(organization_id));

-- op_vehicles
DROP POLICY IF EXISTS "Staff manage vehicles" ON public.op_vehicles;
DROP POLICY IF EXISTS "View org vehicles" ON public.op_vehicles;
CREATE POLICY "op_ve_select" ON public.op_vehicles FOR SELECT TO authenticated USING (public.is_member_of_org(organization_id));
CREATE POLICY "op_ve_write" ON public.op_vehicles FOR ALL TO authenticated USING (public.is_op_staff(organization_id)) WITH CHECK (public.is_op_staff(organization_id));

-- op_mechanics
DROP POLICY IF EXISTS "Staff manage mechanics" ON public.op_mechanics;
DROP POLICY IF EXISTS "View org mechanics" ON public.op_mechanics;
CREATE POLICY "op_me_select" ON public.op_mechanics FOR SELECT TO authenticated USING (public.is_member_of_org(organization_id));
CREATE POLICY "op_me_write" ON public.op_mechanics FOR ALL TO authenticated USING (public.is_op_staff(organization_id)) WITH CHECK (public.is_op_staff(organization_id));

-- op_parts
DROP POLICY IF EXISTS "Staff manage parts" ON public.op_parts;
DROP POLICY IF EXISTS "View org parts" ON public.op_parts;
CREATE POLICY "op_pa_select" ON public.op_parts FOR SELECT TO authenticated USING (public.is_member_of_org(organization_id));
CREATE POLICY "op_pa_write" ON public.op_parts FOR ALL TO authenticated USING (public.is_op_staff(organization_id)) WITH CHECK (public.is_op_staff(organization_id));

-- op_sites
DROP POLICY IF EXISTS "Staff manage sites" ON public.op_sites;
DROP POLICY IF EXISTS "View org sites" ON public.op_sites;
CREATE POLICY "op_si_select" ON public.op_sites FOR SELECT TO authenticated USING (public.is_member_of_org(organization_id));
CREATE POLICY "op_si_write" ON public.op_sites FOR ALL TO authenticated USING (public.is_op_staff(organization_id)) WITH CHECK (public.is_op_staff(organization_id));

-- op_checklist_templates
DROP POLICY IF EXISTS "Staff manage checklist tpl" ON public.op_checklist_templates;
DROP POLICY IF EXISTS "View org checklist tpl" ON public.op_checklist_templates;
CREATE POLICY "op_ct_select" ON public.op_checklist_templates FOR SELECT TO authenticated USING (public.is_member_of_org(organization_id));
CREATE POLICY "op_ct_write" ON public.op_checklist_templates FOR ALL TO authenticated USING (public.is_op_staff(organization_id)) WITH CHECK (public.is_op_staff(organization_id));

-- op_checklist_items
DROP POLICY IF EXISTS "Staff manage checklist items" ON public.op_checklist_items;
DROP POLICY IF EXISTS "View org checklist items" ON public.op_checklist_items;
CREATE POLICY "op_ci_select" ON public.op_checklist_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.op_checklist_templates t WHERE t.id = template_id AND public.is_member_of_org(t.organization_id)));
CREATE POLICY "op_ci_write" ON public.op_checklist_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.op_checklist_templates t WHERE t.id = template_id AND public.is_op_staff(t.organization_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.op_checklist_templates t WHERE t.id = template_id AND public.is_op_staff(t.organization_id)));

-- op_checklist_executions
DROP POLICY IF EXISTS "Staff manage checklist exec" ON public.op_checklist_executions;
DROP POLICY IF EXISTS "View org checklist exec" ON public.op_checklist_executions;
CREATE POLICY "op_ce_select" ON public.op_checklist_executions FOR SELECT TO authenticated USING (public.is_member_of_org(organization_id));
CREATE POLICY "op_ce_write" ON public.op_checklist_executions FOR ALL TO authenticated USING (public.is_op_staff(organization_id)) WITH CHECK (public.is_op_staff(organization_id));

-- op_card_notes
DROP POLICY IF EXISTS "Staff insert card notes" ON public.op_card_notes;
DROP POLICY IF EXISTS "View org card notes" ON public.op_card_notes;
DROP POLICY IF EXISTS "Author deletes own note" ON public.op_card_notes;
CREATE POLICY "op_cn_select" ON public.op_card_notes FOR SELECT TO authenticated USING (public.is_member_of_org(organization_id));
CREATE POLICY "op_cn_insert" ON public.op_card_notes FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.is_op_staff(organization_id));
CREATE POLICY "op_cn_delete" ON public.op_card_notes FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_super_admin(auth.uid()));
