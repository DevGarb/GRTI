CREATE OR REPLACE FUNCTION public.invalidate_ticket_rework(_history_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_id uuid;
  v_ticket_org uuid;
  v_old_value text;
  v_new_value text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF _reason IS NULL OR length(trim(_reason)) < 3 THEN
    RAISE EXCEPTION 'Informe o motivo do não retrabalho';
  END IF;

  SELECT h.ticket_id, h.old_value, h.new_value, t.organization_id
  INTO v_ticket_id, v_old_value, v_new_value, v_ticket_org
  FROM public.ticket_history h
  JOIN public.tickets t ON t.id = h.ticket_id
  WHERE h.id = _history_id
    AND h.action = 'rework'
  FOR UPDATE;

  IF v_ticket_id IS NULL THEN
    RAISE EXCEPTION 'Marcação de retrabalho não encontrada ou já invalidada';
  END IF;

  IF NOT (
    public.is_super_admin(auth.uid())
    OR public.has_role_in_org(auth.uid(), 'admin'::public.app_role, v_ticket_org)
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem invalidar retrabalho';
  END IF;

  UPDATE public.ticket_history
  SET action = 'rework_invalidated',
      old_value = v_old_value,
      new_value = concat(
        coalesce(v_new_value, ''),
        E'\n\nInvalidado como não retrabalho. Motivo: ',
        trim(_reason)
      )
  WHERE id = _history_id;

  INSERT INTO public.ticket_history (ticket_id, user_id, action, old_value, new_value)
  VALUES (v_ticket_id, auth.uid(), 'rework_removed', 'rework', concat('Não retrabalho: ', trim(_reason)));
END;
$$;

GRANT EXECUTE ON FUNCTION public.invalidate_ticket_rework(uuid, text) TO authenticated;