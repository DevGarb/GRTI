
-- ============================================================
-- 1. EXTRA COLUMNS
-- ============================================================
ALTER TABLE public.project_tasks
  ADD COLUMN IF NOT EXISTS rework_reason text,
  ADD COLUMN IF NOT EXISTS rework_category text,
  ADD COLUMN IF NOT EXISTS rework_requested_by uuid,
  ADD COLUMN IF NOT EXISTS rework_notes text;

ALTER TABLE public.sprints
  ADD COLUMN IF NOT EXISTS delivered_late boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS late_justification text,
  ADD COLUMN IF NOT EXISTS late_approved_by uuid;

-- ============================================================
-- 2. MVP_PENALTIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mvp_penalties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  scope text NOT NULL CHECK (scope IN ('mvp','operacional')),
  type text NOT NULL,
  percent_impact numeric NOT NULL DEFAULT 0,
  quality_impact numeric NOT NULL DEFAULT 0,
  disqualify boolean NOT NULL DEFAULT false,
  reference_date date NOT NULL DEFAULT CURRENT_DATE,
  year int NOT NULL,
  month int NOT NULL,
  project_id uuid,
  sprint_id uuid,
  task_id uuid,
  justification text NOT NULL,
  evidence_url text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','rejeitado')),
  requested_by uuid NOT NULL,
  approved_by uuid,
  approved_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mvp_penalties TO authenticated;
GRANT ALL ON public.mvp_penalties TO service_role;
ALTER TABLE public.mvp_penalties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view org penalties"
  ON public.mvp_penalties FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (user_id = auth.uid())
    OR public.has_role_in_org(auth.uid(), 'admin'::app_role, organization_id)
    OR public.has_role_in_org(auth.uid(), 'desenvolvedor'::app_role, organization_id)
  );

CREATE POLICY "Admins manage penalties"
  ON public.mvp_penalties FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.has_role_in_org(auth.uid(), 'admin'::app_role, organization_id)
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.has_role_in_org(auth.uid(), 'admin'::app_role, organization_id)
  );

CREATE TRIGGER trg_mvp_penalties_updated
  BEFORE UPDATE ON public.mvp_penalties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. MVP_PENALTY_HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mvp_penalty_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  penalty_id uuid NOT NULL REFERENCES public.mvp_penalties(id) ON DELETE CASCADE,
  changed_by uuid,
  old_status text,
  new_status text,
  snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.mvp_penalty_history TO authenticated;
GRANT ALL ON public.mvp_penalty_history TO service_role;
ALTER TABLE public.mvp_penalty_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View history if can view penalty"
  ON public.mvp_penalty_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mvp_penalties p
      WHERE p.id = penalty_id
        AND (
          public.is_super_admin(auth.uid())
          OR p.user_id = auth.uid()
          OR public.has_role_in_org(auth.uid(), 'admin'::app_role, p.organization_id)
          OR public.has_role_in_org(auth.uid(), 'desenvolvedor'::app_role, p.organization_id)
        )
    )
  );

CREATE OR REPLACE FUNCTION public.mvp_penalty_log_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.mvp_penalty_history(penalty_id, changed_by, old_status, new_status, snapshot)
    VALUES (NEW.id, auth.uid(), NULL, NEW.status, to_jsonb(NEW));
    INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, organization_id, details)
    VALUES (auth.uid(), 'penalty_created', 'mvp_penalty', NEW.id, NEW.organization_id, to_jsonb(NEW));
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.mvp_penalty_history(penalty_id, changed_by, old_status, new_status, snapshot)
    VALUES (NEW.id, auth.uid(), OLD.status, NEW.status, to_jsonb(NEW));
    INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, organization_id, details)
    VALUES (auth.uid(), 'penalty_' || NEW.status, 'mvp_penalty', NEW.id, NEW.organization_id,
            jsonb_build_object('old', OLD.status, 'new', NEW.status, 'notes', NEW.notes));
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_mvp_penalty_log
  AFTER INSERT OR UPDATE ON public.mvp_penalties
  FOR EACH ROW EXECUTE FUNCTION public.mvp_penalty_log_trigger();

