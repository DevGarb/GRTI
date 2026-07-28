CREATE OR REPLACE FUNCTION public.get_mvp_chamados_metrics(_organization_id uuid, _year integer, _month integer)
 RETURNS TABLE(user_id uuid, full_name text, total_closed integer, on_time integer, on_time_rate numeric, csat_avg numeric, csat_count integer, csat_rate numeric, reworks integer, rework_rate numeric, category_points numeric, final_score numeric, award_level text, amount_brl numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH metas AS (
    SELECT
      (m->>'user_id')::uuid AS uid,
      (m->>'full_name')::text AS full_name,
      COALESCE((m->>'total_closed')::int, 0) AS total_closed,
      COALESCE((m->>'total_points')::numeric, 0) AS total_points,
      COALESCE((m->>'avg_score')::numeric, 0) AS avg_score,
      COALESCE((m->>'evaluations_count')::int, 0) AS evaluations_count,
      COALESCE((m->>'preventivas_done')::int, 0) AS preventivas_done,
      COALESCE((m->>'rework_count')::int, 0) AS rework_count,
      COALESCE((m->>'total_work_minutes')::numeric, 0) AS total_work_minutes,
      COALESCE((m->>'timed_tickets_count')::int, 0) AS timed_tickets_count
    FROM (
      SELECT to_jsonb(t) AS m FROM public.get_metas_tecnicos(_year, _month) t
    ) s
  ),
  goals AS (
    SELECT pg.target_id::uuid AS uid, pg.metric, pg.target_value
    FROM public.performance_goals pg
    WHERE pg.target_type = 'individual'
      AND pg.reference_year = _year
      AND pg.reference_month = _month
      AND (_organization_id IS NULL OR pg.organization_id = _organization_id)
  ),
  users_with_goals AS (
    SELECT DISTINCT uid FROM goals
  ),
  base AS (
    SELECT u.uid,
           COALESCE(m.full_name, p.full_name, 'Sem nome') AS full_name,
           COALESCE(m.total_closed, 0) AS total_closed,
           COALESCE(m.total_points, 0) AS total_points,
           COALESCE(m.avg_score, 0) AS avg_score,
           COALESCE(m.evaluations_count, 0) AS evaluations_count,
           COALESCE(m.preventivas_done, 0) AS preventivas_done,
           COALESCE(m.rework_count, 0) AS rework_count,
           COALESCE(m.total_work_minutes, 0) AS total_work_minutes,
           COALESCE(m.timed_tickets_count, 0) AS timed_tickets_count
    FROM users_with_goals u
    LEFT JOIN metas m ON m.uid = u.uid
    LEFT JOIN public.profiles p ON p.user_id = u.uid
  ),
  goal_eval AS (
    SELECT
      b.uid,
      g.metric,
      g.target_value,
      CASE g.metric
        WHEN 'tickets_closed'      THEN b.total_closed::numeric
        WHEN 'points'              THEN b.total_points
        WHEN 'avg_score'           THEN b.avg_score
        WHEN 'preventivas_done'    THEN b.preventivas_done::numeric
        WHEN 'avg_resolution_hours' THEN
          CASE WHEN b.timed_tickets_count > 0
               THEN FLOOR(b.total_work_minutes / b.timed_tickets_count / 60.0)::numeric
               ELSE NULL END
        WHEN 'rework_percent'      THEN
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