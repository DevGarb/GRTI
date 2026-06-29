CREATE OR REPLACE FUNCTION public.close_sprint_with_checklist(_sprint_id uuid, _doc_ok boolean, _evidence_ok boolean, _homolog_ok boolean, _backlog_ok boolean, _standards_ok boolean, _evidences jsonb DEFAULT '{}'::jsonb)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  score numeric;
  _org uuid;
  _project uuid;
  _ev_count int;
BEGIN
  SELECT organization_id, project_id INTO _org, _project FROM public.sprints WHERE id = _sprint_id;
  IF _org IS NOT NULL AND NOT public.is_op_staff(_org) THEN
    RAISE EXCEPTION 'Sem permissão para fechar sprint';
  END IF;

  IF NOT (_doc_ok AND _evidence_ok AND _homolog_ok AND _backlog_ok AND _standards_ok) THEN
    RAISE EXCEPTION 'Todos os itens do checklist de qualidade técnica devem ser confirmados antes de encerrar a sprint';
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

  SELECT COALESCE(count(*), 0)::int INTO _ev_count
  FROM jsonb_object_keys(COALESCE(_evidences, '{}'::jsonb));

  INSERT INTO public.sprint_history(sprint_id, project_id, organization_id, action, from_status, to_status, score, notes, changed_by)
  VALUES (
    _sprint_id, _project, _org, 'close_official', NULL, 'concluida', score,
    'Checklist de qualidade concluído (' || _ev_count::text || ' evidências)',
    auth.uid()
  );

  RETURN score;
END;
$function$;