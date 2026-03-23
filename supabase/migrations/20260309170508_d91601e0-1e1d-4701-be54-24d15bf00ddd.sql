
-- tickets: users see only their own (created or assigned), admins see all
DROP POLICY IF EXISTS "Authenticated users can view tickets" ON public.tickets;
CREATE POLICY "Users can view own tickets or admins all"
  ON public.tickets FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- evaluations: users see only evaluations for their tickets, admins see all
DROP POLICY IF EXISTS "Authenticated users can view evaluations" ON public.evaluations;
CREATE POLICY "Users can view own evaluations or admins all"
  ON public.evaluations FOR SELECT
  TO authenticated
  USING (
    evaluator_id = auth.uid()
    OR ticket_id IN (
      SELECT id FROM public.tickets
      WHERE created_by = auth.uid() OR assigned_to = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- preventive_maintenance: users see only their own, admins/technicians see all
DROP POLICY IF EXISTS "Authenticated users can view maintenance" ON public.preventive_maintenance;
CREATE POLICY "Users can view own maintenance or admins all"
  ON public.preventive_maintenance FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'tecnico'::app_role)
  );

-- ticket_attachments: users see only attachments for their tickets, admins see all
DROP POLICY IF EXISTS "Authenticated users can view attachments" ON public.ticket_attachments;
CREATE POLICY "Users can view own ticket attachments or admins all"
  ON public.ticket_attachments FOR SELECT
  TO authenticated
  USING (
    ticket_id IN (
      SELECT id FROM public.tickets
      WHERE created_by = auth.uid() OR assigned_to = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'tecnico'::app_role)
  );
