-- =========================================================
-- SPRINT MANAGEMENT — ROBUSTEZ
-- Hard/soft cap, status fechada, histórico, métricas, capacidade
-- =========================================================

-- 1. PROJECTS: configurações de execução
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS enforce_capacity boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_critical_per_sprint int NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS enforce_technician_capacity boolean NOT NULL DEFAULT false;

-- 2. SPRINTS: garante que status aceita 'fechada' (text livre, ok)
-- snapshot helper column
ALTER TABLE public.sprints
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

-- 3. SPRINT_PLANNING_HISTORY
CREATE TABLE IF NOT EXISTS public.sprint_planning_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id uuid NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  organization_id uuid,
  user_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  context text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sph_sprint ON public.sprint_planning_history(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sph_project ON public.sprint_planning_history(project_id);

ALTER TABLE public.sprint_planning_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view sprint history"
ON public.sprint_planning_history FOR SELECT TO authenticated
USING (
  is_super_admin(auth.uid())
  OR organization_id IS NULL
  OR is_same_organization(organization_id)
);

CREATE POLICY "Authenticated can insert sprint history"
ON public.sprint_planning_history FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- 4. SPRINT_METRICS (snapshot)
CREATE TABLE IF NOT EXISTS public.sprint_metrics (
  sprint_id uuid PRIMARY KEY REFERENCES public.sprints(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  organization_id uuid,
  planned_points int NOT NULL DEFAULT 0,
  planned_tickets int NOT NULL DEFAULT 0,
  planned_tasks int NOT NULL DEFAULT 0,
  delivered_points int NOT NULL DEFAULT 0,
  delivered_tickets int NOT NULL DEFAULT 0,
  delivered_tasks int NOT NULL DEFAULT 0,
  scope_added_points int NOT NULL DEFAULT 0,
  scope_removed_points int NOT NULL DEFAULT 0,
  efficiency_pct numeric,
  scope_change_pct numeric,
  predictability_pct numeric,
  capacity_at_close int,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sm_project ON public.sprint_metrics(project_id);

ALTER TABLE public.sprint_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view sprint metrics"
ON public.sprint_metrics FOR SELECT TO authenticated
USING (
  is_super_admin(auth.uid())
  OR organization_id IS NULL
  OR is_same_organization(organization_id)
);

-- 5. TECHNICIAN_CAPACITY
CREATE TABLE IF NOT EXISTS public.technician_capacity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid,
  organization_id uuid NOT NULL,
  points_per_sprint int NOT NULL DEFAULT 8,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tech_cap
  ON public.technician_capacity(user_id, COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid));

ALTER TABLE public.technician_capacity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view technician capacity"
ON public.technician_capacity FOR SELECT TO authenticated
USING (
  is_super_admin(auth.uid())
  OR is_same_organization(organization_id)
);

CREATE POLICY "Admins can manage technician capacity"
ON public.technician_capacity FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND is_same_organization(organization_id))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND is_same_organization(organization_id));

CREATE TRIGGER trg_tech_cap_updated
BEFORE UPDATE ON public.technician_capacity
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_sprint_metrics_updated
BEFORE UPDATE ON public.sprint_metrics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 6. ENFORCE SPRINT CAPACITY (tickets & tasks)
-- =========================================================
CREATE OR REPLACE FUNCTION public.enforce_sprint_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sprint sprints%ROWTYPE;
  v_project projects%ROWTYPE;
  v_current_points int;
  v_critical_count int;
  v_assignee uuid;
  v_assignee_points int;
  v_assignee_cap int;
  v_assignee_name text;
