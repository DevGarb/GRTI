
-- 1) Tighten SELECT policy on ticket_comments: internal comments only for staff
DROP POLICY IF EXISTS "Users view comments scoped by org or ownership" ON public.ticket_comments;
DROP POLICY IF EXISTS "Users can view comments on their tickets or admins/technicians " ON public.ticket_comments;

CREATE POLICY "Users view comments scoped by org or ownership"
ON public.ticket_comments
FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_comments.ticket_id
        AND is_same_organization(t.organization_id)
        AND (
          -- Public comments: visible to ticket creator, assignee, staff
          (ticket_comments.is_public = true AND (
            t.created_by = auth.uid()
            OR t.assigned_to = auth.uid()
            OR has_role(auth.uid(), 'admin'::app_role)
            OR has_role(auth.uid(), 'tecnico'::app_role)
            OR has_role(auth.uid(), 'desenvolvedor'::app_role)
          ))
          -- Internal comments: only staff
          OR (ticket_comments.is_public = false AND (
            has_role(auth.uid(), 'admin'::app_role)
            OR has_role(auth.uid(), 'tecnico'::app_role)
            OR has_role(auth.uid(), 'desenvolvedor'::app_role)
          ))
        )
    )
  )
);

-- 2) Update notify_ticket_comment to skip ticket creator when comment is internal
CREATE OR REPLACE FUNCTION public.notify_ticket_comment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  t_record RECORD;
  is_internal boolean := (NEW.is_public IS DISTINCT FROM true);
BEGIN
  SELECT id, title, created_by, assigned_to, organization_id
    INTO t_record
  FROM public.tickets WHERE id = NEW.ticket_id;

  IF t_record.id IS NULL THEN RETURN NEW; END IF;

  -- Notify created_by ONLY for public comments
  IF NOT is_internal
     AND t_record.created_by IS NOT NULL
     AND t_record.created_by <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, organization_id, type, title, body, ticket_id)
    VALUES (t_record.created_by, t_record.organization_id, 'ticket_comment',
            'Novo comentário no chamado',
            COALESCE(t_record.title, 'Sem título'), t_record.id);
  END IF;

  -- Notify assigned_to (staff) for any comment, including internal
  IF t_record.assigned_to IS NOT NULL
     AND t_record.assigned_to <> NEW.user_id
     AND t_record.assigned_to <> COALESCE(t_record.created_by, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    INSERT INTO public.notifications (user_id, organization_id, type, title, body, ticket_id)
    VALUES (t_record.assigned_to, t_record.organization_id, 'ticket_comment',
            'Novo comentário no chamado',
            COALESCE(t_record.title, 'Sem título'), t_record.id);
  END IF;

  RETURN NEW;
END;
$function$;

-- 3) One-off cleanup: remove notifications for users with no relation to the ticket
DELETE FROM public.notifications n
WHERE n.ticket_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = n.ticket_id)
  AND NOT EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = n.ticket_id
      AND (
        t.created_by = n.user_id
        OR t.assigned_to = n.user_id
        OR public.is_super_admin(n.user_id)
        OR EXISTS (
          SELECT 1 FROM public.user_organization_roles uor
          WHERE uor.user_id = n.user_id
            AND uor.organization_id = t.organization_id
            AND uor.role IN ('admin'::app_role, 'tecnico'::app_role, 'desenvolvedor'::app_role)
        )
      )
  );
