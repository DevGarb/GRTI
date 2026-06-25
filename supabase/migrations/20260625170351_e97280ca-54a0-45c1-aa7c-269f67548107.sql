
-- 1) Add 'track' column to mvp_awards
ALTER TABLE public.mvp_awards ADD COLUMN IF NOT EXISTS track text NOT NULL DEFAULT 'projetos';
ALTER TABLE public.mvp_awards DROP CONSTRAINT IF EXISTS mvp_awards_user_id_organization_id_year_month_key;
ALTER TABLE public.mvp_awards DROP CONSTRAINT IF EXISTS mvp_awards_user_id_organization_id_year_month_track_key;
ALTER TABLE public.mvp_awards ADD CONSTRAINT mvp_awards_user_id_organization_id_year_month_track_key UNIQUE (user_id, organization_id, year, month, track);

-- 2) get_mvp_chamados_metrics
CREATE OR REPLACE FUNCTION public.get_mvp_chamados_metrics(_organization_id uuid, _year integer, _month integer)
RETURNS TABLE(
  user_id uuid, full_name text,
  total_closed integer, on_time integer, on_time_rate numeric,
  csat_avg numeric, csat_count integer, csat_rate numeric,
  reworks integer, rework_rate numeric,
  category_points numeric,
  final_score numeric, award_level text, amount_brl numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _start timestamptz;
  _end timestamptz;
BEGIN
  _start := make_timestamptz(_year, _month, 1, 0, 0, 0, 'America/Sao_Paulo');
  _end := _start + interval '1 month';

  RETURN QUERY
  WITH closed AS (
    SELECT t.id, t.assigned_to, t.closed_at, t.due_date, t.category_id
    FROM public.tickets t
    WHERE t.status = 'Fechado'
      AND t.closed_at >= _start AND t.closed_at < _end
      AND t.assigned_to IS NOT NULL
      AND (_organization_id IS NULL OR t.organization_id = _organization_id)
  ),
  csat AS (
    SELECT c.assigned_to AS uid,
           AVG(e.score)::numeric AS avg_score,
           count(e.score)::int AS cnt
    FROM closed c
    JOIN public.evaluations e ON e.ticket_id = c.id AND e.type = 'satisfaction'
    GROUP BY c.assigned_to
  ),
  reworks AS (
    SELECT c.assigned_to AS uid, count(DISTINCT c.id)::int AS cnt
    FROM closed c
    WHERE EXISTS (
      SELECT 1 FROM public.ticket_history h
      WHERE h.ticket_id = c.id AND h.action = 'rework'
    )
    GROUP BY c.assigned_to
  ),
  cat_points AS (
    SELECT c.assigned_to AS uid, COALESCE(SUM(cat.score), 0)::numeric AS pts
    FROM closed c
    LEFT JOIN public.categories cat ON cat.id = c.category_id
    GROUP BY c.assigned_to
  ),
  agg AS (
    SELECT
      c.assigned_to AS uid,
      count(*)::int AS total_closed,
      SUM(CASE WHEN c.due_date IS NOT NULL AND c.closed_at::date <= c.due_date THEN 1 ELSE 0 END)::int AS on_time
    FROM closed c
    GROUP BY c.assigned_to
  )
  SELECT
    a.uid,
    COALESCE(p.full_name, 'Sem nome'),
    a.total_closed,
    a.on_time,
    CASE WHEN a.total_closed > 0 THEN ROUND(a.on_time::numeric * 100 / a.total_closed, 2) ELSE 0 END AS on_time_rate,
    COALESCE(ROUND(cs.avg_score, 2), 0)::numeric AS csat_avg,
    COALESCE(cs.cnt, 0)::int AS csat_count,
    CASE WHEN COALESCE(cs.cnt,0) > 0 THEN ROUND(cs.avg_score * 20, 2) ELSE 100 END AS csat_rate,
    COALESCE(rw.cnt, 0)::int AS reworks,
    CASE WHEN a.total_closed > 0 THEN ROUND(LEAST(COALESCE(rw.cnt,0), a.total_closed)::numeric * 100 / a.total_closed, 2) ELSE 0 END AS rework_rate,
    COALESCE(cp.pts, 0)::numeric AS category_points,
    ROUND(
      (CASE WHEN a.total_closed > 0 THEN a.on_time::numeric / a.total_closed ELSE 0 END)
      * (CASE WHEN COALESCE(cs.cnt,0) > 0 THEN (cs.avg_score * 20) / 100.0 ELSE 1 END)
      * (1 - (CASE WHEN a.total_closed > 0 THEN LEAST(COALESCE(rw.cnt,0), a.total_closed)::numeric / a.total_closed ELSE 0 END))
      * 100, 2) AS final_score,
    CASE
      WHEN (CASE WHEN a.total_closed > 0 THEN a.on_time::numeric / a.total_closed ELSE 0 END)
        * (CASE WHEN COALESCE(cs.cnt,0) > 0 THEN (cs.avg_score * 20) / 100.0 ELSE 1 END)
        * (1 - (CASE WHEN a.total_closed > 0 THEN LEAST(COALESCE(rw.cnt,0), a.total_closed)::numeric / a.total_closed ELSE 0 END))
        * 100 >= 100 THEN 'ouro'
      WHEN (CASE WHEN a.total_closed > 0 THEN a.on_time::numeric / a.total_closed ELSE 0 END)
        * (CASE WHEN COALESCE(cs.cnt,0) > 0 THEN (cs.avg_score * 20) / 100.0 ELSE 1 END)
        * (1 - (CASE WHEN a.total_closed > 0 THEN LEAST(COALESCE(rw.cnt,0), a.total_closed)::numeric / a.total_closed ELSE 0 END))
        * 100 >= 90 THEN 'prata'
      ELSE 'none'
    END AS award_level,
    CASE
      WHEN (CASE WHEN a.total_closed > 0 THEN a.on_time::numeric / a.total_closed ELSE 0 END)
        * (CASE WHEN COALESCE(cs.cnt,0) > 0 THEN (cs.avg_score * 20) / 100.0 ELSE 1 END)
        * (1 - (CASE WHEN a.total_closed > 0 THEN LEAST(COALESCE(rw.cnt,0), a.total_closed)::numeric / a.total_closed ELSE 0 END))
        * 100 >= 100 THEN 500
      WHEN (CASE WHEN a.total_closed > 0 THEN a.on_time::numeric / a.total_closed ELSE 0 END)
        * (CASE WHEN COALESCE(cs.cnt,0) > 0 THEN (cs.avg_score * 20) / 100.0 ELSE 1 END)
        * (1 - (CASE WHEN a.total_closed > 0 THEN LEAST(COALESCE(rw.cnt,0), a.total_closed)::numeric / a.total_closed ELSE 0 END))
        * 100 >= 90 THEN 300
      ELSE 0
    END::numeric AS amount_brl
  FROM agg a
  LEFT JOIN public.profiles p ON p.user_id = a.uid
  LEFT JOIN csat cs ON cs.uid = a.uid
  LEFT JOIN reworks rw ON rw.uid = a.uid
  LEFT JOIN cat_points cp ON cp.uid = a.uid
  ORDER BY final_score DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_mvp_chamados_metrics(uuid, integer, integer) TO authenticated;

-- 3) compute_mvp_awards: agora calcula nas duas trilhas
CREATE OR REPLACE FUNCTION public.compute_mvp_awards(_organization_id uuid, _year integer, _month integer)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  r record;
  n int := 0;
  pen_mvp numeric;
  pen_quality numeric;
  disqual boolean;
  adj_final numeric;
  adj_quality numeric;
  adj_level text;
  adj_amount numeric;