BEGIN
  IF NEW.sprint_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_sprint FROM public.sprints WHERE id = NEW.sprint_id;
  IF v_sprint.id IS NULL THEN
    RAISE EXCEPTION 'Sprint % não existe', NEW.sprint_id;
  END IF;

  -- bloqueia tudo em sprint fechada/cancelada
  IF v_sprint.status = 'fechada' THEN
    RAISE EXCEPTION 'Sprint "%" está fechada e não aceita alterações de escopo', v_sprint.name;
  END IF;
  IF v_sprint.status = 'cancelada' THEN
    RAISE EXCEPTION 'Sprint "%" está cancelada', v_sprint.name;
  END IF;

  SELECT * INTO v_project FROM public.projects WHERE id = v_sprint.project_id;

  -- soma atual da sprint (excluindo o próprio registro em update)
  SELECT COALESCE((
    SELECT SUM(story_points) FROM public.tickets
    WHERE sprint_id = NEW.sprint_id
      AND (TG_OP <> 'UPDATE' OR TG_TABLE_NAME <> 'tickets' OR id <> NEW.id)
  ), 0) + COALESCE((
    SELECT SUM(story_points) FROM public.project_tasks
    WHERE sprint_id = NEW.sprint_id
      AND (TG_OP <> 'UPDATE' OR TG_TABLE_NAME <> 'project_tasks' OR id <> NEW.id)
  ), 0)
  INTO v_current_points;

  -- hard cap de capacidade
  IF v_project.enforce_capacity
     AND v_sprint.capacity_points > 0
     AND (v_current_points + COALESCE(NEW.story_points, 0)) > v_sprint.capacity_points THEN
    RAISE EXCEPTION 'Capacidade da sprint excedida: % / % pts',
      v_current_points + COALESCE(NEW.story_points, 0), v_sprint.capacity_points;
  END IF;

  -- limite de chamados críticos (apenas tickets)
  IF TG_TABLE_NAME = 'tickets' AND NEW.priority = 'Crítica' AND v_project.max_critical_per_sprint > 0 THEN
    SELECT COUNT(*) INTO v_critical_count
    FROM public.tickets
    WHERE sprint_id = NEW.sprint_id
      AND priority = 'Crítica'
      AND id <> NEW.id;
    IF v_critical_count >= v_project.max_critical_per_sprint THEN
      RAISE EXCEPTION 'Limite de chamados críticos atingido (% por sprint)', v_project.max_critical_per_sprint;
    END IF;
  END IF;

  -- capacidade por técnico
  IF v_project.enforce_technician_capacity THEN
    v_assignee := CASE WHEN TG_TABLE_NAME = 'tickets' THEN NEW.assigned_to ELSE NEW.assignee_id END;
    IF v_assignee IS NOT NULL THEN
      SELECT COALESCE(points_per_sprint, 0) INTO v_assignee_cap
      FROM public.technician_capacity
      WHERE user_id = v_assignee AND (project_id = v_sprint.project_id OR project_id IS NULL)
      ORDER BY project_id NULLS LAST LIMIT 1;

      IF v_assignee_cap IS NOT NULL AND v_assignee_cap > 0 THEN
        SELECT COALESCE((
          SELECT SUM(story_points) FROM public.tickets
          WHERE sprint_id = NEW.sprint_id AND assigned_to = v_assignee
            AND (TG_OP <> 'UPDATE' OR TG_TABLE_NAME <> 'tickets' OR id <> NEW.id)
        ), 0) + COALESCE((
          SELECT SUM(story_points) FROM public.project_tasks
          WHERE sprint_id = NEW.sprint_id AND assignee_id = v_assignee
            AND (TG_OP <> 'UPDATE' OR TG_TABLE_NAME <> 'project_tasks' OR id <> NEW.id)
        ), 0)
        INTO v_assignee_points;

        IF (v_assignee_points + COALESCE(NEW.story_points, 0)) > v_assignee_cap THEN
          SELECT full_name INTO v_assignee_name FROM public.profiles WHERE user_id = v_assignee LIMIT 1;
          RAISE EXCEPTION 'Capacidade do técnico % excedida: % / % pts',
            COALESCE(v_assignee_name, 'desconhecido'),
            v_assignee_points + COALESCE(NEW.story_points, 0),
            v_assignee_cap;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_capacity_tickets ON public.tickets;
CREATE TRIGGER trg_enforce_capacity_tickets
BEFORE INSERT OR UPDATE OF sprint_id, story_points, assigned_to, priority ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.enforce_sprint_capacity();

DROP TRIGGER IF EXISTS trg_enforce_capacity_tasks ON public.project_tasks;
CREATE TRIGGER trg_enforce_capacity_tasks
BEFORE INSERT OR UPDATE OF sprint_id, story_points, assignee_id ON public.project_tasks
FOR EACH ROW EXECUTE FUNCTION public.enforce_sprint_capacity();

