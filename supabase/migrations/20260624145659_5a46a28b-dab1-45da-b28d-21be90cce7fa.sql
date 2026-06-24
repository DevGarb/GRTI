
-- =====================================================================
-- PROJECTS: novos campos
-- =====================================================================
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS co_owner_id uuid,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'Média',
  ADD COLUMN IF NOT EXISTS planned_end_date date,
  ADD COLUMN IF NOT EXISTS progress_percent int NOT NULL DEFAULT 0;

-- =====================================================================
-- PROJECT_TASKS: novos campos + migração de status
-- =====================================================================
ALTER TABLE public.project_tasks
  ADD COLUMN IF NOT EXISTS co_assignee_id uuid,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'Média',
  ADD COLUMN IF NOT EXISTS planned_date date,
  ADD COLUMN IF NOT EXISTS delivered_date date,
  ADD COLUMN IF NOT EXISTS rework_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reopened_at timestamptz;

UPDATE public.project_tasks SET status = 'Pendente'          WHERE status = 'todo';
UPDATE public.project_tasks SET status = 'Em Desenvolvimento' WHERE status = 'doing';
UPDATE public.project_tasks SET status = 'Concluído'         WHERE status = 'done';

ALTER TABLE public.project_tasks ALTER COLUMN status SET DEFAULT 'Pendente';

-- =====================================================================
-- SPRINTS: responsável e pontuação de qualidade
-- =====================================================================
ALTER TABLE public.sprints
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS quality_score numeric;

-- =====================================================================
-- task_status_history
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.task_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.task_status_history TO authenticated;
GRANT ALL ON public.task_status_history TO service_role;
ALTER TABLE public.task_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_history_read_org" ON public.task_status_history
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.project_tasks pt
      WHERE pt.id = task_status_history.task_id
        AND (
          public.is_super_admin(auth.uid())
          OR pt.organization_id IS NULL
          OR public.is_member_of_org(pt.organization_id)
        )
    )
  );
CREATE POLICY "task_history_insert_any" ON public.task_status_history
  FOR INSERT TO authenticated WITH CHECK (true);

-- =====================================================================
-- delivery_reschedules
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.delivery_reschedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  old_date date,
  new_date date NOT NULL,
  reason text NOT NULL,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.delivery_reschedules TO authenticated;
GRANT ALL ON public.delivery_reschedules TO service_role;
ALTER TABLE public.delivery_reschedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reschedules_read_org" ON public.delivery_reschedules
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.project_tasks pt
      WHERE pt.id = delivery_reschedules.task_id
        AND (
          public.is_super_admin(auth.uid())
          OR pt.organization_id IS NULL
          OR public.is_member_of_org(pt.organization_id)
        )
    )
  );
CREATE POLICY "reschedules_insert_any" ON public.delivery_reschedules
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- =====================================================================
-- sprint_quality_checks
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.sprint_quality_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id uuid NOT NULL UNIQUE REFERENCES public.sprints(id) ON DELETE CASCADE,
  doc_ok boolean NOT NULL DEFAULT false,
  evidence_ok boolean NOT NULL DEFAULT false,
  homolog_ok boolean NOT NULL DEFAULT false,
  backlog_ok boolean NOT NULL DEFAULT false,
  standards_ok boolean NOT NULL DEFAULT false,
  checked_by uuid,
  checked_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.sprint_quality_checks TO authenticated;
GRANT ALL ON public.sprint_quality_checks TO service_role;
ALTER TABLE public.sprint_quality_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sprint_qc_read_org" ON public.sprint_quality_checks
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.sprints s
      WHERE s.id = sprint_quality_checks.sprint_id
        AND (
          public.is_super_admin(auth.uid())
          OR s.organization_id IS NULL
          OR public.is_member_of_org(s.organization_id)
        )
    )
  );
CREATE POLICY "sprint_qc_write_staff" ON public.sprint_quality_checks
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.sprints s
      WHERE s.id = sprint_quality_checks.sprint_id
        AND (
          public.is_super_admin(auth.uid())
          OR (s.organization_id IS NOT NULL AND public.is_op_staff(s.organization_id))
        )
    )
  ) WITH CHECK (true);

