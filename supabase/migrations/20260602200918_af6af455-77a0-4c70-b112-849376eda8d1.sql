-- Permitir colaboradores (membros da org) abrirem OS na org Operacional
DROP POLICY IF EXISTS op_so_insert ON public.op_service_orders;
CREATE POLICY op_so_insert ON public.op_service_orders
  FOR INSERT TO authenticated
  WITH CHECK (is_member_of_org(organization_id));

-- Peças: separar INSERT (qualquer membro) de UPDATE/DELETE (staff)
DROP POLICY IF EXISTS op_sop_write ON public.op_service_order_parts;
CREATE POLICY op_sop_insert ON public.op_service_order_parts
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.op_service_orders so
    WHERE so.id = op_service_order_parts.service_order_id
      AND is_member_of_org(so.organization_id)
  ));
CREATE POLICY op_sop_update ON public.op_service_order_parts
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.op_service_orders so
    WHERE so.id = op_service_order_parts.service_order_id
      AND is_op_staff(so.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.op_service_orders so
    WHERE so.id = op_service_order_parts.service_order_id
      AND is_op_staff(so.organization_id)
  ));
CREATE POLICY op_sop_delete ON public.op_service_order_parts
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.op_service_orders so
    WHERE so.id = op_service_order_parts.service_order_id
      AND is_op_staff(so.organization_id)
  ));

-- Fotos: mesmo desdobramento
DROP POLICY IF EXISTS op_soph_write ON public.op_service_order_photos;
CREATE POLICY op_soph_insert ON public.op_service_order_photos
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.op_service_orders so
    WHERE so.id = op_service_order_photos.service_order_id
      AND is_member_of_org(so.organization_id)
  ));
CREATE POLICY op_soph_update ON public.op_service_order_photos
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.op_service_orders so
    WHERE so.id = op_service_order_photos.service_order_id
      AND is_op_staff(so.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.op_service_orders so
    WHERE so.id = op_service_order_photos.service_order_id
      AND is_op_staff(so.organization_id)
  ));
CREATE POLICY op_soph_delete ON public.op_service_order_photos
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.op_service_orders so
    WHERE so.id = op_service_order_photos.service_order_id
      AND is_op_staff(so.organization_id)
  ));