-- =========================================================
-- 7. STATUS TRANSITION VALIDATION
-- =========================================================
CREATE OR REPLACE FUNCTION public.enforce_sprint_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'fechada' AND NEW.status <> 'fechada' THEN
    RAISE EXCEPTION 'Sprint fechada é irreversível';
  END IF;

  -- transições válidas
  IF NOT (
    (OLD.status = 'planejada' AND NEW.status IN ('ativa','cancelada')) OR
    (OLD.status = 'ativa'     AND NEW.status IN ('planejada','concluida','cancelada')) OR
    (OLD.status = 'concluida' AND NEW.status IN ('ativa','fechada','cancelada')) OR
    (OLD.status = 'cancelada' AND NEW.status = 'planejada')
  ) THEN
    RAISE EXCEPTION 'Transição de status inválida: % → %', OLD.status, NEW.status;
  END IF;

  -- carimbos automáticos
  IF NEW.status = 'ativa' AND OLD.status <> 'ativa' THEN
    NEW.activated_at := now();
  END IF;
  IF NEW.status = 'fechada' THEN
    NEW.closed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sprint_status_transition ON public.sprints;
CREATE TRIGGER trg_sprint_status_transition
BEFORE UPDATE OF status ON public.sprints
FOR EACH ROW EXECUTE FUNCTION public.enforce_sprint_status_transition();

-- =========================================================
-- 8. LOG SPRINT PLANNING CHANGES
-- =========================================================
CREATE OR REPLACE FUNCTION public.log_ticket_sprint_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sprint_id uuid;
  v_project_id uuid;
  v_org uuid;
BEGIN
  -- ticket adicionado a uma sprint
  IF TG_OP = 'INSERT' AND NEW.sprint_id IS NOT NULL THEN
    INSERT INTO public.sprint_planning_history(sprint_id, project_id, organization_id, user_id, action, entity_type, entity_id, new_value, context)
    VALUES (NEW.sprint_id, NEW.project_id, NEW.organization_id, COALESCE(auth.uid(), NEW.created_by),
            'ticket_added', 'ticket', NEW.id,
            jsonb_build_object('story_points', NEW.story_points, 'priority', NEW.priority, 'title', NEW.title),
            'system');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- ticket entrou em sprint
    IF NEW.sprint_id IS DISTINCT FROM OLD.sprint_id THEN
      IF OLD.sprint_id IS NOT NULL THEN
        SELECT project_id, organization_id INTO v_project_id, v_org FROM public.sprints WHERE id = OLD.sprint_id;
        INSERT INTO public.sprint_planning_history(sprint_id, project_id, organization_id, user_id, action, entity_type, entity_id, old_value, context)
        VALUES (OLD.sprint_id, COALESCE(v_project_id, OLD.project_id), v_org, COALESCE(auth.uid(), NEW.created_by),
                'ticket_removed', 'ticket', OLD.id,
                jsonb_build_object('story_points', OLD.story_points, 'title', OLD.title), 'system');
      END IF;
      IF NEW.sprint_id IS NOT NULL THEN
        INSERT INTO public.sprint_planning_history(sprint_id, project_id, organization_id, user_id, action, entity_type, entity_id, new_value, context)
        VALUES (NEW.sprint_id, NEW.project_id, NEW.organization_id, COALESCE(auth.uid(), NEW.created_by),
                'ticket_added', 'ticket', NEW.id,
                jsonb_build_object('story_points', NEW.story_points, 'priority', NEW.priority, 'title', NEW.title),
                'system');
      END IF;
    -- pontos alterados dentro da mesma sprint
    ELSIF NEW.story_points IS DISTINCT FROM OLD.story_points AND NEW.sprint_id IS NOT NULL THEN
      INSERT INTO public.sprint_planning_history(sprint_id, project_id, organization_id, user_id, action, entity_type, entity_id, old_value, new_value, context)
      VALUES (NEW.sprint_id, NEW.project_id, NEW.organization_id, COALESCE(auth.uid(), NEW.created_by),
              'points_changed', 'ticket', NEW.id,
              jsonb_build_object('story_points', OLD.story_points),
              jsonb_build_object('story_points', NEW.story_points), 'system');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_ticket_sprint ON public.tickets;
CREATE TRIGGER trg_log_ticket_sprint
AFTER INSERT OR UPDATE OF sprint_id, story_points ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.log_ticket_sprint_change();

