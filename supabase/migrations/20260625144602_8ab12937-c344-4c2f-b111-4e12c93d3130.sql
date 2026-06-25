CREATE OR REPLACE FUNCTION public.get_management_metrics(_from timestamp with time zone, _to timestamp with time zone, _organization_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(user_id uuid, full_name text, closed_in_period integer, in_progress_now integer, total_assigned integer, awaiting_approval integer, points numeric, rework_count integer, rework_percent numeric, avg_csat numeric, csat_count integer, avg_handle_minutes numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    SELECT t.id, t.assigned_to, t.started_at, t.closed_at
    FROM public.tickets t
    WHERE t.status = 'Fechado' AND t.closed_at >= _from AND t.closed_at < _to
      AND t.assigned_to IS NOT NULL AND (_org IS NULL OR t.organization_id = _org)
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
    SELECT c.assigned_to, SUM(COALESCE(e.score, 0))::numeric AS pts
    FROM closed c LEFT JOIN public.evaluations e ON e.ticket_id = c.id AND e.type = 'meta'
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
$function$;

CREATE OR REPLACE FUNCTION public.get_management_metrics_admin(_from timestamp with time zone, _to timestamp with time zone, _organization_id uuid)
RETURNS TABLE(user_id uuid, full_name text, closed_in_period integer, in_progress_now integer, total_assigned integer, awaiting_approval integer, points numeric, rework_count integer, rework_percent numeric, avg_csat numeric, csat_count integer, avg_handle_minutes numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    SELECT t.id, t.assigned_to, t.started_at, t.closed_at
    FROM public.tickets t
    WHERE t.status = 'Fechado' AND t.closed_at >= _from AND t.closed_at < _to
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
    SELECT c.assigned_to, SUM(COALESCE(e.score, 0))::numeric AS pts
    FROM closed c LEFT JOIN public.evaluations e ON e.ticket_id = c.id AND e.type = 'meta'
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
$function$;

CREATE OR REPLACE FUNCTION public.get_metas_tecnicos(_year integer DEFAULT EXTRACT(year FROM now())::integer, _month integer DEFAULT EXTRACT(month FROM now())::integer)
RETURNS TABLE(user_id uuid, full_name text, total_closed integer, total_points numeric, avg_score numeric, evaluations_count integer, preventivas_done integer, rework_count integer, total_work_minutes numeric, tickets jsonb)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  start_date timestamptz;
  end_date timestamptz;
  org_id uuid;
BEGIN
  start_date := make_timestamptz(_year, _month, 1, 0, 0, 0, 'America/Sao_Paulo');
  end_date := start_date + interval '1 month';

  SELECT p.organization_id INTO org_id
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1;

  RETURN QUERY
  WITH techs AS (
    SELECT DISTINCT p.user_id, p.full_name
    FROM public.profiles p
    JOIN public.user_organization_roles uor ON uor.user_id = p.user_id AND uor.organization_id = p.organization_id
    WHERE p.organization_id = org_id
      AND uor.role IN ('tecnico'::app_role, 'desenvolvedor'::app_role, 'admin'::app_role)
  ),
  closed AS (
    SELECT t.id, t.title, t.assigned_to, t.category_id, t.closed_at, t.created_at, t.started_at
    FROM public.tickets t
    WHERE t.status = 'Fechado'
      AND t.closed_at >= start_date
      AND t.closed_at < end_date
      AND t.assigned_to IS NOT NULL
      AND t.organization_id = org_id
  ),
  evals AS (
    SELECT c.id AS ticket_id, c.assigned_to, COALESCE(e.score, 0)::numeric AS score
    FROM closed c
    LEFT JOIN public.evaluations e ON e.ticket_id = c.id AND e.type = 'meta'
  ),
  reworks AS (
    SELECT h.ticket_id, COUNT(*)::int AS rwc
    FROM public.ticket_history h
    WHERE h.action = 'rework' AND h.ticket_id IN (SELECT id FROM closed)
    GROUP BY h.ticket_id
  ),
  preventivas AS (
    SELECT pm.created_by AS user_id, COUNT(*)::int AS cnt
    FROM public.preventive_maintenance pm
    WHERE pm.created_at >= start_date AND pm.created_at < end_date
    GROUP BY pm.created_by
  ),
  events AS (
    SELECT h.ticket_id, h.old_value, h.new_value, h.created_at
    FROM public.ticket_history h
    WHERE h.action = 'status_change' AND h.ticket_id IN (SELECT id FROM closed)
  ),
  rework_min AS (
    SELECT ticket_id, SUM(public.business_minutes_between(open_at, close_at)) AS mins
    FROM (
      SELECT ticket_id,
        CASE WHEN new_value = 'Em Andamento' THEN created_at END AS open_at,
        LEAD(created_at) OVER (PARTITION BY ticket_id ORDER BY created_at) AS close_at
      FROM events
    ) x
    WHERE open_at IS NOT NULL AND close_at IS NOT NULL
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
  per_ticket AS (
    SELECT
      c.assigned_to,
      c.id,
      c.title,
      c.closed_at,
      COALESCE(e.score, 0)::numeric AS score,
      cat.name AS category_name,
      COALESCE(cat.score, e.score, 0)::numeric AS points,
      COALESCE(wm.mins, 0)::numeric AS work_minutes,
      COALESCE(rw.rwc, 0)::int AS rwc
    FROM closed c
    LEFT JOIN evals e ON e.ticket_id = c.id
    LEFT JOIN public.categories cat ON cat.id = c.category_id
    LEFT JOIN work_min wm ON wm.ticket_id = c.id
    LEFT JOIN reworks rw ON rw.ticket_id = c.id
  )
  SELECT
    techs.user_id,
    COALESCE(techs.full_name, 'Sem nome'),
    COUNT(pt.id)::int AS total_closed,
    COALESCE(SUM(pt.points), 0)::numeric AS total_points,
    CASE WHEN COUNT(pt.id) > 0 THEN ROUND(AVG(pt.score), 2) ELSE 0 END::numeric AS avg_score,
    COUNT(pt.id)::int AS evaluations_count,
    COALESCE(prev.cnt, 0)::int AS preventivas_done,
    COALESCE(SUM(pt.rwc), 0)::int AS rework_count,
    COALESCE(SUM(pt.work_minutes), 0)::numeric AS total_work_minutes,
    COALESCE(jsonb_agg(jsonb_build_object(
      'title', pt.title,
      'score', pt.score,
      'resolution_hours', ROUND((pt.work_minutes / 60.0)::numeric, 2),
      'closed_at', pt.closed_at,
      'category_name', pt.category_name,
      'points', pt.points
    ) ORDER BY pt.closed_at DESC) FILTER (WHERE pt.id IS NOT NULL), '[]'::jsonb) AS tickets
  FROM techs
  LEFT JOIN per_ticket pt ON pt.assigned_to = techs.user_id
  LEFT JOIN preventivas prev ON prev.user_id = techs.user_id
  GROUP BY techs.user_id, techs.full_name, prev.cnt
  ORDER BY total_points DESC, total_closed DESC;
END;
$function$;