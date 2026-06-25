CREATE POLICY "Admins can delete ticket history"
ON public.ticket_history
FOR DELETE
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_history.ticket_id
      AND has_role_in_org(auth.uid(), 'admin'::app_role, t.organization_id)
  )
);