
CREATE OR REPLACE FUNCTION public.get_mvp_metrics(_organization_id uuid, _year integer, _month integer)
RETURNS TABLE(user_id uuid, full_name text, total_deliveries integer, on_time integer, reworks integer, on_time_rate numeric, quality_rate numeric, rework_rate numeric, op_efficiency numeric, final_score numeric, award_level text, amount_brl numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  IF _quality = 0 THEN _quality := 100; END IF;

  RETURN QUERY
  WITH task_deliveries AS (
    SELECT pt.assignee_id AS uid,
           1 AS delivery,
           CASE WHEN pt.planned_date IS NOT NULL AND pt.delivered_date <= pt.planned_date THEN 1
                WHEN pt.planned_date IS NULL THEN 1
                ELSE 0 END AS on_time,
           COALESCE(pt.rework_count, 0) AS reworks,
           0::numeric AS value_brl
    FROM public.project_tasks pt
    WHERE (_organization_id IS NULL OR pt.organization_id = _organization_id)
      AND pt.status = 'Concluído'
      AND pt.delivered_date >= _start::date AND pt.delivered_date < _end::date
      AND pt.assignee_id IS NOT NULL
  ),
  project_deliveries AS (
    SELECT COALESCE(pr.completed_by, pr.owner_id) AS uid,
           1 AS delivery,
           CASE WHEN pr.planned_end_date IS NULL THEN 1
                WHEN pr.completed_at::date <= pr.planned_end_date THEN 1
                ELSE 0 END AS on_time,
           0 AS reworks,
           COALESCE(pr.value_brl, 0)::numeric AS value_brl
    FROM public.projects pr
    WHERE (_organization_id IS NULL OR pr.organization_id = _organization_id)
      AND pr.completed_at IS NOT NULL
      AND pr.completed_at >= _start AND pr.completed_at < _end
      AND COALESCE(pr.completed_by, pr.owner_id) IS NOT NULL
  ),
  all_deliveries AS (
    SELECT * FROM task_deliveries
    UNION ALL
    SELECT * FROM project_deliveries
  ),
  agg AS (
    SELECT uid,
           SUM(delivery)::int AS total_deliveries,
           SUM(on_time)::int AS on_time,
           SUM(reworks)::int AS reworks,
           SUM(value_brl)::numeric AS total_value
    FROM all_deliveries
    GROUP BY uid
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
      WHEN a.total_value > 0 AND
           (CASE WHEN a.total_deliveries > 0 THEN a.on_time::numeric / a.total_deliveries ELSE 0 END)
           * (_quality / 100.0)
           * (1 - (CASE WHEN a.total_deliveries > 0 THEN LEAST(a.reworks, a.total_deliveries)::numeric / a.total_deliveries ELSE 0 END))
           * 100 >= 90 THEN a.total_value
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
$function$;
