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
    -- Finalização efetiva pelo técnico: aguardando_aprovacao_at (fluxo normal)
    -- ou closed_at quando o ticket foi direto para Fechado/Aprovado (ex.: fechamento de sprint).
    -- Alinhado ao painel de TV.
    SELECT
      t.id,
      t.assigned_to,
      t.started_at,
      t.closed_at,
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