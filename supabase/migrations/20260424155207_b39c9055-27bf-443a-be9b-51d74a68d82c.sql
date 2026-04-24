
-- ============================================================
-- 1. Estender tabela tickets
-- ============================================================
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS project_id uuid,
  ADD COLUMN IF NOT EXISTS sprint_id uuid,
  ADD COLUMN IF NOT EXISTS story_points integer DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_tickets_project_id ON public.tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_tickets_sprint_id ON public.tickets(sprint_id);

-- ============================================================
-- 2. Estender tabela projects
-- ============================================================
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS goal text,
  ADD COLUMN IF NOT EXISTS total_points_target integer NOT NULL DEFAULT 0;

-- ============================================================
-- 3. Nova tabela sprints
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  organization_id uuid,
  name text NOT NULL,
  goal text,
  status text NOT NULL DEFAULT 'planejada',
  start_date date,
  end_date date,
  capacity_points integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sprints_project_id ON public.sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_sprints_organization_id ON public.sprints(organization_id);

ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org sprints"
  ON public.sprints FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR organization_id IS NULL
    OR public.is_same_organization(organization_id)
  );

CREATE POLICY "Admins can insert sprints"
  ON public.sprints FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update sprints"
  ON public.sprints FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete sprints"
  ON public.sprints FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_sprints_updated_at
  BEFORE UPDATE ON public.sprints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. Nova tabela project_tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  sprint_id uuid,
  organization_id uuid,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo',
  story_points integer NOT NULL DEFAULT 1,
  assignee_id uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON public.project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_sprint_id ON public.project_tasks(sprint_id);

ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org project_tasks"
  ON public.project_tasks FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR organization_id IS NULL
    OR public.is_same_organization(organization_id)
  );

CREATE POLICY "Admins can insert project_tasks"
  ON public.project_tasks FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update project_tasks"
  ON public.project_tasks FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete project_tasks"
  ON public.project_tasks FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_project_tasks_updated_at
  BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 5. Trigger: validar sprint pertence ao mesmo projeto (tickets)
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_ticket_sprint_project()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  sprint_project uuid;
BEGIN
  IF NEW.sprint_id IS NOT NULL THEN
    SELECT project_id INTO sprint_project FROM public.sprints WHERE id = NEW.sprint_id;
    IF sprint_project IS NULL THEN
      RAISE EXCEPTION 'Sprint % não existe', NEW.sprint_id;
    END IF;
    IF NEW.project_id IS NULL THEN
      NEW.project_id := sprint_project;
    ELSIF NEW.project_id <> sprint_project THEN
      RAISE EXCEPTION 'Sprint pertence a outro projeto (esperado %, recebido %)', sprint_project, NEW.project_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_ticket_sprint_project ON public.tickets;
CREATE TRIGGER trg_validate_ticket_sprint_project
  BEFORE INSERT OR UPDATE OF project_id, sprint_id ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.validate_ticket_sprint_project();

-- ============================================================
-- 6. Trigger: validar sprint pertence ao mesmo projeto (project_tasks)
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_task_sprint_project()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  sprint_project uuid;
BEGIN
  IF NEW.sprint_id IS NOT NULL THEN
    SELECT project_id INTO sprint_project FROM public.sprints WHERE id = NEW.sprint_id;
    IF sprint_project IS NULL THEN
      RAISE EXCEPTION 'Sprint % não existe', NEW.sprint_id;
    END IF;
    IF NEW.project_id <> sprint_project THEN
      RAISE EXCEPTION 'Sprint pertence a outro projeto (esperado %, recebido %)', sprint_project, NEW.project_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_task_sprint_project ON public.project_tasks;
CREATE TRIGGER trg_validate_task_sprint_project
  BEFORE INSERT OR UPDATE OF project_id, sprint_id ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION public.validate_task_sprint_project();

-- ============================================================
-- 7. Realtime para sprints e project_tasks
-- ============================================================
ALTER TABLE public.sprints REPLICA IDENTITY FULL;
ALTER TABLE public.project_tasks REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sprints;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_tasks;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