-- =====================================================================
-- mvp_awards
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.mvp_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  year int NOT NULL,
  month int NOT NULL,
  on_time_rate numeric NOT NULL DEFAULT 0,
  quality_rate numeric NOT NULL DEFAULT 0,
  rework_rate numeric NOT NULL DEFAULT 0,
  final_score numeric NOT NULL DEFAULT 0,
  award_level text NOT NULL DEFAULT 'none',
  amount_brl numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  approved_by uuid,
  approved_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id, year, month)
);
GRANT SELECT, INSERT, UPDATE ON public.mvp_awards TO authenticated;
GRANT ALL ON public.mvp_awards TO service_role;
ALTER TABLE public.mvp_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mvp_awards_read_org" ON public.mvp_awards
  FOR SELECT TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR public.is_member_of_org(organization_id)
  );
CREATE POLICY "mvp_awards_admin_write" ON public.mvp_awards
  FOR ALL TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR public.has_role_in_org(auth.uid(), 'admin'::app_role, organization_id)
  ) WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.has_role_in_org(auth.uid(), 'admin'::app_role, organization_id)
  );

CREATE TRIGGER mvp_awards_updated_at
BEFORE UPDATE ON public.mvp_awards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- Trigger: status change + rework detection
-- =====================================================================
CREATE OR REPLACE FUNCTION public.task_status_change_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.task_status_history(task_id, old_status, new_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status, auth.uid());
    IF NEW.status = 'Concluído' AND NEW.delivered_date IS NULL THEN
      NEW.delivered_date := CURRENT_DATE;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.task_status_history(task_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());

    IF OLD.status = 'Concluído' AND NEW.status NOT IN ('Concluído') THEN
      NEW.rework_count := COALESCE(OLD.rework_count, 0) + 1;
      NEW.reopened_at := now();
      IF NEW.status NOT IN ('Retrabalho') THEN
        NEW.status := 'Retrabalho';
      END IF;
      NEW.delivered_date := NULL;
    ELSIF NEW.status = 'Concluído' AND OLD.status <> 'Concluído' THEN
      NEW.delivered_date := COALESCE(NEW.delivered_date, CURRENT_DATE);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_status_change ON public.project_tasks;
CREATE TRIGGER trg_task_status_change
BEFORE INSERT OR UPDATE ON public.project_tasks
FOR EACH ROW EXECUTE FUNCTION public.task_status_change_trigger();

