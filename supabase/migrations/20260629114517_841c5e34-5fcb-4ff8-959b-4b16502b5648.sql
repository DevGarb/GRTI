
-- 1) Tabela de histórico de sprints
CREATE TABLE IF NOT EXISTS public.sprint_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id uuid NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  project_id uuid,
  organization_id uuid,
  action text NOT NULL,
  from_status text,
  to_status text,
  score numeric,
  notes text,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sprint_history_sprint ON public.sprint_history(sprint_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sprint_history_org ON public.sprint_history(organization_id);

GRANT SELECT, INSERT ON public.sprint_history TO authenticated;
GRANT ALL ON public.sprint_history TO service_role;

ALTER TABLE public.sprint_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sprint history visible to org" ON public.sprint_history;
CREATE POLICY "Sprint history visible to org"
  ON public.sprint_history FOR SELECT
  TO authenticated
  USING (organization_id IS NULL OR public.is_same_organization(organization_id));

DROP POLICY IF EXISTS "Sprint history insert by org staff" ON public.sprint_history;
CREATE POLICY "Sprint history insert by org staff"
  ON public.sprint_history FOR INSERT
  TO authenticated
  WITH CHECK (organization_id IS NULL OR public.is_op_staff(organization_id));

-- 2) Trigger AFTER UPDATE em sprints para registrar mudanças de status
CREATE OR REPLACE FUNCTION public.sprints_log_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _project_id uuid;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT project_id INTO _project_id FROM public.sprints WHERE id = NEW.id;
    INSERT INTO public.sprint_history(sprint_id, project_id, organization_id, action, from_status, to_status, changed_by)
    VALUES (
      NEW.id,
      _project_id,
      NEW.organization_id,
      CASE NEW.status
        WHEN 'concluida' THEN 'close'
        WHEN 'ativa' THEN CASE WHEN OLD.status = 'concluida' THEN 'reopen' ELSE 'activate' END
        WHEN 'cancelada' THEN 'cancel'
        ELSE 'status_change'
      END,
      OLD.status,
      NEW.status,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sprints_status_history ON public.sprints;
CREATE TRIGGER trg_sprints_status_history
  AFTER UPDATE ON public.sprints
  FOR EACH ROW EXECUTE FUNCTION public.sprints_log_status_change();

-- 3) Atualizar close_sprint_with_checklist para registrar histórico com score/evidências
CREATE OR REPLACE FUNCTION public.close_sprint_with_checklist(
  _sprint_id uuid,
  _doc_ok boolean,
  _evidence_ok boolean,
  _homolog_ok boolean,
  _backlog_ok boolean,
  _standards_ok boolean,
  _evidences jsonb DEFAULT '{}'::jsonb
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  score numeric;
  _org uuid;
  _project uuid;
  _missing text[] := '{}';
BEGIN
  SELECT organization_id, project_id INTO _org, _project FROM public.sprints WHERE id = _sprint_id;
  IF _org IS NOT NULL AND NOT public.is_op_staff(_org) THEN
    RAISE EXCEPTION 'Sem permissão para fechar sprint';
  END IF;

  IF NOT (_doc_ok AND _evidence_ok AND _homolog_ok AND _backlog_ok AND _standards_ok) THEN
    RAISE EXCEPTION 'Todos os itens do checklist de qualidade técnica devem ser confirmados antes de encerrar a sprint';
  END IF;

  IF COALESCE(_evidences->>'doc_ok','') = '' THEN _missing := _missing || 'Documentação'; END IF;
  IF COALESCE(_evidences->>'evidence_ok','') = '' THEN _missing := _missing || 'Evidências'; END IF;
  IF COALESCE(_evidences->>'homolog_ok','') = '' THEN _missing := _missing || 'Homologação'; END IF;
  IF COALESCE(_evidences->>'backlog_ok','') = '' THEN _missing := _missing || 'Backlog'; END IF;
  IF COALESCE(_evidences->>'standards_ok','') = '' THEN _missing := _missing || 'Padrões técnicos'; END IF;

  IF array_length(_missing, 1) > 0 THEN
    RAISE EXCEPTION 'Anexe a evidência para: %', array_to_string(_missing, ', ');
  END IF;

  score := ((_doc_ok::int + _evidence_ok::int + _homolog_ok::int + _backlog_ok::int + _standards_ok::int) * 20)::numeric;

  INSERT INTO public.sprint_quality_checks(sprint_id, doc_ok, evidence_ok, homolog_ok, backlog_ok, standards_ok, evidences, checked_by)
  VALUES (_sprint_id, _doc_ok, _evidence_ok, _homolog_ok, _backlog_ok, _standards_ok, _evidences, auth.uid())
  ON CONFLICT (sprint_id) DO UPDATE SET
    doc_ok = EXCLUDED.doc_ok,
    evidence_ok = EXCLUDED.evidence_ok,
    homolog_ok = EXCLUDED.homolog_ok,
    backlog_ok = EXCLUDED.backlog_ok,
    standards_ok = EXCLUDED.standards_ok,
    evidences = EXCLUDED.evidences,
    checked_by = EXCLUDED.checked_by,
    checked_at = now();

  UPDATE public.sprints
    SET status = 'concluida',
        quality_score = score,
        closed_at = now(),
        updated_at = now()
    WHERE id = _sprint_id;

  -- Registra um evento específico de "encerramento oficial" com score e nº de evidências
  INSERT INTO public.sprint_history(sprint_id, project_id, organization_id, action, from_status, to_status, score, notes, changed_by)
  VALUES (
    _sprint_id, _project, _org, 'close_official', NULL, 'concluida', score,
    'Checklist de qualidade concluído (' || COALESCE(jsonb_object_keys_count(_evidences), 0)::text || ' evidências)',
    auth.uid()
  );

  RETURN score;
END;
$function$;

-- Helper simples (count keys) caso não exista
CREATE OR REPLACE FUNCTION public.jsonb_object_keys_count(_j jsonb)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE((SELECT count(*)::int FROM jsonb_object_keys(_j)), 0)
$$;
