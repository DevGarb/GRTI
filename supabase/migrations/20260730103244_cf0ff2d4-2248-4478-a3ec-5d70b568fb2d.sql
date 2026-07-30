ALTER TABLE public.op_service_orders
  ADD COLUMN IF NOT EXISTS award_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS award_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS award_notes text,
  ADD COLUMN IF NOT EXISTS award_validated_by uuid,
  ADD COLUMN IF NOT EXISTS award_validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS award_sent_at timestamptz;