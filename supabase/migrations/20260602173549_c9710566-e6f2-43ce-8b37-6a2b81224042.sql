-- 1) Tabela de configuração do relatório gerencial por organização
CREATE TABLE public.management_report_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE,
  webhook_url text,
  send_time time NOT NULL DEFAULT '08:00',
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  is_active boolean NOT NULL DEFAULT false,
  last_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.management_report_config TO authenticated;
GRANT ALL ON public.management_report_config TO service_role;

ALTER TABLE public.management_report_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view org report config"
  ON public.management_report_config FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR (is_same_organization(organization_id) AND has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Admins can insert org report config"
  ON public.management_report_config FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin(auth.uid())
    OR (is_same_organization(organization_id) AND has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Admins can update org report config"
  ON public.management_report_config FOR UPDATE TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR (is_same_organization(organization_id) AND has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Admins can delete org report config"
  ON public.management_report_config FOR DELETE TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR (is_same_organization(organization_id) AND has_role(auth.uid(), 'admin'::app_role))
  );

CREATE TRIGGER mrc_update_updated_at
  BEFORE UPDATE ON public.management_report_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) RPC de métricas gerenciais
CREATE OR REPLACE FUNCTION public.get_management_metrics(
  _from timestamptz,
  _to timestamptz,
  _organization_id uuid DEFAULT NULL
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
DECLARE
  _org uuid;
  _is_super boolean := public.is_super_admin(auth.uid());
BEGIN
  IF _organization_id IS NOT NULL AND _is_super THEN
    _org := _organization_id;
  ELSE
    SELECT organization_id INTO _org FROM public.profiles WHERE profiles.user_id = auth.uid() LIMIT 1;
  END IF;

  IF _org IS NULL AND NOT _is_super THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH techs AS (
    SELECT DISTINCT p.user_id, p.full_name
    FROM public.profiles p
    JOIN public.user_organization_roles uor
      ON uor.user_id = p.user_id
     AND uor.organization_id = p.organization_id
    WHERE (_org IS NULL OR p.organization_id = _org)
      AND uor.role IN ('tecnico'::app_role, 'desenvolvedor'::app_role, 'admin'::app_role)
  ),
  closed AS (
    SELECT t.id, t.assigned_to, t.started_at, t.closed_at
    FROM public.tickets t
    WHERE t.status = 'Fechado'
      AND t.closed_at >= _from
      AND t.closed_at < _to
      AND t.assigned_to IS NOT NULL
      AND (_org IS NULL OR t.organization_id = _org)
  ),
  in_prog AS (
    SELECT t.assigned_to, count(*)::int AS cnt
    FROM public.tickets t
    WHERE t.status = 'Em Andamento'
      AND t.assigned_to IS NOT NULL
      AND (_org IS NULL OR t.organization_id = _org)
    GROUP BY t.assigned_to
  ),
  total AS (
    SELECT t.assigned_to, count(*)::int AS cnt
    FROM public.tickets t
    WHERE t.assigned_to IS NOT NULL
      AND (_org IS NULL OR t.organization_id = _org)
    GROUP BY t.assigned_to
  ),
  await AS (
    SELECT t.assigned_to, count(*)::int AS cnt
    FROM public.tickets t
    WHERE t.status = 'Aguardando Aprovação'
      AND t.assigned_to IS NOT NULL
      AND (_org IS NULL OR t.organization_id = _org)
    GROUP BY t.assigned_to
  ),
  meta_pts AS (
    SELECT c.assigned_to, SUM(COALESCE(e.score, 0))::numeric AS pts
    FROM closed c
    LEFT JOIN public.evaluations e ON e.ticket_id = c.id AND e.type = 'meta'
    GROUP BY c.assigned_to
  ),
  csat AS (
    SELECT c.assigned_to,
           AVG(e.score)::numeric AS avg_score,
           count(e.score)::int AS cnt
    FROM closed c
    JOIN public.evaluations e ON e.ticket_id = c.id AND e.type = 'satisfaction'
    GROUP BY c.assigned_to
  ),
  rework AS (
    SELECT c.assigned_to, count(DISTINCT c.id)::int AS cnt
    FROM closed c
    WHERE EXISTS (SELECT 1 FROM public.ticket_history h WHERE h.ticket_id = c.id AND h.action = 'rework')
    GROUP BY c.assigned_to
  ),
  handle AS (
    SELECT c.assigned_to,
           AVG(public.business_minutes_between(c.started_at, c.closed_at))::numeric AS mins
    FROM closed c
    WHERE c.started_at IS NOT NULL AND c.closed_at IS NOT NULL
    GROUP BY c.assigned_to
  ),
  cnt_closed AS (
    SELECT c.assigned_to, count(*)::int AS cnt
    FROM closed c GROUP BY c.assigned_to
  )
  SELECT
    techs.user_id,
    COALESCE(techs.full_name, 'Sem nome') AS full_name,
    COALESCE(cc.cnt, 0)::int AS closed_in_period,
    COALESCE(ip.cnt, 0)::int AS in_progress_now,
    COALESCE(tot.cnt, 0)::int AS total_assigned,
    COALESCE(aw.cnt, 0)::int AS awaiting_approval,
    COALESCE(mp.pts, 0)::numeric AS points,
    COALESCE(rw.cnt, 0)::int AS rework_count,
    CASE WHEN COALESCE(cc.cnt, 0) > 0
         THEN ROUND((COALESCE(rw.cnt, 0)::numeric / cc.cnt) * 100, 2)
         ELSE 0 END AS rework_percent,
    COALESCE(ROUND(cs.avg_score, 2), 0)::numeric AS avg_csat,
    COALESCE(cs.cnt, 0)::int AS csat_count,
    COALESCE(ROUND(hd.mins, 2), 0)::numeric AS avg_handle_minutes
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

GRANT EXECUTE ON FUNCTION public.get_management_metrics(timestamptz, timestamptz, uuid) TO authenticated, service_role;