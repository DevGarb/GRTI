
CREATE OR REPLACE FUNCTION public.get_tv_goals_summary(_organization_id uuid, _year int, _month int)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _from timestamptz := make_timestamptz(_year, _month, 1, 0, 0, 0, 'America/Sao_Paulo');
  _to   timestamptz := _from + interval '1 month';
  _from_date date := _from::date;
  _to_date   date := _to::date;

  preventivas_target_total numeric := 0;
  csat_target_avg numeric := 0;
  points_target_total numeric := 0;
  tickets_target_total numeric := 0;
  rework_target_avg numeric := 0;
  tma_target_avg_hours numeric := 0;
  projects_target_total numeric := 0;

  points_actual_total numeric := 0;
  csat_actual_avg numeric := 0;
  csat_actual_count int := 0;
  rework_actual_percent numeric := 0;
  tma_actual_hours numeric := 0;
  projects_actual_total int := 0;
  closed_month int := 0;
  rework_month int := 0;
  active_sprints_backlog int := 0;
BEGIN
  -- METAS
  SELECT COALESCE(SUM(target_value),0) INTO preventivas_target_total
    FROM public.performance_goals
   WHERE metric='preventivas_done' AND period='monthly'
     AND reference_month=_month AND reference_year=_year
     AND (organization_id = _organization_id OR organization_id IS NULL);

  SELECT COALESCE(AVG(target_value),0) INTO csat_target_avg
    FROM public.performance_goals
   WHERE metric='avg_score' AND period='monthly'
     AND reference_month=_month AND reference_year=_year
     AND (organization_id = _organization_id OR organization_id IS NULL);

  SELECT COALESCE(SUM(target_value),0) INTO points_target_total
    FROM public.performance_goals
   WHERE metric='points' AND period='monthly'
     AND reference_month=_month AND reference_year=_year
     AND (organization_id = _organization_id OR organization_id IS NULL);

  SELECT COALESCE(SUM(target_value),0) INTO tickets_target_total
    FROM public.performance_goals
   WHERE metric='tickets_closed' AND period='monthly'
     AND reference_month=_month AND reference_year=_year
     AND (organization_id = _organization_id OR organization_id IS NULL);

  SELECT COALESCE(AVG(target_value),0) INTO rework_target_avg
    FROM public.performance_goals
   WHERE metric='rework_percent' AND period='monthly'
     AND reference_month=_month AND reference_year=_year
     AND (organization_id = _organization_id OR organization_id IS NULL);

  SELECT COALESCE(AVG(target_value),0) INTO tma_target_avg_hours
    FROM public.performance_goals
   WHERE metric='avg_resolution_hours' AND period='monthly'
     AND reference_month=_month AND reference_year=_year
     AND (organization_id = _organization_id OR organization_id IS NULL);

  SELECT COALESCE(SUM(target_value),0) INTO projects_target_total
    FROM public.performance_goals
   WHERE metric='project_tasks_done' AND period='monthly'
     AND reference_month=_month AND reference_year=_year
     AND (organization_id = _organization_id OR organization_id IS NULL);

  -- REAIS
  SELECT COUNT(*) INTO closed_month
    FROM public.tickets
   WHERE organization_id = _organization_id
     AND status IN ('Fechado','Aprovado')
     AND closed_at >= _from AND closed_at < _to;

  SELECT COUNT(DISTINCT h.ticket_id) INTO rework_month
    FROM public.ticket_history h
    JOIN public.tickets t ON t.id = h.ticket_id
   WHERE h.action='rework'
     AND t.organization_id = _organization_id
     AND h.created_at >= _from AND h.created_at < _to;

  rework_actual_percent := CASE WHEN closed_month > 0
    THEN ROUND((rework_month::numeric / closed_month) * 100, 2) ELSE 0 END;

  SELECT COALESCE(ROUND(AVG(e.score)::numeric, 2), 0), COUNT(e.score)
    INTO csat_actual_avg, csat_actual_count
    FROM public.evaluations e
    JOIN public.tickets t ON t.id = e.ticket_id
   WHERE e.type = 'satisfaction'
     AND t.organization_id = _organization_id
     AND e.created_at >= _from AND e.created_at < _to;

  -- Pontuação real: soma de categories.score dos tickets fechados no mês
  SELECT COALESCE(SUM(COALESCE(c.score,0)),0) INTO points_actual_total
    FROM public.tickets t
    LEFT JOIN public.categories c ON c.id = t.category_id
   WHERE t.organization_id = _organization_id
     AND t.status IN ('Fechado','Aprovado')
     AND t.closed_at >= _from AND t.closed_at < _to;

  -- TMA real do mês (horas úteis, started_at → closed_at)
  SELECT COALESCE(ROUND(AVG(public.business_minutes_between(t.started_at, t.closed_at)) / 60.0, 2), 0)
    INTO tma_actual_hours
    FROM public.tickets t
   WHERE t.organization_id = _organization_id
     AND t.status IN ('Fechado','Aprovado')
     AND t.started_at IS NOT NULL AND t.closed_at IS NOT NULL
     AND t.closed_at >= _from AND t.closed_at < _to;

  -- Projetos entregues no mês (project_tasks concluídas)
  SELECT COUNT(*) INTO projects_actual_total
    FROM public.project_tasks pt
   WHERE pt.organization_id = _organization_id
     AND pt.status = 'Concluído'
     AND pt.delivered_date >= _from_date AND pt.delivered_date < _to_date;

  -- Backlog das sprints ativas
  SELECT COUNT(*) INTO active_sprints_backlog
    FROM public.project_tasks pt
    JOIN public.sprints s ON s.id = pt.sprint_id
   WHERE pt.organization_id = _organization_id
     AND s.status = 'ativa'
     AND pt.status <> 'Concluído';

  RETURN jsonb_build_object(
    'preventivas_target_total', preventivas_target_total,
    'csat_target_avg', csat_target_avg,
    'points_target_total', points_target_total,
    'tickets_target_total', tickets_target_total,
    'rework_target_avg', rework_target_avg,
    'tma_target_avg_hours', tma_target_avg_hours,
    'projects_target_total', projects_target_total,
    'points_actual_total', points_actual_total,
    'csat_actual_avg', csat_actual_avg,
    'csat_actual_count', csat_actual_count,
    'rework_actual_percent', rework_actual_percent,
    'rework_month', rework_month,
    'tma_actual_hours', tma_actual_hours,
    'projects_actual_total', projects_actual_total,
    'closed_month', closed_month,
    'active_sprints_backlog', active_sprints_backlog
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tv_goals_summary(uuid, int, int) TO authenticated, service_role, anon;
