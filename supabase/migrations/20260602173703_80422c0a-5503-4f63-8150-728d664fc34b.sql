CREATE OR REPLACE FUNCTION public.get_management_metrics_admin(
  _from timestamptz,
  _to timestamptz,
  _organization_id uuid
)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  closed_in_period integer,
  in_progress_now integer,
  total_assigned integer,
  awaiting_approval integer,
  points numeric,
  rework_count integer,
  rework_percent numeric,
  avg_csat numeric,
  csat_count integer,
  avg_handle_minutes numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH techs AS (
    SELECT DISTINCT p.user_id, p.full_name
    FROM public.profiles p
    JOIN public.user_organization_roles uor
      ON uor.user_id = p.user_id
     AND uor.organization_id = p.organization_id
    WHERE p.organization_id = _organization_id
      AND uor.role IN ('tecnico'::app_role, 'desenvolvedor'::app_role, 'admin'::app_role)
  ),
  closed AS (
    SELECT t.id, t.assigned_to, t.started_at, t.closed_at
    FROM public.tickets t
    WHERE t.status = 'Fechado'
      AND t.closed_at >= _from
      AND t.closed_at < _to
      AND t.assigned_to IS NOT NULL
      AND t.organization_id = _organization_id
  ),
  in_prog AS (
    SELECT t.assigned_to, count(*)::int AS cnt FROM public.tickets t
    WHERE t.status = 'Em Andamento' AND t.assigned_to IS NOT NULL AND t.organization_id = _organization_id
    GROUP BY t.assigned_to
  ),
  total AS (
    SELECT t.assigned_to, count(*)::int AS cnt FROM public.tickets t
    WHERE t.assigned_to IS NOT NULL AND t.organization_id = _organization_id
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
  handle AS (
    SELECT c.assigned_to, AVG(public.business_minutes_between(c.started_at, c.closed_at))::numeric AS mins
    FROM closed c WHERE c.started_at IS NOT NULL AND c.closed_at IS NOT NULL
    GROUP BY c.assigned_to
  ),
  cnt_closed AS (
    SELECT c.assigned_to, count(*)::int AS cnt FROM closed c GROUP BY c.assigned_to
  )
  SELECT
    techs.user_id,
    COALESCE(techs.full_name, 'Sem nome'),
    COALESCE(cc.cnt, 0)::int,
    COALESCE(ip.cnt, 0)::int,
    COALESCE(tot.cnt, 0)::int,
    COALESCE(aw.cnt, 0)::int,
    COALESCE(mp.pts, 0)::numeric,
    COALESCE(rw.cnt, 0)::int,
    CASE WHEN COALESCE(cc.cnt, 0) > 0
         THEN ROUND((COALESCE(rw.cnt, 0)::numeric / cc.cnt) * 100, 2) ELSE 0 END,
    COALESCE(ROUND(cs.avg_score, 2), 0)::numeric,
    COALESCE(cs.cnt, 0)::int,
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
  ORDER BY closed_in_period DESC, total_assigned DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_management_metrics_admin(timestamptz, timestamptz, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_management_metrics_admin(timestamptz, timestamptz, uuid) TO service_role;