CREATE OR REPLACE FUNCTION public.invalidate_ticket_rework(_history_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_id uuid;
  v_ticket_org uuid;
  v_ticket_title text;
  v_created_by uuid;
  v_assigned_to uuid;
  v_old_value text;
  v_new_value text;
  v_rework_at timestamptz;
  v_actor uuid := auth.uid();
  v_short_id text;
  v_reason_clean text;
  v_body text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF _reason IS NULL OR length(trim(_reason)) < 3 THEN
    RAISE EXCEPTION 'Informe o motivo do não retrabalho';
  END IF;

  v_reason_clean := trim(_reason);

  SELECT h.ticket_id, h.old_value, h.new_value, h.created_at,
         t.organization_id, t.title, t.created_by, t.assigned_to
  INTO v_ticket_id, v_old_value, v_new_value, v_rework_at,
       v_ticket_org, v_ticket_title, v_created_by, v_assigned_to
  FROM public.ticket_history h
  JOIN public.tickets t ON t.id = h.ticket_id
  WHERE h.id = _history_id
    AND h.action = 'rework'
  FOR UPDATE;

  IF v_ticket_id IS NULL THEN
    RAISE EXCEPTION 'Marcação de retrabalho não encontrada ou já invalidada';
  END IF;

  IF NOT (
    public.is_super_admin(v_actor)
    OR public.has_role_in_org(v_actor, 'admin'::public.app_role, v_ticket_org)
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem invalidar retrabalho';
  END IF;

  UPDATE public.ticket_history
  SET action = 'rework_invalidated',
      old_value = v_old_value,
      new_value = concat(
        coalesce(v_new_value, ''),
        E'\n\nInvalidado como não retrabalho. Motivo: ',
        v_reason_clean
      )
  WHERE id = _history_id;

  INSERT INTO public.ticket_history (ticket_id, user_id, action, old_value, new_value)
  VALUES (v_ticket_id, v_actor, 'rework_removed', 'rework', concat('Não retrabalho: ', v_reason_clean));

  -- Comentário público no chamado explicando a invalidação
  v_body := concat(
    'A marcação de retrabalho de ',
    to_char(v_rework_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI'),
    ' foi invalidada pela administração.',
    E'\nMotivo: ',
    v_reason_clean
  );

  INSERT INTO public.ticket_comments (ticket_id, user_id, content, is_public)
  VALUES (v_ticket_id, v_actor, v_body, true);

  -- Notificações in-app
  v_short_id := substr(v_ticket_id::text, 1, 8);

  IF v_created_by IS NOT NULL AND v_created_by <> v_actor THEN
    INSERT INTO public.notifications (user_id, organization_id, type, title, body, ticket_id)
    VALUES (
      v_created_by, v_ticket_org, 'rework_invalidated',
      concat('Retrabalho invalidado — #', v_short_id),
      left(v_reason_clean, 300),
      v_ticket_id
    );
  END IF;

  IF v_assigned_to IS NOT NULL
     AND v_assigned_to <> v_actor
     AND v_assigned_to IS DISTINCT FROM v_created_by THEN
    INSERT INTO public.notifications (user_id, organization_id, type, title, body, ticket_id)
    VALUES (
      v_assigned_to, v_ticket_org, 'rework_invalidated',
      concat('Retrabalho invalidado — #', v_short_id),
      left(v_reason_clean, 300),
      v_ticket_id
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.invalidate_ticket_rework(uuid, text) TO authenticated;