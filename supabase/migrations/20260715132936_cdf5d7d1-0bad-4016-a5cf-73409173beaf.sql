
-- 1) Allow ticket type 'Projeto'
ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_type_check;
ALTER TABLE public.tickets ADD CONSTRAINT tickets_type_check CHECK (type = ANY (ARRAY['Software'::text,'Hardware'::text,'Projeto'::text]));

-- 2) Replace close_sprint_with_checklist with new signature (adds _finished_by, creates credit ticket)
DROP FUNCTION IF EXISTS public.close_sprint_with_checklist(uuid, boolean, boolean, boolean, boolean, boolean, jsonb);

CREATE OR REPLACE FUNCTION public.close_sprint_with_checklist(
  _sprint_id uuid,
  _doc_ok boolean,
  _evidence_ok boolean,
  _homolog_ok boolean,
  _backlog_ok boolean,
  _standards_ok boolean,
  _finished_by uuid,
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
  _ev_count int;
  _sprint_name text;
  _total_points int;
  _desc text;
  _lines text;
BEGIN
  SELECT organization_id, project_id, name INTO _org, _project, _sprint_name FROM public.sprints WHERE id = _sprint_id;
  IF _org IS NOT NULL AND NOT public.is_op_staff(_org) THEN
    RAISE EXCEPTION 'Sem permissão para fechar sprint';
  END IF;

  IF NOT (_doc_ok AND _evidence_ok AND _homolog_ok AND _backlog_ok AND _standards_ok) THEN
    RAISE EXCEPTION 'Todos os itens do checklist de qualidade técnica devem ser confirmados antes de encerrar a sprint';
  END IF;

  IF _finished_by IS NULL THEN
    RAISE EXCEPTION 'Técnico responsável pela entrega é obrigatório';
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

  -- Sum story points across tasks in this sprint
  SELECT COALESCE(SUM(COALESCE(story_points, 0)), 0)::int INTO _total_points
  FROM public.project_tasks WHERE sprint_id = _sprint_id;

  -- Build description with backlog list
  SELECT string_agg('- ' || COALESCE(title, '(sem título)') || ' (' || COALESCE(story_points, 0)::text || ' pts)', E'\n' ORDER BY created_at)
    INTO _lines
  FROM public.project_tasks WHERE sprint_id = _sprint_id;

  _desc := 'Sprint concluída — backlogs entregues:' || E'\n' ||
           COALESCE(_lines, '- (nenhum backlog cadastrado)') || E'\n\n' ||
           'Total: ' || _total_points::text || ' pontos';

  -- Insert credit ticket (Projeto) — closed on arrival
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

-- 3) Skip notifications for Projeto (credit) tickets
CREATE OR REPLACE FUNCTION public.notify_ticket_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.type = 'Projeto' THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (user_id, organization_id, type, title, body, ticket_id)
  SELECT DISTINCT uor.user_id, NEW.organization_id, 'ticket_new',
         'Novo chamado aberto',
         COALESCE(NEW.title, 'Sem título'),
         NEW.id
  FROM public.user_organization_roles uor
  WHERE uor.organization_id = NEW.organization_id
    AND uor.role IN ('admin'::app_role, 'tecnico'::app_role, 'desenvolvedor'::app_role)
    AND uor.user_id <> COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tv_notify_new_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_slug text;
begin
  IF NEW.type = 'Projeto' THEN
    RETURN NEW;
  END IF;
  select slug into v_slug from public.organizations where id = new.organization_id;
  if v_slug is null then
    return new;
  end if;
  perform realtime.send(
    jsonb_build_object(
      'id', new.id,
      'title', new.title,
      'priority', new.priority,
      'created_at', new.created_at
    ),
    'new_ticket',
    'tv:' || v_slug,
    false
  );
  return new;
exception when others then
  return new;
end;
$function$;
