DROP FUNCTION IF EXISTS public.close_sprint_with_checklist(uuid, boolean, boolean, boolean, boolean, boolean, uuid, uuid, jsonb);

CREATE OR REPLACE FUNCTION public.close_sprint_with_checklist(
  _sprint_id uuid,
  _doc_ok boolean,
  _evidence_ok boolean,
  _homolog_ok boolean,
  _backlog_ok boolean,
  _standards_ok boolean,
  _finished_by uuid,
  _category_id uuid,
  _evidences jsonb,
  _credits jsonb DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  score numeric;
  _org uuid;
  _project uuid;
  _closed_at timestamptz;
  _ev_count int;
  _sprint_name text;
  _total_points int;
  _desc text;
  _task_lines text;
  _ticket_lines text;
  _c jsonb;
  _cu uuid;
  _cp int;
  _sum int;
  _lines text;
BEGIN
  SELECT organization_id, project_id, name, closed_at
    INTO _org, _project, _sprint_name, _closed_at
    FROM public.sprints WHERE id = _sprint_id;

  IF _org IS NOT NULL AND NOT public.is_op_staff(_org) THEN
    RAISE EXCEPTION 'Sem permissão para fechar sprint';
  END IF;

  IF _closed_at IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.sprint_quality_checks
     WHERE sprint_id = _sprint_id AND checked_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Sprint já encerrada. Reabra corretamente antes de encerrar novamente.';
  END IF;

  IF NOT (_doc_ok AND _evidence_ok AND _homolog_ok AND _backlog_ok AND _standards_ok) THEN
    RAISE EXCEPTION 'Todos os itens do checklist de qualidade técnica devem ser confirmados antes de encerrar a sprint';
  END IF;

  IF _finished_by IS NULL THEN
    RAISE EXCEPTION 'Técnico responsável pela entrega é obrigatório';
  END IF;

  score := ((_doc_ok::int + _evidence_ok::int + _homolog_ok::int + _backlog_ok::int + _standards_ok::int) * 20)::numeric;

  INSERT INTO public.sprint_quality_checks(sprint_id, doc_ok, evidence_ok, homolog_ok, backlog_ok, standards_ok, evidences, category_id, checked_by)
  VALUES (_sprint_id, _doc_ok, _evidence_ok, _homolog_ok, _backlog_ok, _standards_ok, _evidences, _category_id, auth.uid())
  ON CONFLICT (sprint_id) DO UPDATE SET
    doc_ok = EXCLUDED.doc_ok,
    evidence_ok = EXCLUDED.evidence_ok,
    homolog_ok = EXCLUDED.homolog_ok,
    backlog_ok = EXCLUDED.backlog_ok,
    standards_ok = EXCLUDED.standards_ok,
    evidences = EXCLUDED.evidences,
    category_id = EXCLUDED.category_id,
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

  SELECT
    COALESCE((SELECT SUM(COALESCE(story_points, 0)) FROM public.project_tasks WHERE sprint_id = _sprint_id), 0)
    + COALESCE((SELECT SUM(COALESCE(story_points, 0)) FROM public.tickets WHERE sprint_id = _sprint_id AND type <> 'Projeto'), 0)
    INTO _total_points;

  -- Divisão por desenvolvedor
  IF _credits IS NOT NULL AND jsonb_typeof(_credits) = 'array' AND jsonb_array_length(_credits) > 0 THEN
    SELECT COALESCE(SUM((e->>'points')::int), 0) INTO _sum
      FROM jsonb_array_elements(_credits) e;
    IF _sum <> _total_points THEN
      RAISE EXCEPTION 'A soma da divisão (% pts) difere do total da sprint (% pts)', _sum, _total_points;
    END IF;

    FOR _c IN SELECT * FROM jsonb_array_elements(_credits) LOOP
      _cu := NULLIF(_c->>'user_id', '')::uuid;
      _cp := COALESCE((_c->>'points')::int, 0);
      IF _cu IS NULL OR _cp <= 0 THEN
        CONTINUE;
      END IF;

      SELECT string_agg('- ' || COALESCE(title, '(sem título)') || ' (' || COALESCE(story_points, 0)::text || ' pts)', E'\n' ORDER BY created_at)
        INTO _lines
      FROM (
        SELECT title, story_points, created_at
          FROM public.project_tasks
         WHERE sprint_id = _sprint_id
           AND COALESCE(credited_to, assignee_id) = _cu
        UNION ALL
        SELECT title, story_points, created_at
          FROM public.tickets
         WHERE sprint_id = _sprint_id
           AND type <> 'Projeto'
           AND assigned_to = _cu
      ) x;

      _desc := 'Sprint concluída — itens entregues:' || E'\n' ||
               COALESCE(NULLIF(_lines, ''), '- (itens atribuídos manualmente)') || E'\n\n' ||
               'Total: ' || _cp::text || ' pontos';

      INSERT INTO public.tickets (
        title, description, type, status, priority,
        assigned_to, created_by, organization_id, project_id, sprint_id,
        story_points, created_at, started_at, picked_at, closed_at
      ) VALUES (
        _sprint_name, _desc, 'Projeto', 'Fechado', 'Baixa',
        _cu, auth.uid(), _org, _project, _sprint_id,
        _cp, now(), now(), now(), now()
      );
    END LOOP;

    RETURN score;
  END IF;

  -- Comportamento antigo: 1 chamado único
  SELECT string_agg('- ' || COALESCE(title, '(sem título)') || ' (' || COALESCE(story_points, 0)::text || ' pts)', E'\n' ORDER BY created_at)
    INTO _task_lines
  FROM public.project_tasks WHERE sprint_id = _sprint_id;

  SELECT string_agg('- ' || COALESCE(title, '(sem título)') || ' (' || COALESCE(story_points, 0)::text || ' pts)', E'\n' ORDER BY created_at)
    INTO _ticket_lines
  FROM public.tickets WHERE sprint_id = _sprint_id AND type <> 'Projeto';

  _desc := 'Sprint concluída — itens entregues:' || E'\n' ||
           COALESCE(NULLIF(concat_ws(E'\n', _ticket_lines, _task_lines), ''), '- (nenhum item cadastrado)') || E'\n\n' ||
           'Total: ' || _total_points::text || ' pontos';

  INSERT INTO public.tickets (
    title, description, type, status, priority,
    assigned_to, created_by, organization_id, project_id, sprint_id,
    story_points, created_at, started_at, picked_at, closed_at
  ) VALUES (
    _sprint_name, _desc, 'Projeto', 'Fechado', 'Baixa',
    _finished_by, auth.uid(), _org, _project, _sprint_id,
    _total_points, now(), now(), now(), now()
  );

  RETURN score;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reopen_sprint_and_clear_credit(_sprint_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _org uuid;
BEGIN
  SELECT organization_id INTO _org FROM public.sprints WHERE id = _sprint_id;
  IF _org IS NOT NULL AND NOT public.is_op_staff(_org) THEN
    RAISE EXCEPTION 'Sem permissão para reabrir sprint';
  END IF;

  DELETE FROM public.tickets
   WHERE sprint_id = _sprint_id
     AND type = 'Projeto'
     AND status = 'Fechado';

  DELETE FROM public.sprint_quality_checks WHERE sprint_id = _sprint_id;

  UPDATE public.sprints
     SET status = 'ativa',
         closed_at = NULL,
         quality_score = NULL,
         updated_at = now()
   WHERE id = _sprint_id;

  INSERT INTO public.sprint_history(sprint_id, project_id, organization_id, action, from_status, to_status, notes, changed_by)
  SELECT id, project_id, organization_id, 'reopen', 'concluida', 'ativa',
         'Sprint reaberta e chamados-crédito removidos',
         auth.uid()
    FROM public.sprints WHERE id = _sprint_id;
END;
$function$;