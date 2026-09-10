ALTER TABLE public.op_companies
  ADD COLUMN IF NOT EXISTS is_delivery boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_maintenance boolean NOT NULL DEFAULT true;