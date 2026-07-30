ALTER TABLE public.op_service_orders
  ADD COLUMN IF NOT EXISTS supervisor_action_plan text,
  ADD COLUMN IF NOT EXISTS supervisor_action_due date,
  ADD COLUMN IF NOT EXISTS supervisor_action_by uuid,
  ADD COLUMN IF NOT EXISTS supervisor_action_at timestamptz;