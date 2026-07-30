ALTER TABLE public.op_service_orders
  ADD COLUMN IF NOT EXISTS supervisor_alert boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supervisor_alert_reason text,
  ADD COLUMN IF NOT EXISTS supervisor_alert_note text,
  ADD COLUMN IF NOT EXISTS supervisor_alert_at timestamptz,
  ADD COLUMN IF NOT EXISTS supervisor_alert_by uuid,
  ADD COLUMN IF NOT EXISTS supervisor_alert_resolved_at timestamptz;