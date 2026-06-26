
ALTER TABLE public.patrimonio_history ADD COLUMN IF NOT EXISTS reason text;

CREATE OR REPLACE FUNCTION public.log_patrimonio_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  actor uuid := auth.uid();
  v_reason text := NULLIF(current_setting('app.transfer_reason', true), '');
BEGIN
  IF NEW.responsible IS DISTINCT FROM OLD.responsible THEN
    INSERT INTO public.patrimonio_history (patrimonio_id, organization_id, changed_by, field, old_value, new_value, reason)
    VALUES (NEW.id, NEW.organization_id, actor, 'responsible', OLD.responsible, NEW.responsible, v_reason);
  END IF;
  IF NEW.sector IS DISTINCT FROM OLD.sector THEN
    INSERT INTO public.patrimonio_history (patrimonio_id, organization_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, NEW.organization_id, actor, 'sector', OLD.sector, NEW.sector);
  END IF;
  IF NEW.location IS DISTINCT FROM OLD.location THEN
    INSERT INTO public.patrimonio_history (patrimonio_id, organization_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, NEW.organization_id, actor, 'location', OLD.location, NEW.location);
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.patrimonio_history (patrimonio_id, organization_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, NEW.organization_id, actor, 'status', OLD.status, NEW.status);
  END IF;
  -- Limpar para próximas transações da mesma sessão
  PERFORM set_config('app.transfer_reason', '', true);
  RETURN NEW;
END;
$$;

-- RPC para transferir responsável com motivo (registra reason no histórico)
CREATE OR REPLACE FUNCTION public.transfer_patrimonio_responsible(
  _patrimonio_id uuid,
  _new_responsible text,
  _reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _org uuid;
BEGIN
  SELECT organization_id INTO _org FROM public.patrimonio WHERE id = _patrimonio_id;
  IF _org IS NOT NULL AND NOT (public.is_super_admin(auth.uid()) OR public.is_same_organization(_org)) THEN
    RAISE EXCEPTION 'Sem permissão para transferir este patrimônio';
  END IF;

  PERFORM set_config('app.transfer_reason', COALESCE(_reason, ''), true);
  UPDATE public.patrimonio
    SET responsible = _new_responsible,
        updated_at = now()
    WHERE id = _patrimonio_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_patrimonio_responsible(uuid, text, text) TO authenticated;
