
DROP FUNCTION IF EXISTS public.detect_tma_anomalies(int);

CREATE FUNCTION public.detect_tma_anomalies(_lookback_days int DEFAULT 60)
RETURNS TABLE (result_type text, result_inserted int, result_updated int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since timestamptz := now() - make_interval(days => _lookback_days);
  v_ins int;
  v_upd int;
BEGIN
  WITH src AS (
    SELECT t.id AS t_id, t.assigned_to AS t_assigned, t.organization_id AS t_org,
           jsonb_build_object('closed_at', t.closed_at, 'started_at', t.started_at, 'created_at', t.created_at) AS d
    FROM public.tickets t
    WHERE t.status = 'Fechado' AND t.closed_at >= v_since
      AND NOT EXISTS (SELECT 1 FROM public.ticket_history h
        WHERE h.ticket_id = t.id AND h.action='status_change' AND h.new_value='Em Andamento')
  ), ins AS (
    INSERT INTO public.ticket_tma_anomalies (ticket_id, assigned_to, organization_id, anomaly_type, severity, details)
    SELECT t_id, t_assigned, t_org, 'missing_em_andamento', 'alta', d FROM src
    ON CONFLICT (ticket_id, anomaly_type) DO UPDATE SET details = EXCLUDED.details, updated_at = now()
    RETURNING (xmax = 0) AS was_insert
  )
  SELECT count(*) FILTER (WHERE was_insert)::int, count(*) FILTER (WHERE NOT was_insert)::int
    INTO v_ins, v_upd FROM ins;
  result_type := 'missing_em_andamento'; result_inserted := v_ins; result_updated := v_upd; RETURN NEXT;

  WITH src AS (
    SELECT t.id AS t_id, t.assigned_to AS t_assigned, t.organization_id AS t_org,
           jsonb_build_object('closed_at', t.closed_at) AS d
    FROM public.tickets t
    WHERE t.status = 'Fechado' AND t.closed_at >= v_since
      AND NOT EXISTS (SELECT 1 FROM public.ticket_history h
        WHERE h.ticket_id=t.id AND h.action='status_change'
          AND h.new_value IN ('Aguardando Aprovação','Aprovado','Fechado'))
  ), ins AS (
    INSERT INTO public.ticket_tma_anomalies (ticket_id, assigned_to, organization_id, anomaly_type, severity, details)
    SELECT t_id, t_assigned, t_org, 'missing_close_event', 'alta', d FROM src
    ON CONFLICT (ticket_id, anomaly_type) DO UPDATE SET details = EXCLUDED.details, updated_at = now()
    RETURNING (xmax = 0) AS was_insert
  )
  SELECT count(*) FILTER (WHERE was_insert)::int, count(*) FILTER (WHERE NOT was_insert)::int
    INTO v_ins, v_upd FROM ins;
  result_type := 'missing_close_event'; result_inserted := v_ins; result_updated := v_upd; RETURN NEXT;

  WITH src AS (
    SELECT t.id AS t_id, t.assigned_to AS t_assigned, t.organization_id AS t_org,
           jsonb_build_object('started_at', t.started_at, 'closed_at', t.closed_at) AS d
    FROM public.tickets t
    WHERE t.closed_at IS NOT NULL AND t.started_at IS NOT NULL AND t.started_at > t.closed_at
  ), ins AS (
    INSERT INTO public.ticket_tma_anomalies (ticket_id, assigned_to, organization_id, anomaly_type, severity, details)
    SELECT t_id, t_assigned, t_org, 'started_after_closed', 'critica', d FROM src
    ON CONFLICT (ticket_id, anomaly_type) DO UPDATE SET details = EXCLUDED.details, updated_at = now()
    RETURNING (xmax = 0) AS was_insert
  )
  SELECT count(*) FILTER (WHERE was_insert)::int, count(*) FILTER (WHERE NOT was_insert)::int
    INTO v_ins, v_upd FROM ins;
  result_type := 'started_after_closed'; result_inserted := v_ins; result_updated := v_upd; RETURN NEXT;

  WITH src AS (
    SELECT t.id AS t_id, t.assigned_to AS t_assigned, t.organization_id AS t_org,
           jsonb_build_object(
             'raw_hours', round((EXTRACT(EPOCH FROM (t.closed_at - COALESCE(t.started_at, t.created_at)))/3600)::numeric, 2),
             'started_at', t.started_at, 'closed_at', t.closed_at) AS d
    FROM public.tickets t
    WHERE t.status='Fechado' AND t.closed_at >= v_since
      AND t.closed_at > COALESCE(t.started_at, t.created_at)
      AND EXTRACT(EPOCH FROM (t.closed_at - COALESCE(t.started_at, t.created_at)))/3600 > 100
  ), ins AS (
    INSERT INTO public.ticket_tma_anomalies (ticket_id, assigned_to, organization_id, anomaly_type, severity, details)
    SELECT t_id, t_assigned, t_org, 'inflated_window', 'media', d FROM src
    ON CONFLICT (ticket_id, anomaly_type) DO UPDATE SET details = EXCLUDED.details, updated_at = now()
    RETURNING (xmax = 0) AS was_insert
  )
  SELECT count(*) FILTER (WHERE was_insert)::int, count(*) FILTER (WHERE NOT was_insert)::int
    INTO v_ins, v_upd FROM ins;
  result_type := 'inflated_window'; result_inserted := v_ins; result_updated := v_upd; RETURN NEXT;

  WITH src AS (
    SELECT t.id AS t_id, t.assigned_to AS t_assigned, t.organization_id AS t_org,
           jsonb_build_object('picked_at', t.picked_at) AS d
    FROM public.tickets t
    WHERE t.status='Aberto' AND t.picked_at IS NOT NULL
      AND t.picked_at < now() - interval '4 hours'
      AND NOT EXISTS (SELECT 1 FROM public.ticket_history h
        WHERE h.ticket_id=t.id AND h.action='status_change' AND h.new_value='Em Andamento')
  ), ins AS (
    INSERT INTO public.ticket_tma_anomalies (ticket_id, assigned_to, organization_id, anomaly_type, severity, details)
    SELECT t_id, t_assigned, t_org, 'assigned_without_started', 'baixa', d FROM src
    ON CONFLICT (ticket_id, anomaly_type) DO UPDATE SET details = EXCLUDED.details, updated_at = now()
    RETURNING (xmax = 0) AS was_insert
  )
  SELECT count(*) FILTER (WHERE was_insert)::int, count(*) FILTER (WHERE NOT was_insert)::int
    INTO v_ins, v_upd FROM ins;
  result_type := 'assigned_without_started'; result_inserted := v_ins; result_updated := v_upd; RETURN NEXT;

  WITH src AS (
    SELECT t.id AS t_id, t.assigned_to AS t_assigned, t.organization_id AS t_org,
           jsonb_build_object('status', t.status, 'updated_at', t.updated_at) AS d
    FROM public.tickets t
    WHERE t.status IN ('Aberto','Em Andamento') AND t.updated_at < now() - interval '7 days'
  ), ins AS (
    INSERT INTO public.ticket_tma_anomalies (ticket_id, assigned_to, organization_id, anomaly_type, severity, details)
    SELECT t_id, t_assigned, t_org, 'long_open_no_activity', 'media', d FROM src
    ON CONFLICT (ticket_id, anomaly_type) DO UPDATE SET details = EXCLUDED.details, updated_at = now()
    RETURNING (xmax = 0) AS was_insert
  )
  SELECT count(*) FILTER (WHERE was_insert)::int, count(*) FILTER (WHERE NOT was_insert)::int
    INTO v_ins, v_upd FROM ins;
  result_type := 'long_open_no_activity'; result_inserted := v_ins; result_updated := v_upd; RETURN NEXT;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.detect_tma_anomalies(int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.detect_tma_anomalies(int) FROM anon;
GRANT EXECUTE ON FUNCTION public.detect_tma_anomalies(int) TO authenticated, service_role;