-- ============================================================
-- 4. PENALTY DEFAULTS HELPER
-- ============================================================
CREATE OR REPLACE FUNCTION public.penalty_defaults(_type text)
RETURNS TABLE(scope text, percent_impact numeric, quality_impact numeric, disqualify boolean)
LANGUAGE sql IMMUTABLE AS $$
  SELECT
    CASE _type
      WHEN 'falta_injustificada' THEN 'mvp'
      WHEN 'atrasos_15min' THEN 'mvp'
      WHEN 'advertencia' THEN 'mvp'
      WHEN 'suspensao' THEN 'mvp'
      WHEN 'sprint_atrasada' THEN 'operacional'
      WHEN 'backlog_parado' THEN 'operacional'
      WHEN 'homologacao_reprovada' THEN 'operacional'
      WHEN 'sem_documentacao' THEN 'operacional'
      WHEN 'sem_evidencia' THEN 'operacional'
      ELSE 'operacional'
    END,
    CASE _type
      WHEN 'falta_injustificada' THEN 25
      WHEN 'atrasos_15min' THEN 10
      WHEN 'advertencia' THEN 50
      WHEN 'sprint_atrasada' THEN 5
      WHEN 'backlog_parado' THEN 2
      ELSE 0
    END::numeric,
    CASE _type
      WHEN 'sem_documentacao' THEN 5
      WHEN 'sem_evidencia' THEN 5
      ELSE 0
    END::numeric,
    (_type = 'suspensao')::boolean;
$$;

