CREATE OR REPLACE FUNCTION public.move_ticket_to_organization(_ticket_id uuid, _target_org uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _source_org uuid;
  _actor uuid := auth.uid();
  _is_super boolean := public.is_super_admin(_actor);
BEGIN
  IF _actor IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT organization_id INTO _source_org FROM public.tickets WHERE id = _ticket_id;
  IF _source_org IS NULL THEN
    RAISE EXCEPTION 'Chamado não encontrado';
  END IF;

  IF _source_org = _target_org THEN
    RAISE EXCEPTION 'O chamado já está nesta organização';
  END IF;

  IF NOT _is_super THEN
    IF NOT public.has_role_in_org(_actor, 'admin'::app_role, _source_org) THEN
      RAISE EXCEPTION 'Sem permissão para mover este chamado (origem)';
    END IF;
    IF NOT public.has_role_in_org(_actor, 'admin'::app_role, _target_org) THEN
      RAISE EXCEPTION 'Sem permissão para mover este chamado (destino)';
    END IF;
  END IF;

  UPDATE public.tickets
     SET organization_id = _target_org,
         updated_at = now()
   WHERE id = _ticket_id;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, organization_id, details)
  VALUES (
    _actor,
    'ticket_moved_org',
    'ticket',
    _ticket_id,
    _target_org,
    jsonb_build_object(
      'previous_organization_id', _source_org,
      'new_organization_id', _target_org
    )
  );
END;
$$;