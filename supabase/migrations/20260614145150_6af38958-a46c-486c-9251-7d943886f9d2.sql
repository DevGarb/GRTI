
-- 1) notifications INSERT
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;
CREATE POLICY "Users insert own notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 2) ticket_history INSERT
DROP POLICY IF EXISTS "Authenticated users can insert history" ON public.ticket_history;
CREATE POLICY "Users insert history on accessible tickets"
  ON public.ticket_history FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_history.ticket_id
        AND (
          is_super_admin(auth.uid())
          OR t.created_by = auth.uid()
          OR t.assigned_to = auth.uid()
          OR ((has_role(auth.uid(),'admin'::app_role)
               OR has_role(auth.uid(),'tecnico'::app_role)
               OR has_role(auth.uid(),'desenvolvedor'::app_role))
              AND is_same_organization(t.organization_id))
        )
    )
  );

-- 3) ticket_comments SELECT
DROP POLICY IF EXISTS "Users can view comments on their tickets or admins/technicians" ON public.ticket_comments;
CREATE POLICY "Users view comments scoped by org or ownership"
  ON public.ticket_comments FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_comments.ticket_id
        AND is_same_organization(t.organization_id)
        AND (
          is_public = true
          OR t.created_by = auth.uid()
          OR t.assigned_to = auth.uid()
          OR has_role(auth.uid(),'admin'::app_role)
          OR has_role(auth.uid(),'tecnico'::app_role)
          OR has_role(auth.uid(),'desenvolvedor'::app_role)
        )
    )
  );

-- 4) profiles SELECT
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
CREATE POLICY "Users view own or same-org profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_super_admin(auth.uid())
    OR (organization_id IS NOT NULL AND is_same_organization(organization_id))
  );

-- 5) organizations SELECT
DROP POLICY IF EXISTS "Users can view organizations" ON public.organizations;
CREATE POLICY "Users view their organizations"
  ON public.organizations FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR is_member_of_org(id)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.organization_id = organizations.id)
  );

-- 6) Storage: attachments bucket
DROP POLICY IF EXISTS "Authenticated can read attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to attachments bucket" ON storage.objects;

CREATE POLICY "Attachments read scoped to ticket org"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'attachments'
    AND (
      is_super_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.tickets t
        WHERE split_part(storage.objects.name, '/', 1) = 'tickets'
          AND split_part(storage.objects.name, '/', 2)::uuid = t.id
          AND (
            t.created_by = auth.uid()
            OR t.assigned_to = auth.uid()
            OR ((has_role(auth.uid(),'admin'::app_role)
                 OR has_role(auth.uid(),'tecnico'::app_role)
                 OR has_role(auth.uid(),'desenvolvedor'::app_role))
                AND is_same_organization(t.organization_id))
          )
      )
    )
  );

CREATE POLICY "Attachments insert scoped to ticket org"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'attachments'
    AND (
      is_super_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.tickets t
        WHERE split_part(storage.objects.name, '/', 1) = 'tickets'
          AND split_part(storage.objects.name, '/', 2)::uuid = t.id
          AND (
            t.created_by = auth.uid()
            OR t.assigned_to = auth.uid()
            OR ((has_role(auth.uid(),'admin'::app_role)
                 OR has_role(auth.uid(),'tecnico'::app_role)
                 OR has_role(auth.uid(),'desenvolvedor'::app_role))
                AND is_same_organization(t.organization_id))
          )
      )
    )
  );

-- 7) Storage: op-service-orders bucket
DROP POLICY IF EXISTS "Auth delete op-service-orders" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete maint photos bucket" ON storage.objects;
DROP POLICY IF EXISTS "Auth update op-service-orders" ON storage.objects;
DROP POLICY IF EXISTS "Auth update maint photos bucket" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload op-service-orders" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload maint photos bucket" ON storage.objects;

CREATE POLICY "op-service-orders insert by op staff"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'op-service-orders'
    AND (
      is_super_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.op_service_orders so WHERE is_op_staff(so.organization_id) LIMIT 1
      )
    )
  );

CREATE POLICY "op-service-orders update by op staff"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'op-service-orders'
    AND (
      is_super_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.op_service_order_photos p
        JOIN public.op_service_orders so ON so.id = p.service_order_id
        WHERE p.photo_url LIKE '%' || storage.objects.name AND is_op_staff(so.organization_id)
      )
      OR EXISTS (
        SELECT 1 FROM public.op_maintenance_photos p
        JOIN public.op_maintenance_orders mo ON mo.id = p.maintenance_order_id
        WHERE p.photo_url LIKE '%' || storage.objects.name AND is_op_staff(mo.organization_id)
      )
    )
  );

CREATE POLICY "op-service-orders delete by op staff"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'op-service-orders'
    AND (
      is_super_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.op_service_order_photos p
        JOIN public.op_service_orders so ON so.id = p.service_order_id
        WHERE p.photo_url LIKE '%' || storage.objects.name AND is_op_staff(so.organization_id)
      )
      OR EXISTS (
        SELECT 1 FROM public.op_maintenance_photos p
        JOIN public.op_maintenance_orders mo ON mo.id = p.maintenance_order_id
        WHERE p.photo_url LIKE '%' || storage.objects.name AND is_op_staff(mo.organization_id)
      )
    )
  );

-- 8) Revoke EXECUTE from anon on SECURITY DEFINER functions in public.
REVOKE EXECUTE ON FUNCTION public.audit_logs_set_org() FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_org_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_executive_overview(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_management_metrics(timestamptz, timestamptz, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_org_technicians() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role_in_org(uuid, app_role, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_member_of_org(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_op_staff(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_same_organization(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_staff_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_patrimonio_changes() FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_patrimonio_insert() FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_user_todo_changes() FROM anon;
REVOKE EXECUTE ON FUNCTION public.move_ticket_to_organization(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_ticket_comment() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_ticket_insert() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_ticket_update() FROM anon;
REVOKE EXECUTE ON FUNCTION public.protect_super_admin_profile() FROM anon;
REVOKE EXECUTE ON FUNCTION public.protect_super_admin_role() FROM anon;
