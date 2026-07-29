ALTER TABLE public.project_tasks
  ADD COLUMN IF NOT EXISTS converted_to_ticket boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS priority text;