-- ============================================================
-- 5. REQUEST / APPROVE PENALTY RPCs
-- ============================================================
CREATE OR REPLACE FUNCTION public.request_penalty(
  _user_id uuid,
  _organization_id uuid,
  _type text,
  _reference_date date,
  _justification text,
  _evidence_url text,
  _project_id uuid DEFAULT NULL,
  _sprint_id uuid DEFAULT NULL,
  _task_id uuid DEFAULT NULL,
  _notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _id uuid;
  d record;
BEGIN
  IF NOT (public.is_super_admin(auth.uid()) OR public.has_role_in_org(auth.uid(), 'admin'::app_role, _organization_id)) THEN
    RAISE EXCEPTION 'Apenas administradores podem registrar penalidades';
  END IF;
  IF _justification IS NULL OR length(trim(_justification)) < 5 THEN
    RAISE EXCEPTION 'Justificativa obrigatória';
  END IF;

  SELECT * INTO d FROM public.penalty_defaults(_type);

  INSERT INTO public.mvp_penalties(
    user_id, organization_id, scope, type,
    percent_impact, quality_impact, disqualify,
    reference_date, year, month,
    project_id, sprint_id, task_id,
    justification, evidence_url, notes,
    status, requested_by
  ) VALUES (
    _user_id, _organization_id, d.scope, _type,
    d.percent_impact, d.quality_impact, d.disqualify,
    _reference_date, EXTRACT(YEAR FROM _reference_date)::int, EXTRACT(MONTH FROM _reference_date)::int,
    _project_id, _sprint_id, _task_id,
    _justification, _evidence_url, _notes,
    'pendente', auth.uid()
  ) RETURNING id INTO _id;

  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.approve_penalty(_id uuid, _approve boolean, _notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _org uuid;
BEGIN
  SELECT organization_id INTO _org FROM public.mvp_penalties WHERE id = _id;
  IF NOT (public.is_super_admin(auth.uid()) OR public.has_role_in_org(auth.uid(), 'admin'::app_role, _org)) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  UPDATE public.mvp_penalties
    SET status = CASE WHEN _approve THEN 'aprovado' ELSE 'rejeitado' END,
        approved_by = auth.uid(),
        approved_at = now(),
        notes = COALESCE(_notes, notes),
        updated_at = now()
    WHERE id = _id;
END $$;

-- ============================================================
-- 6. MVP INDIVIDUAL
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_mvp_individual(_user_id uuid, _organization_id uuid, _year int, _month int)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _start timestamptz;
  _end timestamptz;
  active_projects int;
  backlogs int;
  sprints_count int;
  planned int;
  delivered int;
  late int;
  reworks int;
  on_time int;
  on_time_rate numeric;
  rework_rate numeric;
  op_eff numeric;
  quality numeric;
  pen_mvp numeric := 0;
  pen_quality numeric := 0;
  disqual boolean := false;
  final_score numeric;
  award_level text;
  amount numeric;
  needed_for_gold int := 0;
  rework_impact numeric;
  full_name text;
BEGIN
  _start := make_timestamptz(_year, _month, 1, 0, 0, 0, 'America/Sao_Paulo');
  _end := _start + interval '1 month';

  SELECT p.full_name INTO full_name FROM public.profiles p WHERE p.user_id = _user_id;

  SELECT count(DISTINCT pt.project_id) INTO active_projects
  FROM public.project_tasks pt
  JOIN public.projects pr ON pr.id = pt.project_id
  WHERE pt.assignee_id = _user_id
    AND (_organization_id IS NULL OR pt.organization_id = _organization_id)
    AND pr.status NOT IN ('Concluído','Cancelado');

  SELECT count(*) INTO backlogs FROM public.project_tasks
    WHERE assignee_id = _user_id
      AND (_organization_id IS NULL OR organization_id = _organization_id)
      AND status NOT IN ('Concluído');

  SELECT count(DISTINCT pt.sprint_id) INTO sprints_count FROM public.project_tasks pt
    WHERE pt.assignee_id = _user_id AND pt.sprint_id IS NOT NULL
      AND (_organization_id IS NULL OR pt.organization_id = _organization_id);

  SELECT count(*) INTO planned FROM public.project_tasks
    WHERE assignee_id = _user_id
      AND (_organization_id IS NULL OR organization_id = _organization_id)
      AND planned_date >= _start::date AND planned_date < _end::date;

  SELECT count(*), COALESCE(SUM(rework_count),0)::int,
         SUM(CASE WHEN planned_date IS NOT NULL AND delivered_date <= planned_date THEN 1 ELSE 0 END)::int,
         SUM(CASE WHEN planned_date IS NOT NULL AND delivered_date > planned_date THEN 1 ELSE 0 END)::int
  INTO delivered, reworks, on_time, late
  FROM public.project_tasks
  WHERE assignee_id = _user_id
    AND (_organization_id IS NULL OR organization_id = _organization_id)
    AND status = 'Concluído'
    AND delivered_date >= _start::date AND delivered_date < _end::date;

  delivered := COALESCE(delivered, 0);
  on_time := COALESCE(on_time, 0);
  late := COALESCE(late, 0);

  on_time_rate := CASE WHEN delivered > 0 THEN ROUND(on_time::numeric * 100 / delivered, 2) ELSE 0 END;
  rework_rate := CASE WHEN delivered > 0 THEN ROUND(LEAST(reworks, delivered)::numeric * 100 / delivered, 2) ELSE 0 END;
  op_eff := CASE WHEN delivered > 0 THEN ROUND((delivered - LEAST(reworks, delivered))::numeric * 100 / delivered, 2) ELSE 0 END;

  SELECT COALESCE(AVG(quality_score), 0) INTO quality FROM public.sprints
    WHERE (_organization_id IS NULL OR organization_id = _organization_id)
      AND closed_at >= _start AND closed_at < _end;

  -- penalties aprovadas
  SELECT COALESCE(SUM(percent_impact), 0), COALESCE(SUM(quality_impact), 0),
         bool_or(disqualify)
  INTO pen_mvp, pen_quality, disqual
  FROM public.mvp_penalties
  WHERE user_id = _user_id AND organization_id = _organization_id
    AND year = _year AND month = _month AND status = 'aprovado';

  quality := GREATEST(quality - pen_quality, 0);

  final_score := ROUND(
    (on_time_rate / 100.0)
    * (quality / 100.0)
    * (1 - (CASE WHEN delivered > 0 THEN LEAST(reworks, delivered)::numeric / delivered ELSE 0 END))
    * 100, 2);
  final_score := GREATEST(final_score - pen_mvp, 0);

  IF disqual THEN
    award_level := 'none'; amount := 0;
  ELSIF final_score >= 100 THEN
    award_level := 'ouro'; amount := 500;
  ELSIF final_score >= 90 THEN
    award_level := 'prata'; amount := 300;
  ELSE
    award_level := 'none'; amount := 0;
  END IF;

  -- projeção: quantas entregas no prazo a mais p/ atingir 100% (se possível)
  IF delivered > 0 AND quality > 0 AND on_time_rate < 100 THEN
    needed_for_gold := GREATEST(0, CEIL(delivered::numeric - on_time));
  END IF;

  rework_impact := CASE WHEN delivered > 0 THEN ROUND(100.0 / delivered, 2) ELSE 0 END;

  RETURN jsonb_build_object(
    'full_name', full_name,
    'active_projects', active_projects,
    'backlogs', backlogs,
    'sprints', sprints_count,
    'planned', planned,
    'delivered', delivered,
    'late', late,
    'reworks', reworks,
    'on_time', on_time,
    'on_time_rate', on_time_rate,
    'rework_rate', rework_rate,
    'op_efficiency', op_eff,
    'tech_quality', ROUND(quality, 2),
    'penalty_mvp', pen_mvp,
    'penalty_quality', pen_quality,
    'disqualified', disqual,
    'final_score', final_score,
    'award_level', award_level,
    'amount_brl', amount,
    'needed_for_gold', needed_for_gold,
    'rework_impact_pct', rework_impact
  );
END $$;

-- ============================================================
-- 7. RANKING & EVOLUTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_mvp_team_ranking(_organization_id uuid, _year int, _month int)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _start timestamptz;
  _end timestamptz;
  users_rank jsonb;
  sprints_rank jsonb;
  projects_rank jsonb;
BEGIN
  _start := make_timestamptz(_year, _month, 1, 0, 0, 0, 'America/Sao_Paulo');
  _end := _start + interval '1 month';

  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.final_score DESC), '[]'::jsonb)
  INTO users_rank
  FROM public.get_mvp_metrics(_organization_id, _year, _month) r;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', s.id, 'name', s.name,
    'project_id', s.project_id,
    'quality_score', s.quality_score,
    'closed_at', s.closed_at,
    'delivered', (SELECT count(*) FROM public.project_tasks pt WHERE pt.sprint_id = s.id AND pt.status = 'Concluído'),
    'reworks', (SELECT COALESCE(SUM(rework_count),0) FROM public.project_tasks pt WHERE pt.sprint_id = s.id)
  ) ORDER BY s.quality_score DESC NULLS LAST), '[]'::jsonb)
  INTO sprints_rank
  FROM public.sprints s
  WHERE (_organization_id IS NULL OR s.organization_id = _organization_id)
    AND s.closed_at >= _start AND s.closed_at < _end;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id, 'name', p.name, 'progress', p.progress_percent,
    'delivered', (SELECT count(*) FROM public.project_tasks pt WHERE pt.project_id = p.id AND pt.status = 'Concluído' AND pt.delivered_date >= _start::date AND pt.delivered_date < _end::date),
    'reworks', (SELECT COALESCE(SUM(rework_count),0) FROM public.project_tasks pt WHERE pt.project_id = p.id)
  ) ORDER BY p.progress_percent DESC), '[]'::jsonb)
  INTO projects_rank
  FROM public.projects p
  WHERE (_organization_id IS NULL OR p.organization_id = _organization_id);

  RETURN jsonb_build_object('users', users_rank, 'sprints', sprints_rank, 'projects', projects_rank);
