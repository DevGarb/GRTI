CREATE OR REPLACE FUNCTION public.get_management_metrics(_from timestamp with time zone, _to timestamp with time zone, _organization_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(user_id uuid, full_name text, closed_in_period integer, in_progress_now integer, total_assigned integer, awaiting_approval integer, points numeric, rework_count integer, rework_percent numeric, avg_csat numeric, csat_count integer, avg_handle_minutes numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _org uuid;
  _is_super boolean := public.is_super_admin(auth.uid());
BEGIN
  IF _organization_id IS NOT NULL AND _is_super THEN
    _org := _organization_id;
  ELSE
    SELECT organization_id INTO _org FROM public.profiles WHERE profiles.user_id = auth.uid() LIMIT 1;
  END IF;

  IF _org IS NULL AND NOT _is_super THEN RETURN; END IF;

  RETURN QUERY
  WITH techs AS (
    SELECT DISTINCT p.user_id, p.full_name
    FROM public.profiles p
    JOIN public.user_organization_roles uor ON uor.user_id = p.user_id AND uor.organization_id = p.organization_id
    WHERE (_org IS NULL OR p.organization_id = _org)
      AND uor.role IN ('tecnico'::app_role, 'desenvolvedor'::app_role, 'admin'::app_role)
  ),
  closed AS (
    SELECT
      t.id,
      t.assigned_to,
      t.started_at,
      t.closed_at,
      t.category_id,
      t.type,
      COALESCE(t.story_points, 0)::numeric AS story_points,
      COALESCE(t.aguardando_aprovacao_at, t.closed_at) AS effective_finish
    FROM public.tickets t
    WHERE t.status IN ('Fechado', 'Aprovado')
      AND t.assigned_to IS NOT NULL
      AND (_org IS NULL OR t.organization_id = _org)
      AND COALESCE(t.aguardando_aprovacao_at, t.closed_at) >= _from
      AND COALESCE(t.aguardando_aprovacao_at, t.closed_at) < _to
  ),
  in_prog AS (
    SELECT t.assigned_to, count(*)::int AS cnt FROM public.tickets t
    WHERE t.status = 'Em Andamento' AND t.assigned_to IS NOT NULL AND (_org IS NULL OR t.organization_id = _org)
    GROUP BY t.assigned_to
  ),
  total AS (
    SELECT t.assigned_to, count(*)::int AS cnt FROM public.tickets t
    WHERE t.assigned_to IS NOT NULL AND (_org IS NULL OR t.organization_id = _org)
      AND t.created_at >= _from AND t.created_at < _to
    GROUP BY t.assigned_to
  ),
  await AS (
    SELECT t.assigned_to, count(*)::int AS cnt FROM public.tickets t
    WHERE t.status = 'Aguardando Aprovação' AND t.assigned_to IS NOT NULL AND (_org IS NULL OR t.organization_id = _org)
    GROUP BY t.assigned_to
  ),
  meta_pts AS (
    SELECT c.assigned_to,
      SUM(COALESCE(cat.score::numeric, CASE WHEN c.type = 'Projeto' THEN c.story_points END, 0))::numeric AS pts
    FROM closed c LEFT JOIN public.categories cat ON cat.id = c.category_id
    GROUP BY c.assigned_to
  ),
  csat AS (
    SELECT c.assigned_to, AVG(e.score)::numeric AS avg_score, count(e.score)::int AS cnt
    FROM closed c JOIN public.evaluations e ON e.ticket_id = c.id AND e.type = 'satisfaction'
    GROUP BY c.assigned_to
  ),
  rework AS (
    SELECT c.assigned_to, count(DISTINCT c.id)::int AS cnt FROM closed c
    WHERE EXISTS (SELECT 1 FROM public.ticket_history h WHERE h.ticket_id = c.id AND h.action = 'rework')
    GROUP BY c.assigned_to
  ),
  events AS (
    SELECT h.ticket_id, h.old_value, h.new_value, h.created_at
    FROM public.ticket_history h
    WHERE h.action = 'status_change' AND h.ticket_id IN (SELECT id FROM closed)
  ),
  paired AS (
    SELECT ticket_id,
      CASE WHEN new_value = 'Em Andamento' THEN created_at END AS open_at,
      LEAD(created_at) OVER (PARTITION BY ticket_id ORDER BY created_at) AS close_at
    FROM events
  ),
  rework_min AS (
    SELECT ticket_id, SUM(public.business_minutes_between(open_at, close_at)) AS mins
    FROM paired WHERE open_at IS NOT NULL AND close_at IS NOT NULL
    GROUP BY ticket_id
  ),
  first_exit AS (
    SELECT ticket_id, MIN(created_at) AS at FROM events WHERE old_value = 'Em Andamento' GROUP BY ticket_id
  ),
  initial_min AS (
    SELECT c.id AS ticket_id, public.business_minutes_between(c.started_at, fe.at) AS mins
    FROM closed c JOIN first_exit fe ON fe.ticket_id = c.id
    WHERE c.started_at IS NOT NULL AND fe.at > c.started_at
  ),
  work_min AS (
    SELECT c.id AS ticket_id, COALESCE(im.mins, 0) + COALESCE(rm.mins, 0) AS mins
    FROM closed c
    LEFT JOIN initial_min im ON im.ticket_id = c.id
    LEFT JOIN rework_min rm ON rm.ticket_id = c.id
  ),
  handle AS (
    SELECT c.assigned_to, AVG(COALESCE(wm.mins, 0))::numeric AS mins
    FROM closed c LEFT JOIN work_min wm ON wm.ticket_id = c.id
    GROUP BY c.assigned_to
  ),
  cnt_closed AS (SELECT c.assigned_to, count(*)::int AS cnt FROM closed c GROUP BY c.assigned_to)
  SELECT
    techs.user_id,
    COALESCE(techs.full_name, 'Sem nome'),
    COALESCE(cc.cnt, 0)::int, COALESCE(ip.cnt, 0)::int, COALESCE(tot.cnt, 0)::int, COALESCE(aw.cnt, 0)::int,
    COALESCE(mp.pts, 0)::numeric, COALESCE(rw.cnt, 0)::int,
    CASE WHEN COALESCE(cc.cnt, 0) > 0 THEN ROUND((COALESCE(rw.cnt, 0)::numeric / cc.cnt) * 100, 2) ELSE 0 END,
    COALESCE(ROUND(cs.avg_score, 2), 0)::numeric, COALESCE(cs.cnt, 0)::int,
    COALESCE(ROUND(hd.mins, 2), 0)::numeric
  FROM techs
  LEFT JOIN cnt_closed cc ON cc.assigned_to = techs.user_id
  LEFT JOIN in_prog ip ON ip.assigned_to = techs.user_id
  LEFT JOIN total tot ON tot.assigned_to = techs.user_id
  LEFT JOIN await aw ON aw.assigned_to = techs.user_id
  LEFT JOIN meta_pts mp ON mp.assigned_to = techs.user_id
  LEFT JOIN csat cs ON cs.assigned_to = techs.user_id
  LEFT JOIN rework rw ON rw.assigned_to = techs.user_id
  LEFT JOIN handle hd ON hd.assigned_to = techs.user_id
  ORDER BY COALESCE(cc.cnt, 0) DESC, COALESCE(tot.cnt, 0) DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_management_metrics_admin(_from timestamp with time zone, _to timestamp with time zone, _organization_id uuid)
 RETURNS TABLE(user_id uuid, full_name text, closed_in_period integer, in_progress_now integer, total_assigned integer, awaiting_approval integer, points numeric, rework_count integer, rework_percent numeric, avg_csat numeric, csat_count integer, avg_handle_minutes numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH techs AS (
    SELECT DISTINCT p.user_id, p.full_name
    FROM public.profiles p
    JOIN public.user_organization_roles uor ON uor.user_id = p.user_id AND uor.organization_id = p.organization_id
    WHERE p.organization_id = _organization_id
      AND uor.role IN ('tecnico'::app_role, 'desenvolvedor'::app_role, 'admin'::app_role)
  ),
  closed AS (
    SELECT t.id, t.assigned_to, t.started_at, t.closed_at, t.category_id, t.type,
           COALESCE(t.story_points, 0)::numeric AS story_points,
           COALESCE(t.aguardando_aprovacao_at, t.closed_at) AS effective_finish
    FROM public.tickets t
    WHERE t.status IN ('Fechado','Aprovado')
      AND COALESCE(t.aguardando_aprovacao_at, t.closed_at) >= _from
      AND COALESCE(t.aguardando_aprovacao_at, t.closed_at) < _to
      AND t.assigned_to IS NOT NULL AND t.organization_id = _organization_id
  ),
  in_prog AS (
    SELECT t.assigned_to, count(*)::int AS cnt FROM public.tickets t
    WHERE t.status = 'Em Andamento' AND t.assigned_to IS NOT NULL AND t.organization_id = _organization_id
    GROUP BY t.assigned_to
  ),
  total AS (
    SELECT t.assigned_to, count(*)::int AS cnt FROM public.tickets t
    WHERE t.assigned_to IS NOT NULL AND t.organization_id = _organization_id
      AND t.created_at >= _from AND t.created_at < _to
    GROUP BY t.assigned_to
  ),
  await AS (
    SELECT t.assigned_to, count(*)::int AS cnt FROM public.tickets t
    WHERE t.status = 'Aguardando Aprovação' AND t.assigned_to IS NOT NULL AND t.organization_id = _organization_id
    GROUP BY t.assigned_to
  ),
  meta_pts AS (
    SELECT c.assigned_to,
      SUM(COALESCE(cat.score::numeric, CASE WHEN c.type = 'Projeto' THEN c.story_points END, 0))::numeric AS pts
    FROM closed c LEFT JOIN public.categories cat ON cat.id = c.category_id
    GROUP BY c.assigned_to
  ),
  csat AS (
    SELECT c.assigned_to, AVG(e.score)::numeric AS avg_score, count(e.score)::int AS cnt
    FROM closed c JOIN public.evaluations e ON e.ticket_id = c.id AND e.type = 'satisfaction'
    GROUP BY c.assigned_to
  ),
  rework AS (
    SELECT c.assigned_to, count(DISTINCT c.id)::int AS cnt FROM closed c
    WHERE EXISTS (SELECT 1 FROM public.ticket_history h WHERE h.ticket_id = c.id AND h.action = 'rework')
    GROUP BY c.assigned_to
  ),
  finished AS (
    SELECT h.ticket_id, MIN(h.created_at) AS at
    FROM public.ticket_history h
    WHERE h.action = 'status_change'
      AND h.new_value = 'Aguardando Aprovação'
      AND h.ticket_id IN (SELECT id FROM closed)
    GROUP BY h.ticket_id
  ),
  handle AS (
    SELECT c.assigned_to,
      AVG(EXTRACT(EPOCH FROM (COALESCE(f.at, c.effective_finish) - c.started_at)) / 60.0)::numeric AS mins
    FROM closed c
    LEFT JOIN finished f ON f.ticket_id = c.id
    WHERE c.started_at IS NOT NULL AND COALESCE(f.at, c.effective_finish) > c.started_at
    GROUP BY c.assigned_to
  ),
  cnt_closed AS (SELECT c.assigned_to, count(*)::int AS cnt FROM closed c GROUP BY c.assigned_to)
  SELECT
    techs.user_id,
    COALESCE(techs.full_name, 'Sem nome'),
    COALESCE(cc.cnt, 0)::int, COALESCE(ip.cnt, 0)::int, COALESCE(tot.cnt, 0)::int, COALESCE(aw.cnt, 0)::int,
    COALESCE(mp.pts, 0)::numeric, COALESCE(rw.cnt, 0)::int,
    CASE WHEN COALESCE(cc.cnt, 0) > 0 THEN ROUND((COALESCE(rw.cnt, 0)::numeric / cc.cnt) * 100, 2) ELSE 0 END,
    COALESCE(ROUND(cs.avg_score, 2), 0)::numeric, COALESCE(cs.cnt, 0)::int,
    COALESCE(ROUND(hd.mins, 2), 0)::numeric
  FROM techs
  LEFT JOIN cnt_closed cc ON cc.assigned_to = techs.user_id
  LEFT JOIN in_prog ip ON ip.assigned_to = techs.user_id
  LEFT JOIN total tot ON tot.assigned_to = techs.user_id
  LEFT JOIN await aw ON aw.assigned_to = techs.user_id
  LEFT JOIN meta_pts mp ON mp.assigned_to = techs.user_id
  LEFT JOIN csat cs ON cs.assigned_to = techs.user_id
  LEFT JOIN rework rw ON rw.assigned_to = techs.user_id
  LEFT JOIN handle hd ON hd.assigned_to = techs.user_id
  ORDER BY COALESCE(cc.cnt, 0) DESC, COALESCE(tot.cnt, 0) DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_tv_goals_summary(_organization_id uuid, _year integer, _month integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
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

  SELECT COALESCE(SUM(COALESCE(c.score::numeric, CASE WHEN t.type = 'Projeto' THEN COALESCE(t.story_points,0)::numeric END, 0)),0)
    INTO points_actual_total
    FROM public.tickets t
    LEFT JOIN public.categories c ON c.id = t.category_id
   WHERE t.organization_id = _organization_id
     AND t.status IN ('Fechado','Aprovado')
     AND COALESCE(t.aguardando_aprovacao_at, t.closed_at) >= _from
     AND COALESCE(t.aguardando_aprovacao_at, t.closed_at) < _to;

  WITH finished AS (
    SELECT h.ticket_id, MIN(h.created_at) AS finished_at
      FROM public.ticket_history h
     WHERE h.action = 'status_change'
       AND h.new_value = 'Aguardando Aprovação'
     GROUP BY h.ticket_id
  )
  SELECT COALESCE(ROUND(AVG(public.business_minutes_between(t.started_at, f.finished_at)) / 60.0, 2), 0)
    INTO tma_actual_hours
    FROM public.tickets t
    JOIN finished f ON f.ticket_id = t.id
   WHERE t.organization_id = _organization_id
     AND t.status IN ('Fechado','Aprovado')
     AND t.started_at IS NOT NULL
     AND f.finished_at >= _from AND f.finished_at < _to;

  SELECT COUNT(*) INTO projects_actual_total
    FROM public.project_tasks pt
   WHERE pt.organization_id = _organization_id
     AND pt.status = 'Concluído'
     AND pt.delivered_date >= _from_date AND pt.delivered_date < _to_date;

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