BEGIN
  IF NOT (public.is_super_admin(auth.uid()) OR public.has_role_in_org(auth.uid(), 'admin'::app_role, _organization_id)) THEN
    RAISE EXCEPTION 'Apenas administradores podem calcular premiações';
  END IF;

  -- Trilha PROJETOS
  FOR r IN SELECT * FROM public.get_mvp_metrics(_organization_id, _year, _month) LOOP
    SELECT COALESCE(SUM(percent_impact),0), COALESCE(SUM(quality_impact),0), bool_or(disqualify)
      INTO pen_mvp, pen_quality, disqual
    FROM public.mvp_penalties
    WHERE user_id = r.user_id AND organization_id = _organization_id
      AND year = _year AND month = _month AND status = 'aprovado';

    adj_quality := GREATEST(r.quality_rate - pen_quality, 0);
    adj_final := GREATEST(r.final_score - pen_mvp, 0);

    IF disqual THEN adj_level := 'none'; adj_amount := 0;
    ELSIF adj_final >= 100 THEN adj_level := 'ouro'; adj_amount := 500;
    ELSIF adj_final >= 90 THEN adj_level := 'prata'; adj_amount := 300;
    ELSE adj_level := 'none'; adj_amount := 0;
    END IF;

    INSERT INTO public.mvp_awards(
      user_id, organization_id, year, month, track,
      on_time_rate, quality_rate, rework_rate, final_score,
      award_level, amount_brl, status
    ) VALUES (
      r.user_id, _organization_id, _year, _month, 'projetos',
      r.on_time_rate, adj_quality, r.rework_rate, adj_final,
      adj_level, adj_amount, 'pendente'
    )
    ON CONFLICT (user_id, organization_id, year, month, track) DO UPDATE SET
      on_time_rate = EXCLUDED.on_time_rate,
      quality_rate = EXCLUDED.quality_rate,
      rework_rate = EXCLUDED.rework_rate,
      final_score = EXCLUDED.final_score,
      award_level = EXCLUDED.award_level,
      amount_brl = EXCLUDED.amount_brl,
      status = CASE WHEN public.mvp_awards.status = 'aprovado' THEN 'aprovado' ELSE 'pendente' END,
      updated_at = now();
    n := n + 1;
  END LOOP;

  -- Trilha CHAMADOS
  FOR r IN SELECT * FROM public.get_mvp_chamados_metrics(_organization_id, _year, _month) LOOP
    SELECT COALESCE(SUM(percent_impact),0), COALESCE(SUM(quality_impact),0), bool_or(disqualify)
      INTO pen_mvp, pen_quality, disqual
    FROM public.mvp_penalties
    WHERE user_id = r.user_id AND organization_id = _organization_id
      AND year = _year AND month = _month AND status = 'aprovado';

    adj_quality := GREATEST(r.csat_rate - pen_quality, 0);
    adj_final := GREATEST(r.final_score - pen_mvp, 0);

    IF disqual THEN adj_level := 'none'; adj_amount := 0;
    ELSIF adj_final >= 100 THEN adj_level := 'ouro'; adj_amount := 500;
    ELSIF adj_final >= 90 THEN adj_level := 'prata'; adj_amount := 300;
    ELSE adj_level := 'none'; adj_amount := 0;
    END IF;

    INSERT INTO public.mvp_awards(
      user_id, organization_id, year, month, track,
      on_time_rate, quality_rate, rework_rate, final_score,
      award_level, amount_brl, status
    ) VALUES (
      r.user_id, _organization_id, _year, _month, 'chamados',
      r.on_time_rate, adj_quality, r.rework_rate, adj_final,
      adj_level, adj_amount, 'pendente'
    )
    ON CONFLICT (user_id, organization_id, year, month, track) DO UPDATE SET
      on_time_rate = EXCLUDED.on_time_rate,
      quality_rate = EXCLUDED.quality_rate,
      rework_rate = EXCLUDED.rework_rate,
      final_score = EXCLUDED.final_score,
      award_level = EXCLUDED.award_level,
      amount_brl = EXCLUDED.amount_brl,
      status = CASE WHEN public.mvp_awards.status = 'aprovado' THEN 'aprovado' ELSE 'pendente' END,
      updated_at = now();
    n := n + 1;
  END LOOP;

  RETURN n;