-- =====================================================================
-- Trigger: recompute project progress
-- =====================================================================
CREATE OR REPLACE FUNCTION public.recompute_project_progress(_project_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  total int;
  done int;
BEGIN
  SELECT count(*) INTO total FROM public.project_tasks WHERE project_id = _project_id;
  SELECT count(*) INTO done FROM public.project_tasks
    WHERE project_id = _project_id AND status = 'Concluído';
  UPDATE public.projects
    SET progress_percent = CASE WHEN total > 0 THEN ROUND(done::numeric * 100 / total) ELSE 0 END,
        updated_at = now()
    WHERE id = _project_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.project_progress_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_project_progress(OLD.project_id);
    RETURN OLD;
  END IF;
  PERFORM public.recompute_project_progress(NEW.project_id);
  IF TG_OP = 'UPDATE' AND OLD.project_id IS DISTINCT FROM NEW.project_id THEN
    PERFORM public.recompute_project_progress(OLD.project_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_progress ON public.project_tasks;
CREATE TRIGGER trg_project_progress
AFTER INSERT OR UPDATE OR DELETE ON public.project_tasks
FOR EACH ROW EXECUTE FUNCTION public.project_progress_trigger();

-- Recompute initial values
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT id FROM public.projects LOOP
    PERFORM public.recompute_project_progress(p.id);
  END LOOP;
END$$;

-- =====================================================================
-- RPC: close_sprint_with_checklist
-- =====================================================================
CREATE OR REPLACE FUNCTION public.close_sprint_with_checklist(
  _sprint_id uuid,
  _doc_ok boolean,
  _evidence_ok boolean,
  _homolog_ok boolean,
  _backlog_ok boolean,
  _standards_ok boolean
) RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  score numeric;
  _org uuid;
BEGIN
  SELECT organization_id INTO _org FROM public.sprints WHERE id = _sprint_id;
  IF _org IS NOT NULL AND NOT public.is_op_staff(_org) THEN
    RAISE EXCEPTION 'Sem permissão para fechar sprint';
  END IF;

  score := ((_doc_ok::int + _evidence_ok::int + _homolog_ok::int + _backlog_ok::int + _standards_ok::int) * 20)::numeric;

  INSERT INTO public.sprint_quality_checks(sprint_id, doc_ok, evidence_ok, homolog_ok, backlog_ok, standards_ok, checked_by)
  VALUES (_sprint_id, _doc_ok, _evidence_ok, _homolog_ok, _backlog_ok, _standards_ok, auth.uid())
  ON CONFLICT (sprint_id) DO UPDATE SET
    doc_ok = EXCLUDED.doc_ok,
    evidence_ok = EXCLUDED.evidence_ok,
    homolog_ok = EXCLUDED.homolog_ok,
    backlog_ok = EXCLUDED.backlog_ok,
    standards_ok = EXCLUDED.standards_ok,
    checked_by = EXCLUDED.checked_by,
    checked_at = now();

  UPDATE public.sprints
    SET status = 'concluida',
        quality_score = score,
        closed_at = now(),
        updated_at = now()
    WHERE id = _sprint_id;

  RETURN score;
END;
$$;

-- =====================================================================
-- RPC: get_projects_dashboard
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_projects_dashboard(
  _organization_id uuid,
  _from timestamptz,
  _to timestamptz
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result jsonb;
  active_projects int;
  done_projects int;
  late_projects int;
  active_sprints int;
  pending_backlog int;
  month_deliveries int;
  month_reworks int;
  op_efficiency numeric;
  tech_quality numeric;
  on_time_rate numeric;
  final_mvp numeric;
BEGIN
  SELECT count(*) INTO active_projects FROM public.projects
    WHERE (_organization_id IS NULL OR organization_id = _organization_id)
      AND status NOT IN ('Concluído', 'Cancelado');

  SELECT count(*) INTO done_projects FROM public.projects
    WHERE (_organization_id IS NULL OR organization_id = _organization_id)
      AND status = 'Concluído';

  SELECT count(*) INTO late_projects FROM public.projects
    WHERE (_organization_id IS NULL OR organization_id = _organization_id)
      AND status NOT IN ('Concluído','Cancelado')
      AND planned_end_date IS NOT NULL
      AND planned_end_date < CURRENT_DATE;

  SELECT count(*) INTO active_sprints FROM public.sprints
    WHERE (_organization_id IS NULL OR organization_id = _organization_id)
      AND status = 'ativa';

  SELECT count(*) INTO pending_backlog FROM public.project_tasks
    WHERE (_organization_id IS NULL OR organization_id = _organization_id)
      AND status NOT IN ('Concluído');

  SELECT count(*) INTO month_deliveries FROM public.project_tasks
    WHERE (_organization_id IS NULL OR organization_id = _organization_id)
      AND status = 'Concluído'
      AND delivered_date >= _from::date AND delivered_date < _to::date;

  SELECT COALESCE(SUM(rework_count), 0)::int INTO month_reworks FROM public.project_tasks
    WHERE (_organization_id IS NULL OR organization_id = _organization_id)
      AND reopened_at >= _from AND reopened_at < _to;

  op_efficiency := CASE WHEN month_deliveries > 0
    THEN ROUND((month_deliveries - LEAST(month_reworks, month_deliveries))::numeric * 100 / month_deliveries, 2)
    ELSE 0 END;

  SELECT COALESCE(AVG(quality_score), 0) INTO tech_quality FROM public.sprints
    WHERE (_organization_id IS NULL OR organization_id = _organization_id)
      AND closed_at >= _from AND closed_at < _to;

  SELECT CASE WHEN count(*) > 0
    THEN ROUND(SUM(CASE WHEN delivered_date <= planned_date THEN 1 ELSE 0 END)::numeric * 100 / count(*), 2)
    ELSE 0 END
    INTO on_time_rate FROM public.project_tasks
    WHERE (_organization_id IS NULL OR organization_id = _organization_id)
      AND status = 'Concluído'
      AND delivered_date >= _from::date AND delivered_date < _to::date
      AND planned_date IS NOT NULL;

  final_mvp := ROUND(
    (on_time_rate / 100.0)
    * (tech_quality / 100.0)
    * (1 - (CASE WHEN month_deliveries > 0 THEN LEAST(month_reworks, month_deliveries)::numeric / month_deliveries ELSE 0 END))
    * 100, 2);

  result := jsonb_build_object(
    'active_projects', active_projects,
    'done_projects', done_projects,
    'late_projects', late_projects,
    'active_sprints', active_sprints,
    'pending_backlog', pending_backlog,
    'month_deliveries', month_deliveries,
    'month_reworks', month_reworks,
    'op_efficiency', op_efficiency,
    'tech_quality', ROUND(tech_quality, 2),
    'on_time_rate', on_time_rate,
    'final_mvp', final_mvp
  );
  RETURN result;
END;
$$;

-- =====================================================================
-- RPC: get_mvp_metrics
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_mvp_metrics(
  _organization_id uuid,
  _year int,
  _month int
) RETURNS TABLE(
  user_id uuid,
  full_name text,
  total_deliveries int,
  on_time int,
  reworks int,
  on_time_rate numeric,
  quality_rate numeric,
  rework_rate numeric,
  op_efficiency numeric,
  final_score numeric,
  award_level text,
  amount_brl numeric
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _start timestamptz;
  _end timestamptz;
  _quality numeric;
BEGIN
  _start := make_timestamptz(_year, _month, 1, 0, 0, 0, 'America/Sao_Paulo');
  _end := _start + interval '1 month';

  SELECT COALESCE(AVG(quality_score), 0) INTO _quality FROM public.sprints
    WHERE (_organization_id IS NULL OR organization_id = _organization_id)
      AND closed_at >= _start AND closed_at < _end;

  RETURN QUERY
  WITH tasks AS (
    SELECT pt.assignee_id, pt.id, pt.planned_date, pt.delivered_date, pt.rework_count
    FROM public.project_tasks pt
    WHERE (_organization_id IS NULL OR pt.organization_id = _organization_id)
      AND pt.status = 'Concluído'
      AND pt.delivered_date >= _start::date AND pt.delivered_date < _end::date
      AND pt.assignee_id IS NOT NULL
  ),
  agg AS (
    SELECT
      t.assignee_id AS uid,
      count(*)::int AS total_deliveries,
      SUM(CASE WHEN t.planned_date IS NOT NULL AND t.delivered_date <= t.planned_date THEN 1 ELSE 0 END)::int AS on_time,
      COALESCE(SUM(t.rework_count), 0)::int AS reworks
    FROM tasks t
    GROUP BY t.assignee_id
  )
  SELECT
    a.uid,
    COALESCE(p.full_name, 'Sem nome'),
    a.total_deliveries,
    a.on_time,
    a.reworks,
    CASE WHEN a.total_deliveries > 0 THEN ROUND(a.on_time::numeric * 100 / a.total_deliveries, 2) ELSE 0 END,
    ROUND(_quality, 2),
    CASE WHEN a.total_deliveries > 0 THEN ROUND(LEAST(a.reworks, a.total_deliveries)::numeric * 100 / a.total_deliveries, 2) ELSE 0 END,
    CASE WHEN a.total_deliveries > 0 THEN ROUND((a.total_deliveries - LEAST(a.reworks, a.total_deliveries))::numeric * 100 / a.total_deliveries, 2) ELSE 0 END,
    ROUND(
      (CASE WHEN a.total_deliveries > 0 THEN a.on_time::numeric / a.total_deliveries ELSE 0 END)
      * (_quality / 100.0)
      * (1 - (CASE WHEN a.total_deliveries > 0 THEN LEAST(a.reworks, a.total_deliveries)::numeric / a.total_deliveries ELSE 0 END))
      * 100, 2) AS final_score,
    CASE
      WHEN (CASE WHEN a.total_deliveries > 0 THEN a.on_time::numeric / a.total_deliveries ELSE 0 END)
        * (_quality / 100.0)
        * (1 - (CASE WHEN a.total_deliveries > 0 THEN LEAST(a.reworks, a.total_deliveries)::numeric / a.total_deliveries ELSE 0 END))
        * 100 >= 100 THEN 'ouro'
      WHEN (CASE WHEN a.total_deliveries > 0 THEN a.on_time::numeric / a.total_deliveries ELSE 0 END)
        * (_quality / 100.0)
        * (1 - (CASE WHEN a.total_deliveries > 0 THEN LEAST(a.reworks, a.total_deliveries)::numeric / a.total_deliveries ELSE 0 END))
        * 100 >= 90 THEN 'prata'
      ELSE 'none'
    END,
    CASE
      WHEN (CASE WHEN a.total_deliveries > 0 THEN a.on_time::numeric / a.total_deliveries ELSE 0 END)
        * (_quality / 100.0)
        * (1 - (CASE WHEN a.total_deliveries > 0 THEN LEAST(a.reworks, a.total_deliveries)::numeric / a.total_deliveries ELSE 0 END))
        * 100 >= 100 THEN 500
      WHEN (CASE WHEN a.total_deliveries > 0 THEN a.on_time::numeric / a.total_deliveries ELSE 0 END)
        * (_quality / 100.0)
        * (1 - (CASE WHEN a.total_deliveries > 0 THEN LEAST(a.reworks, a.total_deliveries)::numeric / a.total_deliveries ELSE 0 END))
        * 100 >= 90 THEN 300
      ELSE 0
    END::numeric
  FROM agg a
  LEFT JOIN public.profiles p ON p.user_id = a.uid
  ORDER BY final_score DESC;
END;
$$;

-- =====================================================================
-- RPC: compute_mvp_awards (upsert in mvp_awards)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.compute_mvp_awards(
  _organization_id uuid,
  _year int,
  _month int
) RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
  n int := 0;
BEGIN
  IF NOT (public.is_super_admin(auth.uid()) OR public.has_role_in_org(auth.uid(), 'admin'::app_role, _organization_id)) THEN
    RAISE EXCEPTION 'Apenas administradores podem calcular premiações';
  END IF;

  FOR r IN SELECT * FROM public.get_mvp_metrics(_organization_id, _year, _month) LOOP
    INSERT INTO public.mvp_awards(
      user_id, organization_id, year, month,
      on_time_rate, quality_rate, rework_rate, final_score,
      award_level, amount_brl, status
    ) VALUES (
      r.user_id, _organization_id, _year, _month,
      r.on_time_rate, r.quality_rate, r.rework_rate, r.final_score,
      r.award_level, r.amount_brl, 'pendente'
    )
    ON CONFLICT (user_id, organization_id, year, month) DO UPDATE SET
      on_time_rate = EXCLUDED.on_time_rate,
      quality_rate = EXCLUDED.quality_rate,
      rework_rate = EXCLUDED.rework_rate,
      final_score = EXCLUDED.final_score,
      award_level = EXCLUDED.award_level,
      amount_brl = EXCLUDED.amount_brl,
      status = CASE WHEN public.mvp_awards.status = 'aprovado' THEN 'aprovado' ELSE 'pendente' END,
      updated_at = now();
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- =====================================================================
-- RPC: approve_mvp_award
-- =====================================================================
CREATE OR REPLACE FUNCTION public.approve_mvp_award(
  _id uuid,
  _approve boolean,
  _notes text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _org uuid;
BEGIN
  SELECT organization_id INTO _org FROM public.mvp_awards WHERE id = _id;
  IF NOT (public.is_super_admin(auth.uid()) OR public.has_role_in_org(auth.uid(), 'admin'::app_role, _org)) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  UPDATE public.mvp_awards
    SET status = CASE WHEN _approve THEN 'aprovado' ELSE 'rejeitado' END,
        approved_by = auth.uid(),
        approved_at = now(),
        notes = _notes,
        updated_at = now()
    WHERE id = _id;
END;
$$;
