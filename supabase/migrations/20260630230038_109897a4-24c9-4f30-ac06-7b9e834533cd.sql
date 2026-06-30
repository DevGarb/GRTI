
-- 1. Anomaly tracking table
CREATE TABLE IF NOT EXISTS public.ticket_tma_anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  assigned_to uuid,
  organization_id uuid,
  anomaly_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('baixa','media','alta','critica')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  dismissed boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ticket_id, anomaly_type)
);

CREATE INDEX IF NOT EXISTS idx_tma_anomalies_open
  ON public.ticket_tma_anomalies (organization_id, severity, detected_at DESC)
  WHERE reviewed_at IS NULL AND dismissed = false;

CREATE INDEX IF NOT EXISTS idx_tma_anomalies_tech
  ON public.ticket_tma_anomalies (assigned_to)
  WHERE reviewed_at IS NULL AND dismissed = false;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_tma_anomalies TO authenticated;
GRANT ALL ON public.ticket_tma_anomalies TO service_role;

ALTER TABLE public.ticket_tma_anomalies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view anomalies in their org"
  ON public.ticket_tma_anomalies FOR SELECT
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
    AND (
      organization_id IS NULL
      OR public.is_same_organization(organization_id)
    )
  );

CREATE POLICY "Admins update anomalies in their org"
  ON public.ticket_tma_anomalies FOR UPDATE
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
    AND (
      organization_id IS NULL
      OR public.is_same_organization(organization_id)
    )
  );

CREATE POLICY "System and admins insert anomalies"
  ON public.ticket_tma_anomalies FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Admins delete anomalies in their org"
  ON public.ticket_tma_anomalies FOR DELETE
  TO authenticated
  USING (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
    AND (
      organization_id IS NULL
      OR public.is_same_organization(organization_id)
    )
  );

CREATE TRIGGER trg_tma_anomalies_updated_at
  BEFORE UPDATE ON public.ticket_tma_anomalies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Detection function (READ ONLY over tickets/ticket_history; writes only to ticket_tma_anomalies)
