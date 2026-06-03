DROP POLICY IF EXISTS "op_del_insert" ON public.op_deliveries;
CREATE POLICY "op_del_insert" ON public.op_deliveries
  FOR INSERT TO authenticated
  WITH CHECK (is_member_of_org(organization_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS "op_mo_insert" ON public.op_maintenance_orders;
CREATE POLICY "op_mo_insert" ON public.op_maintenance_orders
  FOR INSERT TO authenticated
  WITH CHECK (is_member_of_org(organization_id) AND created_by = auth.uid());