CREATE OR REPLACE FUNCTION public.get_metas_tecnicos(_year integer, _month integer)
 RETURNS TABLE(user_id uuid, full_name text, total_closed integer, total_points numeric, avg_score numeric, evaluations_count integer, preventivas_done integer, rework_count integer, total_work_minutes numeric, tickets jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _org uuid;
  _is_super boolean;
  _start timestamptz;
  _end timestamptz;
BEGIN
  _is_super := public.is_super_admin(auth.uid());
  SELECT organization_id INTO _org FROM public.profiles WHERE profiles.user_id = auth.uid() LIMIT 1;
  IF _org IS NULL AND NOT _is_super THEN
    RETURN;
  END IF;

  _start := make_timestamptz(_year, _month, 1, 0, 0, 0, 'America/Sao_Paulo');
  _end := _start + interval '1 month';

  RETURN QUERY
  WITH closed AS (
    SELECT t.id, t.assigned_to, t.title, t.updated_at, t.category_id, t.started_at
    FROM public.tickets t
    WHERE t.status = 'Fechado'
      AND t.created_at >= _start
      AND t.created_at < _end
      AND t.assigned_to IS NOT NULL
      AND (_is_super OR t.organization_id = _org)
  ),
  meta_evals AS (
    SELECT e.ticket_id, e.score
    FROM public.evaluations e
    WHERE e.type = 'meta' AND e.ticket_id IN (SELECT id FROM closed)
  ),
  sat_evals AS (
    SELECT e.ticket_id, e.score
    FROM public.evaluations e
    WHERE e.type = 'satisfaction' AND e.ticket_id IN (SELECT id FROM closed)
  ),
  reworks AS (
    SELECT h.ticket_id, count(*)::int AS rc
    FROM public.ticket_history h
    WHERE h.action = 'rework' AND h.ticket_id IN (SELECT id FROM closed)
    GROUP BY h.ticket_id
  ),
  prev AS (
    SELECT pm.created_by, count(*)::int AS cnt
    FROM public.preventive_maintenance pm
    WHERE pm.created_at >= _start
      AND pm.created_at < _end
      AND (_is_super OR pm.organization_id = _org)
    GROUP BY pm.created_by
  ),
  events AS (
    SELECT h.ticket_id, h.old_value, h.new_value, h.created_at
    FROM public.ticket_history h
    WHERE h.action = 'status_change' AND h.ticket_id IN (SELECT id FROM closed)
  ),
  paired AS (
    SELECT
      ticket_id,
      CASE WHEN new_value = 'Em Andamento' THEN created_at END AS open_at,
      LEAD(created_at) OVER (PARTITION BY ticket_id ORDER BY created_at) AS close_at,
      LEAD(new_value) OVER (PARTITION BY ticket_id ORDER BY created_at) AS next_status
    FROM events
  ),
  rework_min AS (
    SELECT ticket_id, SUM(public.business_minutes_between(open_at, close_at)) AS mins
    FROM paired
    WHERE open_at IS NOT NULL
      AND close_at IS NOT NULL
      AND next_status IN ('Aguardando Aprovação','Aprovado','Fechado','Disponível','Aberto')
    GROUP BY ticket_id
  ),
  -- Janela inicial: do started_at até o primeiro status_change que sai de "Em Andamento".
  -- Cobre o caso em que a entrada em "Em Andamento" (auto-atribuição) não gerou um status_change.
  first_exit AS (
    SELECT ticket_id, MIN(created_at) AS at
    FROM events
    WHERE old_value = 'Em Andamento'
    GROUP BY ticket_id
  ),
  initial_min AS (
    SELECT c.id AS ticket_id,
           public.business_minutes_between(c.started_at, fe.at) AS mins
    FROM closed c
    JOIN first_exit fe ON fe.ticket_id = c.id
    WHERE c.started_at IS NOT NULL AND fe.at > c.started_at
  ),
  work_min AS (
    SELECT c.id AS ticket_id,
           COALESCE(im.mins, 0) + COALESCE(rm.mins, 0) AS mins
    FROM closed c
    LEFT JOIN initial_min im ON im.ticket_id = c.id
    LEFT JOIN rework_min rm ON rm.ticket_id = c.id
  ),
  per_ticket AS (
    SELECT
      c.id,
      c.assigned_to,
      c.title,
      c.updated_at,
      c.category_id,
      COALESCE(me.score, 0)::numeric AS points,
      se.score AS sat_score,
      COALESCE(wm.mins, 0)::numeric AS work_mins,
      COALESCE(rw.rc, 0)::int AS rwc
    FROM closed c
    LEFT JOIN meta_evals me ON me.ticket_id = c.id
    LEFT JOIN sat_evals se ON se.ticket_id = c.id
    LEFT JOIN work_min wm ON wm.ticket_id = c.id
    LEFT JOIN reworks rw ON rw.ticket_id = c.id
  )
  SELECT
    pt.assigned_to AS user_id,
    COALESCE(p.full_name, 'Sem nome') AS full_name,
    count(*)::int AS total_closed,
    COALESCE(SUM(pt.points), 0)::numeric AS total_points,
    COALESCE(AVG(pt.sat_score) FILTER (WHERE pt.sat_score IS NOT NULL), 0)::numeric AS avg_score,
    count(pt.sat_score)::int AS evaluations_count,
    COALESCE(MAX(pr.cnt), 0)::int AS preventivas_done,
    COALESCE(SUM(pt.rwc), 0)::int AS rework_count,
    COALESCE(SUM(pt.work_mins), 0)::numeric AS total_work_minutes,
    COALESCE(jsonb_agg(jsonb_build_object(
      'title', pt.title,
      'score', pt.sat_score,
      'resolution_hours', round((pt.work_mins / 60.0)::numeric, 2),
      'closed_at', pt.updated_at,
      'category_name', cat.name,
      'points', pt.points
    ) ORDER BY pt.updated_at DESC), '[]'::jsonb) AS tickets
  FROM per_ticket pt
  LEFT JOIN public.profiles p ON p.user_id = pt.assigned_to
  LEFT JOIN public.categories cat ON cat.id = pt.category_id
  LEFT JOIN prev pr ON pr.created_by = pt.assigned_to
  GROUP BY pt.assigned_to, p.full_name
  ORDER BY total_points DESC, avg_score DESC;
END;
$function$;