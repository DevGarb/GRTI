
CREATE OR REPLACE FUNCTION public.get_metas_tecnicos(_year integer DEFAULT (EXTRACT(year FROM now()))::integer, _month integer DEFAULT (EXTRACT(month FROM now()))::integer)
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
    SELECT c.id AS ticket_id, c.assigned_to, e.score::numeric AS score
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
      e.score::numeric AS score,
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
    COALESCE(ROUND(AVG(pt.score) FILTER (WHERE pt.score IS NOT NULL), 2), 0)::numeric AS avg_score,
    COUNT(pt.score) FILTER (WHERE pt.score IS NOT NULL)::int AS evaluations_count,
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