CREATE OR REPLACE FUNCTION public.log_sprint_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.sprint_planning_history(sprint_id, project_id, organization_id, user_id, action, entity_type, entity_id, old_value, new_value, context)
    VALUES (NEW.id, NEW.project_id, NEW.organization_id, COALESCE(auth.uid(), NEW.created_by),
            'status_changed', 'sprint', NEW.id,
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status), 'system');
  END IF;
  IF NEW.capacity_points IS DISTINCT FROM OLD.capacity_points THEN
    INSERT INTO public.sprint_planning_history(sprint_id, project_id, organization_id, user_id, action, entity_type, entity_id, old_value, new_value, context)
    VALUES (NEW.id, NEW.project_id, NEW.organization_id, COALESCE(auth.uid(), NEW.created_by),
            'capacity_changed', 'sprint', NEW.id,
            jsonb_build_object('capacity_points', OLD.capacity_points),
            jsonb_build_object('capacity_points', NEW.capacity_points), 'system');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_sprint ON public.sprints;
CREATE TRIGGER trg_log_sprint
AFTER UPDATE OF status, capacity_points ON public.sprints
FOR EACH ROW EXECUTE FUNCTION public.log_sprint_change();

-- =========================================================
-- 9. SNAPSHOT METRICS (planejado / entregue)
-- =========================================================
CREATE OR REPLACE FUNCTION public.snapshot_sprint_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_planned_points int;
  v_planned_tickets int;
  v_planned_tasks int;
  v_delivered_points int;
  v_delivered_tickets int;
  v_delivered_tasks int;
  v_resolved_statuses text[] := ARRAY['Resolvido','Aprovado','Aguardando Aprovação','Fechado'];
BEGIN
  -- ao ATIVAR: snapshot do planejado
  IF NEW.status = 'ativa' AND OLD.status <> 'ativa' THEN
    SELECT COALESCE(SUM(story_points),0), COUNT(*) INTO v_planned_points, v_planned_tickets
    FROM public.tickets WHERE sprint_id = NEW.id;
    SELECT COALESCE(SUM(story_points),0), COUNT(*) INTO v_delivered_points, v_planned_tasks
    FROM public.project_tasks WHERE sprint_id = NEW.id;

    INSERT INTO public.sprint_metrics(sprint_id, project_id, organization_id,
      planned_points, planned_tickets, planned_tasks)
    VALUES (NEW.id, NEW.project_id, NEW.organization_id,
            v_planned_points + v_delivered_points, v_planned_tickets, v_planned_tasks)
    ON CONFLICT (sprint_id) DO UPDATE SET
      planned_points = EXCLUDED.planned_points,
      planned_tickets = EXCLUDED.planned_tickets,
      planned_tasks = EXCLUDED.planned_tasks;
  END IF;

  -- ao CONCLUIR ou FECHAR: snapshot de entregue + KPIs
  IF NEW.status IN ('concluida','fechada') AND OLD.status <> NEW.status THEN
    SELECT
      COALESCE(SUM(CASE WHEN status = ANY(v_resolved_statuses) THEN story_points ELSE 0 END), 0),
      COUNT(*) FILTER (WHERE status = ANY(v_resolved_statuses))
    INTO v_delivered_points, v_delivered_tickets
    FROM public.tickets WHERE sprint_id = NEW.id;

    SELECT
      COALESCE(SUM(CASE WHEN status = 'done' THEN story_points ELSE 0 END), 0),
      COUNT(*) FILTER (WHERE status = 'done')
    INTO v_planned_points, v_delivered_tasks
    FROM public.project_tasks WHERE sprint_id = NEW.id;

    UPDATE public.sprint_metrics SET
      delivered_points = v_delivered_points + v_planned_points,
      delivered_tickets = v_delivered_tickets,
      delivered_tasks = v_delivered_tasks,
      capacity_at_close = NEW.capacity_points,
      closed_at = now(),
      efficiency_pct = CASE WHEN planned_points > 0 THEN ROUND(((v_delivered_points + v_planned_points)::numeric / planned_points) * 100, 1) ELSE NULL END,
      predictability_pct = CASE WHEN NEW.capacity_points > 0 THEN ROUND(((v_delivered_points + v_planned_points)::numeric / NEW.capacity_points) * 100, 1) ELSE NULL END
    WHERE sprint_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_metrics ON public.sprints;
CREATE TRIGGER trg_snapshot_metrics
AFTER UPDATE OF status ON public.sprints
FOR EACH ROW EXECUTE FUNCTION public.snapshot_sprint_metrics();

-- realtime para novas tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE public.sprint_planning_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sprint_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.technician_capacity;