CREATE OR REPLACE FUNCTION public.detect_tma_anomalies(
  _lookback_days int DEFAULT 60
)
RETURNS TABLE (
  anomaly_type text,
  inserted int,
  updated int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since timestamptz := now() - make_interval(days => _lookback_days);
BEGIN
  -- A) Closed without "Em Andamento"
  WITH src AS (
    SELECT t.id AS ticket_id, t.assigned_to, t.organization_id,
           jsonb_build_object(
             'closed_at', t.closed_at,
             'started_at', t.started_at,
             'created_at', t.created_at
           ) AS details
    FROM public.tickets t
    WHERE t.status = 'Fechado'
      AND t.closed_at >= v_since
      AND NOT EXISTS (
        SELECT 1 FROM public.ticket_history h
        WHERE h.ticket_id = t.id AND h.action = 'status_change' AND h.new_value = 'Em Andamento'
      )
  ), ins AS (
    INSERT INTO public.ticket_tma_anomalies (ticket_id, assigned_to, organization_id, anomaly_type, severity, details)
    SELECT ticket_id, assigned_to, organization_id, 'missing_em_andamento', 'alta', details
    FROM src
    ON CONFLICT (ticket_id, anomaly_type) DO UPDATE
      SET details = EXCLUDED.details, updated_at = now()
    RETURNING (xmax = 0) AS was_insert
  )
  SELECT 'missing_em_andamento',
         count(*) FILTER (WHERE was_insert)::int,
         count(*) FILTER (WHERE NOT was_insert)::int
  FROM ins
  INTO anomaly_type, inserted, updated;
  RETURN NEXT;

  -- B) Closed without close event
  WITH src AS (
    SELECT t.id AS ticket_id, t.assigned_to, t.organization_id,
           jsonb_build_object('closed_at', t.closed_at) AS details
    FROM public.tickets t
    WHERE t.status = 'Fechado'
      AND t.closed_at >= v_since
      AND NOT EXISTS (
        SELECT 1 FROM public.ticket_history h
        WHERE h.ticket_id = t.id
          AND h.action = 'status_change'
          AND h.new_value IN ('Aguardando Aprovação','Aprovado','Fechado')
      )
  ), ins AS (
    INSERT INTO public.ticket_tma_anomalies (ticket_id, assigned_to, organization_id, anomaly_type, severity, details)
    SELECT ticket_id, assigned_to, organization_id, 'missing_close_event', 'alta', details FROM src
    ON CONFLICT (ticket_id, anomaly_type) DO UPDATE
      SET details = EXCLUDED.details, updated_at = now()
    RETURNING (xmax = 0) AS was_insert
  )
  SELECT 'missing_close_event',
         count(*) FILTER (WHERE was_insert)::int,
         count(*) FILTER (WHERE NOT was_insert)::int
  FROM ins
  INTO anomaly_type, inserted, updated;
  RETURN NEXT;

  -- C) started_at after closed_at
  WITH src AS (
    SELECT t.id AS ticket_id, t.assigned_to, t.organization_id,
           jsonb_build_object('started_at', t.started_at, 'closed_at', t.closed_at) AS details
    FROM public.tickets t
    WHERE t.closed_at IS NOT NULL
      AND t.started_at IS NOT NULL
      AND t.started_at > t.closed_at
  ), ins AS (
    INSERT INTO public.ticket_tma_anomalies (ticket_id, assigned_to, organization_id, anomaly_type, severity, details)
    SELECT ticket_id, assigned_to, organization_id, 'started_after_closed', 'critica', details FROM src
    ON CONFLICT (ticket_id, anomaly_type) DO UPDATE
      SET details = EXCLUDED.details, updated_at = now()
    RETURNING (xmax = 0) AS was_insert
  )
  SELECT 'started_after_closed',
         count(*) FILTER (WHERE was_insert)::int,
         count(*) FILTER (WHERE NOT was_insert)::int
  FROM ins
  INTO anomaly_type, inserted, updated;
  RETURN NEXT;

  -- D) Inflated window (raw window > 5x useful gap)
  WITH src AS (
    SELECT t.id AS ticket_id, t.assigned_to, t.organization_id,
           EXTRACT(EPOCH FROM (t.closed_at - COALESCE(t.started_at, t.created_at)))/3600 AS raw_hours,
           jsonb_build_object(
             'raw_hours', round((EXTRACT(EPOCH FROM (t.closed_at - COALESCE(t.started_at, t.created_at)))/3600)::numeric, 2),
             'started_at', t.started_at,
             'closed_at', t.closed_at
           ) AS details
    FROM public.tickets t
    WHERE t.status = 'Fechado'
      AND t.closed_at >= v_since
      AND t.closed_at > COALESCE(t.started_at, t.created_at)
      AND EXTRACT(EPOCH FROM (t.closed_at - COALESCE(t.started_at, t.created_at)))/3600 > 100
  ), ins AS (
    INSERT INTO public.ticket_tma_anomalies (ticket_id, assigned_to, organization_id, anomaly_type, severity, details)
    SELECT ticket_id, assigned_to, organization_id, 'inflated_window', 'media', details FROM src
    ON CONFLICT (ticket_id, anomaly_type) DO UPDATE
      SET details = EXCLUDED.details, updated_at = now()
    RETURNING (xmax = 0) AS was_insert
  )
  SELECT 'inflated_window',
         count(*) FILTER (WHERE was_insert)::int,
         count(*) FILTER (WHERE NOT was_insert)::int
  FROM ins
  INTO anomaly_type, inserted, updated;
  RETURN NEXT;

  -- E) Picked but never started (open > 4h)
  WITH src AS (
    SELECT t.id AS ticket_id, t.assigned_to, t.organization_id,
           jsonb_build_object('picked_at', t.picked_at) AS details
    FROM public.tickets t
    WHERE t.status IN ('Aberto')
      AND t.picked_at IS NOT NULL
      AND t.picked_at < now() - interval '4 hours'
      AND NOT EXISTS (
        SELECT 1 FROM public.ticket_history h
        WHERE h.ticket_id = t.id AND h.action = 'status_change' AND h.new_value = 'Em Andamento'
      )
  ), ins AS (
    INSERT INTO public.ticket_tma_anomalies (ticket_id, assigned_to, organization_id, anomaly_type, severity, details)
    SELECT ticket_id, assigned_to, organization_id, 'assigned_without_started', 'baixa', details FROM src
    ON CONFLICT (ticket_id, anomaly_type) DO UPDATE
      SET details = EXCLUDED.details, updated_at = now()
    RETURNING (xmax = 0) AS was_insert
  )
  SELECT 'assigned_without_started',
         count(*) FILTER (WHERE was_insert)::int,
         count(*) FILTER (WHERE NOT was_insert)::int
  FROM ins
  INTO anomaly_type, inserted, updated;
  RETURN NEXT;

  -- F) Long open / em andamento with no activity (>7d)
  WITH src AS (
    SELECT t.id AS ticket_id, t.assigned_to, t.organization_id,
           jsonb_build_object('status', t.status, 'updated_at', t.updated_at) AS details
    FROM public.tickets t
    WHERE t.status IN ('Aberto','Em Andamento')
      AND t.updated_at < now() - interval '7 days'
  ), ins AS (
    INSERT INTO public.ticket_tma_anomalies (ticket_id, assigned_to, organization_id, anomaly_type, severity, details)
    SELECT ticket_id, assigned_to, organization_id, 'long_open_no_activity', 'media', details FROM src
    ON CONFLICT (ticket_id, anomaly_type) DO UPDATE
      SET details = EXCLUDED.details, updated_at = now()
    RETURNING (xmax = 0) AS was_insert
  )
  SELECT 'long_open_no_activity',
         count(*) FILTER (WHERE was_insert)::int,
         count(*) FILTER (WHERE NOT was_insert)::int
  FROM ins
  INTO anomaly_type, inserted, updated;
  RETURN NEXT;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.detect_tma_anomalies(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.detect_tma_anomalies(int) TO authenticated, service_role;
