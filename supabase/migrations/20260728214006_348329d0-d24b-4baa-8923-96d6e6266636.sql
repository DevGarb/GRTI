CREATE OR REPLACE FUNCTION public.get_mvp_chamados_metrics(_organization_id uuid, _year integer, _month integer)
 RETURNS TABLE(user_id uuid, full_name text, total_closed integer, on_time integer, on_time_rate numeric, csat_avg numeric, csat_count integer, csat_rate numeric, reworks integer, rework_rate numeric, category_points numeric, final_score numeric, award_level text, amount_brl numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _start timestamptz;
  _end   timestamptz;
BEGIN
  _start := make_timestamptz(_year, _month, 1, 0, 0, 0, 'America/Sao_Paulo');
  _end   := _start + interval '1 month';

  RETURN QUERY
  WITH goals AS (
    SELECT pg.target_id::uuid AS uid, pg.metric, pg.target_value
    FROM public.performance_goals pg
    LEFT JOIN public.profiles p ON p.user_id::text = pg.target_id
    WHERE pg.target_type = 'individual'
      AND pg.reference_year = _year
      AND pg.reference_month = _month
      AND (
        _organization_id IS NULL
        OR pg.organization_id = _organization_id
        OR (pg.organization_id IS NULL AND p.organization_id = _organization_id)
      )
  ),
  users_with_goals AS (
    SELECT DISTINCT uid FROM goals
  ),
  closed AS (
    SELECT t.id, t.assigned_to, t.category_id, t.closed_at, t.started_at
    FROM public.tickets t
    WHERE t.status = 'Fechado'
      AND t.closed_at >= _start AND t.closed_at < _end
      AND t.assigned_to IN (SELECT uid FROM users_with_goals)
      AND (_organization_id IS NULL OR t.organization_id = _organization_id)
  ),
  csat AS (
    SELECT c.assigned_to AS uid,
           AVG(e.score)::numeric AS avg_score,
           COUNT(e.score)::int   AS cnt
    FROM closed c
    JOIN public.evaluations e ON e.ticket_id = c.id AND e.type = 'satisfaction'
    GROUP BY c.assigned_to
  ),
  reworks AS (
    SELECT c.assigned_to AS uid, COUNT(*)::int AS cnt
    FROM closed c
    JOIN public.ticket_history h ON h.ticket_id = c.id AND h.action = 'rework'
    GROUP BY c.assigned_to
  ),
  cat_points AS (
    SELECT c.assigned_to AS uid, COALESCE(SUM(cat.score),0)::numeric AS pts
    FROM closed c
    LEFT JOIN public.categories cat ON cat.id = c.category_id
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
  work_min AS (
    SELECT c.assigned_to AS uid,
           SUM((EXTRACT(EPOCH FROM (f.at - c.started_at)) / 60.0))::numeric AS mins,
           COUNT(*)::int AS timed_cnt
    FROM closed c
    JOIN finished f ON f.ticket_id = c.id
    WHERE c.started_at IS NOT NULL AND f.at > c.started_at
    GROUP BY c.assigned_to
  ),
  preventivas AS (
    SELECT pm.created_by AS uid, COUNT(*)::int AS cnt
    FROM public.preventive_maintenance pm
    WHERE pm.created_at >= _start AND pm.created_at < _end
      AND pm.created_by IN (SELECT uid FROM users_with_goals)
    GROUP BY pm.created_by
  ),
  agg AS (
    SELECT c.assigned_to AS uid, COUNT(*)::int AS total_closed
    FROM closed c
    GROUP BY c.assigned_to
  ),
  base AS (
    SELECT u.uid,
           COALESCE(p.full_name, 'Sem nome') AS full_name,
           COALESCE(a.total_closed, 0) AS total_closed,
           COALESCE(cp.pts, 0)         AS total_points,
           COALESCE(cs.avg_score, 0)   AS avg_score,
           COALESCE(cs.cnt, 0)         AS evaluations_count,
           COALESCE(pv.cnt, 0)         AS preventivas_done,
           COALESCE(rw.cnt, 0)         AS rework_count,
           COALESCE(wm.mins, 0)        AS total_work_minutes,
           COALESCE(wm.timed_cnt, 0)   AS timed_tickets_count
    FROM users_with_goals u
    LEFT JOIN public.profiles p ON p.user_id = u.uid
    LEFT JOIN agg a         ON a.uid = u.uid
    LEFT JOIN csat cs       ON cs.uid = u.uid
    LEFT JOIN reworks rw    ON rw.uid = u.uid
    LEFT JOIN cat_points cp ON cp.uid = u.uid
    LEFT JOIN work_min wm   ON wm.uid = u.uid
    LEFT JOIN preventivas pv ON pv.uid = u.uid
  ),
  goal_eval AS (
    SELECT
      b.uid,
      g.metric,
      g.target_value,
      CASE g.metric
        WHEN 'tickets_closed'       THEN b.total_closed::numeric
        WHEN 'points'               THEN b.total_points
        WHEN 'avg_score'            THEN b.avg_score
        WHEN 'preventivas_done'     THEN b.preventivas_done::numeric
        WHEN 'avg_resolution_hours' THEN
          CASE WHEN b.timed_tickets_count > 0
               THEN FLOOR(b.total_work_minutes / b.timed_tickets_count / 60.0)::numeric
               ELSE NULL END
        WHEN 'rework_percent'       THEN
          CASE WHEN b.total_closed > 0
               THEN (b.rework_count::numeric * 100 / b.total_closed)
               ELSE 0 END
        ELSE NULL
      END AS current_value,
      g.metric IN ('avg_resolution_hours','rework_percent') AS is_inverse
    FROM base b
    JOIN goals g ON g.uid = b.uid
  ),
  goal_score AS (
    SELECT
      uid,
      COUNT(*) FILTER (WHERE current_value IS NOT NULL) AS total_goals,
      COUNT(*) FILTER (
        WHERE current_value IS NOT NULL
          AND ((is_inverse AND current_value <= target_value)
            OR (NOT is_inverse AND current_value >= target_value))
      ) AS met_goals
    FROM goal_eval
    GROUP BY uid
  )
  SELECT
    b.uid AS user_id,
    b.full_name,
    b.total_closed,
    COALESCE(gs.met_goals, 0)::int AS on_time,
    CASE WHEN COALESCE(gs.total_goals,0) > 0
         THEN ROUND(gs.met_goals::numeric * 100 / gs.total_goals, 2)
         ELSE 0 END AS on_time_rate,
    ROUND(b.avg_score, 2) AS csat_avg,
    b.evaluations_count AS csat_count,
    CASE WHEN b.evaluations_count > 0 THEN ROUND(b.avg_score * 20, 2) ELSE 100 END AS csat_rate,
    b.rework_count AS reworks,
    CASE WHEN b.total_closed > 0
         THEN ROUND(b.rework_count::numeric * 100 / b.total_closed, 2)
         ELSE 0 END AS rework_rate,
    b.total_points AS category_points,
    CASE WHEN COALESCE(gs.total_goals,0) > 0
         THEN ROUND(gs.met_goals::numeric * 100 / gs.total_goals, 2)
         ELSE 0 END AS final_score,
    CASE
      WHEN COALESCE(gs.total_goals,0) = 0 THEN 'none'
      WHEN gs.met_goals * 100.0 / gs.total_goals >= 100 THEN 'ouro'
      WHEN gs.met_goals * 100.0 / gs.total_goals >= 90  THEN 'prata'
      ELSE 'none'
    END AS award_level,
    CASE
      WHEN COALESCE(gs.total_goals,0) = 0 THEN 0
      WHEN gs.met_goals * 100.0 / gs.total_goals >= 100 THEN 500
      WHEN gs.met_goals * 100.0 / gs.total_goals >= 90  THEN 300
      ELSE 0
    END::numeric AS amount_brl
  FROM base b
  LEFT JOIN goal_score gs ON gs.uid = b.uid
  ORDER BY final_score DESC;
END;
$function$;