END $$;

-- 4) get_mvp_team_ranking: incluir bloco "chamados"
CREATE OR REPLACE FUNCTION public.get_mvp_team_ranking(_organization_id uuid, _year integer, _month integer)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _start timestamptz;
  _end timestamptz;
  users_rank jsonb;
  chamados_rank jsonb;
  sprints_rank jsonb;
  projects_rank jsonb;
BEGIN
  _start := make_timestamptz(_year, _month, 1, 0, 0, 0, 'America/Sao_Paulo');
  _end := _start + interval '1 month';

  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.final_score DESC), '[]'::jsonb)
    INTO users_rank
  FROM public.get_mvp_metrics(_organization_id, _year, _month) r;

  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.final_score DESC), '[]'::jsonb)
    INTO chamados_rank
  FROM public.get_mvp_chamados_metrics(_organization_id, _year, _month) r;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', s.id, 'name', s.name,
    'project_id', s.project_id,
    'quality_score', s.quality_score,
    'closed_at', s.closed_at,
    'delivered', (SELECT count(*) FROM public.project_tasks pt WHERE pt.sprint_id = s.id AND pt.status = 'Concluído'),
    'reworks', (SELECT COALESCE(SUM(rework_count),0) FROM public.project_tasks pt WHERE pt.sprint_id = s.id)
  ) ORDER BY s.quality_score DESC NULLS LAST), '[]'::jsonb)
    INTO sprints_rank
  FROM public.sprints s
  WHERE (_organization_id IS NULL OR s.organization_id = _organization_id)
    AND s.closed_at >= _start AND s.closed_at < _end;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id, 'name', p.name, 'progress', p.progress_percent,
    'delivered', (SELECT count(*) FROM public.project_tasks pt WHERE pt.project_id = p.id AND pt.status = 'Concluído' AND pt.delivered_date >= _start::date AND pt.delivered_date < _end::date),
    'reworks', (SELECT COALESCE(SUM(rework_count),0) FROM public.project_tasks pt WHERE pt.project_id = p.id)
  ) ORDER BY p.progress_percent DESC), '[]'::jsonb)
    INTO projects_rank
  FROM public.projects p
  WHERE (_organization_id IS NULL OR p.organization_id = _organization_id);

  RETURN jsonb_build_object(
    'users', users_rank,
    'chamados', chamados_rank,
    'sprints', sprints_rank,
    'projects', projects_rank
  );
END $$;