END $$;

CREATE OR REPLACE FUNCTION public.get_mvp_team_evolution(_organization_id uuid, _months_back int DEFAULT 6)
RETURNS TABLE(year int, month int, avg_final numeric, total_deliveries int, total_reworks int, avg_quality numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  i int;
  ref date := date_trunc('month', CURRENT_DATE)::date;
  y int; m int;
  agg record;
BEGIN
  FOR i IN REVERSE _months_back-1 .. 0 LOOP
    y := EXTRACT(YEAR FROM (ref - (i || ' month')::interval))::int;
    m := EXTRACT(MONTH FROM (ref - (i || ' month')::interval))::int;
    SELECT
      ROUND(AVG(final_score)::numeric, 2) AS f,
      COALESCE(SUM(total_deliveries),0)::int AS d,
      COALESCE(SUM(reworks),0)::int AS r,
      ROUND(AVG(quality_rate)::numeric, 2) AS q
    INTO agg
    FROM public.get_mvp_metrics(_organization_id, y, m);
    year := y; month := m;
    avg_final := COALESCE(agg.f, 0);
    total_deliveries := COALESCE(agg.d, 0);
    total_reworks := COALESCE(agg.r, 0);
    avg_quality := COALESCE(agg.q, 0);
    RETURN NEXT;
  END LOOP;
END $$;

-- ============================================================
-- 8. UPDATE compute_mvp_awards to discount penalties
-- ============================================================
CREATE OR REPLACE FUNCTION public.compute_mvp_awards(_organization_id uuid, _year integer, _month integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  r record;
  n int := 0;
  pen_mvp numeric;
  pen_quality numeric;
  disqual boolean;
  adj_final numeric;
  adj_quality numeric;
  adj_level text;
  adj_amount numeric;
BEGIN
  IF NOT (public.is_super_admin(auth.uid()) OR public.has_role_in_org(auth.uid(), 'admin'::app_role, _organization_id)) THEN
    RAISE EXCEPTION 'Apenas administradores podem calcular premiações';
  END IF;

  FOR r IN SELECT * FROM public.get_mvp_metrics(_organization_id, _year, _month) LOOP
    SELECT COALESCE(SUM(percent_impact),0), COALESCE(SUM(quality_impact),0), bool_or(disqualify)
    INTO pen_mvp, pen_quality, disqual
    FROM public.mvp_penalties
    WHERE user_id = r.user_id AND organization_id = _organization_id
      AND year = _year AND month = _month AND status = 'aprovado';

    adj_quality := GREATEST(r.quality_rate - pen_quality, 0);
    adj_final := GREATEST(r.final_score - pen_mvp, 0);

    IF disqual THEN
      adj_level := 'none'; adj_amount := 0;
    ELSIF adj_final >= 100 THEN
      adj_level := 'ouro'; adj_amount := 500;
    ELSIF adj_final >= 90 THEN
      adj_level := 'prata'; adj_amount := 300;
    ELSE
      adj_level := 'none'; adj_amount := 0;
    END IF;

    INSERT INTO public.mvp_awards(
      user_id, organization_id, year, month,
      on_time_rate, quality_rate, rework_rate, final_score,
      award_level, amount_brl, status
    ) VALUES (
      r.user_id, _organization_id, _year, _month,
      r.on_time_rate, adj_quality, r.rework_rate, adj_final,
      adj_level, adj_amount, 'pendente'
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
END $$;
