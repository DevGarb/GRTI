ALTER TABLE public.op_service_orders
  ADD COLUMN IF NOT EXISTS with_customer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS with_customer_at timestamptz;