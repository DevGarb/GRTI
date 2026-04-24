-- 1) Drop triggers que dependem das funções/colunas
DROP TRIGGER IF EXISTS trg_enforce_sprint_capacity_tickets ON public.tickets;
DROP TRIGGER IF EXISTS trg_enforce_sprint_capacity_tasks ON public.project_tasks;
DROP TRIGGER IF EXISTS trg_log_ticket_sprint_change ON public.tickets;
DROP TRIGGER IF EXISTS trg_log_sprint_change ON public.sprints;
DROP TRIGGER IF EXISTS trg_snapshot_sprint_metrics ON public.sprints;
DROP TRIGGER IF EXISTS trg_enforce_sprint_status_transition ON public.sprints;

-- 2) Drop funções não mais usadas
DROP FUNCTION IF EXISTS public.enforce_sprint_capacity() CASCADE;
DROP FUNCTION IF EXISTS public.log_ticket_sprint_change() CASCADE;
DROP FUNCTION IF EXISTS public.log_sprint_change() CASCADE;
DROP FUNCTION IF EXISTS public.snapshot_sprint_metrics() CASCADE;
DROP FUNCTION IF EXISTS public.enforce_sprint_status_transition() CASCADE;

-- 3) Drop tabelas auxiliares
DROP TABLE IF EXISTS public.sprint_metrics CASCADE;
DROP TABLE IF EXISTS public.sprint_planning_history CASCADE;
DROP TABLE IF EXISTS public.technician_capacity CASCADE;

-- 4) Drop colunas não usadas
ALTER TABLE public.projects
  DROP COLUMN IF EXISTS total_points_target,
  DROP COLUMN IF EXISTS enforce_capacity,
  DROP COLUMN IF EXISTS max_critical_per_sprint,
  DROP COLUMN IF EXISTS enforce_technician_capacity;

ALTER TABLE public.sprints
  DROP COLUMN IF EXISTS capacity_points;