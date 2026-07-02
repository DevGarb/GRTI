
CREATE OR REPLACE FUNCTION public.sync_started_at(_ticket_id uuid, _new_started_at timestamptz)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_closed_at timestamptz;
  v_old timestamptz;
  v_uid uuid := auth.uid();
BEGIN
  IF NOT (public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'super_admin')) THEN
    RAISE EXCEPTION 'Apenas administradores podem editar o início do atendimento';
  END IF;

  SELECT started_at, closed_at INTO v_old, v_closed_at FROM public.tickets WHERE id = _ticket_id;

  IF _new_started_at IS NOT NULL AND v_closed_at IS NOT NULL AND _new_started_at > v_closed_at THEN
    RAISE EXCEPTION 'O início do atendimento não pode ser posterior ao fechamento do chamado (%).', v_closed_at;
  END IF;

  UPDATE public.tickets SET started_at = _new_started_at WHERE id = _ticket_id;

  -- Sincroniza o evento "Em Andamento" mais recente
  IF _new_started_at IS NOT NULL THEN
    UPDATE public.ticket_history
    SET created_at = _new_started_at
    WHERE id = (
      SELECT id FROM public.ticket_history
      WHERE ticket_id = _ticket_id
        AND action = 'status_change'
        AND new_value = 'Em Andamento'
      ORDER BY created_at DESC
      LIMIT 1
    );
  END IF;

  INSERT INTO public.ticket_history (ticket_id, user_id, action, old_value, new_value)
  VALUES (
    _ticket_id, v_uid, 'started_at_change',
    COALESCE(v_old::text, '—'),
    COALESCE(_new_started_at::text, '—')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_started_at(uuid, timestamptz) TO authenticated;
