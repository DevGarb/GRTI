ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS size text,
  ADD COLUMN IF NOT EXISTS value_brl numeric(12,2),
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_by uuid;

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_size_check;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_size_check CHECK (size IS NULL OR size IN ('pequeno','medio','grande'));