
-- CHECKLISTS OPERACIONAIS — Fase 1
INSERT INTO public.organizations (name, slug)
VALUES ('Checklists Operacionais', 'checklists')
ON CONFLICT (slug) DO NOTHING;

DO $$ BEGIN
  CREATE TYPE public.chk_frequency AS ENUM ('unica','diaria','semanal','mensal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.chk_execution_status AS ENUM ('pendente','em_andamento','concluida','atrasada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.chk_sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chk_sectors TO authenticated;
GRANT ALL ON public.chk_sectors TO service_role;
ALTER TABLE public.chk_sectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chk_sectors_select" ON public.chk_sectors FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_same_organization(organization_id));
CREATE POLICY "chk_sectors_admin_write" ON public.chk_sectors FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_role_in_org(auth.uid(),'admin'::app_role, organization_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_role_in_org(auth.uid(),'admin'::app_role, organization_id));
CREATE TRIGGER trg_chk_sectors_upd BEFORE UPDATE ON public.chk_sectors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.chk_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sector_id uuid REFERENCES public.chk_sectors(id) ON DELETE SET NULL,
  name text NOT NULL,
  document text,
  contact text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chk_companies TO authenticated;
GRANT ALL ON public.chk_companies TO service_role;
ALTER TABLE public.chk_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chk_companies_select" ON public.chk_companies FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_same_organization(organization_id));
CREATE POLICY "chk_companies_admin_write" ON public.chk_companies FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_role_in_org(auth.uid(),'admin'::app_role, organization_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_role_in_org(auth.uid(),'admin'::app_role, organization_id));
CREATE TRIGGER trg_chk_companies_upd BEFORE UPDATE ON public.chk_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.chk_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sector_id uuid REFERENCES public.chk_sectors(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  frequency public.chk_frequency NOT NULL DEFAULT 'unica',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chk_templates TO authenticated;
GRANT ALL ON public.chk_templates TO service_role;
ALTER TABLE public.chk_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chk_templates_select" ON public.chk_templates FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_same_organization(organization_id));
CREATE POLICY "chk_templates_admin_write" ON public.chk_templates FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_role_in_org(auth.uid(),'admin'::app_role, organization_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_role_in_org(auth.uid(),'admin'::app_role, organization_id));
CREATE TRIGGER trg_chk_templates_upd BEFORE UPDATE ON public.chk_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.chk_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.chk_templates(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  observation text,
  weight smallint NOT NULL DEFAULT 1 CHECK (weight IN (1,2,3)),
  requires_photo boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chk_template_items TO authenticated;
GRANT ALL ON public.chk_template_items TO service_role;
ALTER TABLE public.chk_template_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chk_template_items_select" ON public.chk_template_items FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_same_organization(organization_id));
CREATE POLICY "chk_template_items_admin_write" ON public.chk_template_items FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_role_in_org(auth.uid(),'admin'::app_role, organization_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_role_in_org(auth.uid(),'admin'::app_role, organization_id));
CREATE TRIGGER trg_chk_template_items_upd BEFORE UPDATE ON public.chk_template_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_chk_template_items_template ON public.chk_template_items(template_id, sort_order);

CREATE TABLE public.chk_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.chk_templates(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.chk_companies(id) ON DELETE CASCADE,
  assigned_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  frequency public.chk_frequency NOT NULL DEFAULT 'unica',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chk_assignments TO authenticated;
GRANT ALL ON public.chk_assignments TO service_role;
ALTER TABLE public.chk_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chk_assignments_select" ON public.chk_assignments FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_role_in_org(auth.uid(),'admin'::app_role, organization_id) OR assigned_user_id = auth.uid());
CREATE POLICY "chk_assignments_admin_write" ON public.chk_assignments FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_role_in_org(auth.uid(),'admin'::app_role, organization_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_role_in_org(auth.uid(),'admin'::app_role, organization_id));
CREATE TRIGGER trg_chk_assignments_upd BEFORE UPDATE ON public.chk_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.chk_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES public.chk_assignments(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.chk_templates(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.chk_companies(id) ON DELETE CASCADE,
  assigned_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_date date NOT NULL,
  status public.chk_execution_status NOT NULL DEFAULT 'pendente',
  score numeric(6,2),
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, target_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chk_executions TO authenticated;
GRANT ALL ON public.chk_executions TO service_role;
ALTER TABLE public.chk_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chk_executions_select" ON public.chk_executions FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_role_in_org(auth.uid(),'admin'::app_role, organization_id) OR assigned_user_id = auth.uid());
CREATE POLICY "chk_executions_insert" ON public.chk_executions FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_role_in_org(auth.uid(),'admin'::app_role, organization_id));
CREATE POLICY "chk_executions_update" ON public.chk_executions FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_role_in_org(auth.uid(),'admin'::app_role, organization_id) OR (assigned_user_id = auth.uid() AND status <> 'concluida'))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_role_in_org(auth.uid(),'admin'::app_role, organization_id) OR assigned_user_id = auth.uid());
CREATE POLICY "chk_executions_delete" ON public.chk_executions FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_role_in_org(auth.uid(),'admin'::app_role, organization_id));
CREATE TRIGGER trg_chk_executions_upd BEFORE UPDATE ON public.chk_executions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_chk_executions_org_status ON public.chk_executions(organization_id, status);
CREATE INDEX idx_chk_executions_user ON public.chk_executions(assigned_user_id, status);

CREATE TABLE public.chk_execution_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL REFERENCES public.chk_executions(id) ON DELETE CASCADE,
  template_item_id uuid NOT NULL REFERENCES public.chk_template_items(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  done boolean NOT NULL DEFAULT false,
  observation text,
  photo_path text,
  answered_at timestamptz,
  answered_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (execution_id, template_item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chk_execution_items TO authenticated;
GRANT ALL ON public.chk_execution_items TO service_role;
ALTER TABLE public.chk_execution_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chk_execution_items_select" ON public.chk_execution_items FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_role_in_org(auth.uid(),'admin'::app_role, organization_id)
         OR EXISTS (SELECT 1 FROM public.chk_executions e WHERE e.id = execution_id AND e.assigned_user_id = auth.uid()));
CREATE POLICY "chk_execution_items_write" ON public.chk_execution_items FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_role_in_org(auth.uid(),'admin'::app_role, organization_id)
         OR EXISTS (SELECT 1 FROM public.chk_executions e WHERE e.id = execution_id AND e.assigned_user_id = auth.uid() AND e.status <> 'concluida'))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_role_in_org(auth.uid(),'admin'::app_role, organization_id)
         OR EXISTS (SELECT 1 FROM public.chk_executions e WHERE e.id = execution_id AND e.assigned_user_id = auth.uid()));
CREATE TRIGGER trg_chk_execution_items_upd BEFORE UPDATE ON public.chk_execution_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recompute score trigger
CREATE OR REPLACE FUNCTION public.chk_recompute_execution_score()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _exec_id uuid := COALESCE(NEW.execution_id, OLD.execution_id);
  _score numeric;
BEGIN
  SELECT
    CASE WHEN SUM(ti.weight) > 0
      THEN ROUND(SUM(CASE WHEN ei.done THEN ti.weight ELSE 0 END)::numeric * 100.0 / SUM(ti.weight), 2)
      ELSE 0
    END
  INTO _score
  FROM public.chk_execution_items ei
  JOIN public.chk_template_items ti ON ti.id = ei.template_item_id
  WHERE ei.execution_id = _exec_id;

  UPDATE public.chk_executions
     SET score = _score,
         started_at = COALESCE(started_at, now()),
         status = CASE
           WHEN status = 'concluida' THEN 'concluida'
           WHEN EXISTS (SELECT 1 FROM public.chk_execution_items x WHERE x.execution_id = _exec_id AND x.answered_at IS NOT NULL)
             THEN 'em_andamento'::public.chk_execution_status
           ELSE status
         END
   WHERE id = _exec_id AND status <> 'concluida';
  RETURN NULL;
END $$;

CREATE TRIGGER trg_chk_recompute_score
AFTER INSERT OR UPDATE OR DELETE ON public.chk_execution_items
FOR EACH ROW EXECUTE FUNCTION public.chk_recompute_execution_score();

-- Populate items when execution is created
CREATE OR REPLACE FUNCTION public.chk_populate_execution_items()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.chk_execution_items (execution_id, template_item_id, organization_id, done)
  SELECT NEW.id, ti.id, NEW.organization_id, false
  FROM public.chk_template_items ti
  WHERE ti.template_id = NEW.template_id
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_chk_populate_items
AFTER INSERT ON public.chk_executions
FOR EACH ROW EXECUTE FUNCTION public.chk_populate_execution_items();

-- Recurring generator
CREATE OR REPLACE FUNCTION public.generate_recurring_executions()
RETURNS TABLE(created int, overdue int) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _created int := 0;
  _overdue int := 0;
  _today date := CURRENT_DATE;
  a record;
  next_date date;
  last_date date;
BEGIN
  FOR a IN
    SELECT * FROM public.chk_assignments
    WHERE is_active = true AND frequency <> 'unica'
      AND (end_date IS NULL OR end_date >= _today)
  LOOP
    SELECT MAX(target_date) INTO last_date FROM public.chk_executions WHERE assignment_id = a.id;
    IF last_date IS NULL THEN
      next_date := GREATEST(a.start_date, _today);
    ELSE
      next_date := CASE a.frequency
        WHEN 'diaria' THEN last_date + 1
        WHEN 'semanal' THEN last_date + 7
        WHEN 'mensal' THEN (last_date + interval '1 month')::date
      END;
    END IF;

    WHILE next_date <= _today LOOP
      BEGIN
        INSERT INTO public.chk_executions (organization_id, assignment_id, template_id, company_id, assigned_user_id, target_date, status)
        VALUES (a.organization_id, a.id, a.template_id, a.company_id, a.assigned_user_id, next_date, 'pendente');
        _created := _created + 1;
      EXCEPTION WHEN unique_violation THEN NULL;
      END;
      next_date := CASE a.frequency
        WHEN 'diaria' THEN next_date + 1
        WHEN 'semanal' THEN next_date + 7
        WHEN 'mensal' THEN (next_date + interval '1 month')::date
      END;
    END LOOP;
  END LOOP;

  FOR a IN
    SELECT * FROM public.chk_assignments ca
    WHERE ca.is_active = true AND ca.frequency = 'unica'
      AND NOT EXISTS (SELECT 1 FROM public.chk_executions e WHERE e.assignment_id = ca.id)
  LOOP
    INSERT INTO public.chk_executions (organization_id, assignment_id, template_id, company_id, assigned_user_id, target_date, status)
    VALUES (a.organization_id, a.id, a.template_id, a.company_id, a.assigned_user_id, a.start_date, 'pendente');
    _created := _created + 1;
  END LOOP;

  UPDATE public.chk_executions
     SET status = 'atrasada'
   WHERE status IN ('pendente','em_andamento') AND target_date < _today;
  GET DIAGNOSTICS _overdue = ROW_COUNT;

  created := _created; overdue := _overdue;
  RETURN NEXT;
END $$;

-- Manager report
CREATE OR REPLACE FUNCTION public.get_checklists_report(
  _organization_id uuid,
  _from date DEFAULT (CURRENT_DATE - 30),
  _to date DEFAULT CURRENT_DATE
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT (public.is_super_admin(auth.uid()) OR public.has_role_in_org(auth.uid(),'admin'::app_role,_organization_id)) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  WITH execs AS (
    SELECT e.id, e.organization_id, e.assignment_id, e.template_id, e.company_id, e.assigned_user_id,
           e.target_date, e.status, e.score, e.started_at, e.completed_at,
           t.title AS template_title, c.name AS company_name, p.full_name AS user_name
    FROM public.chk_executions e
    JOIN public.chk_templates t ON t.id = e.template_id
    JOIN public.chk_companies c ON c.id = e.company_id
    LEFT JOIN public.profiles p ON p.user_id = e.assigned_user_id
    WHERE e.organization_id = _organization_id
      AND e.target_date BETWEEN _from AND _to
  ),
  totals AS (
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'concluida')::int AS concluidas,
      COUNT(*) FILTER (WHERE status = 'atrasada')::int AS atrasadas,
      COUNT(*) FILTER (WHERE status IN ('pendente','em_andamento'))::int AS pendentes,
      ROUND(AVG(score) FILTER (WHERE status='concluida'),2) AS avg_score
    FROM execs
  ),
  by_company AS (
    SELECT company_id, company_name,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status='concluida')::int AS concluidas,
      ROUND(AVG(score) FILTER (WHERE status='concluida'),2) AS avg_score
    FROM execs GROUP BY company_id, company_name
  ),
  by_user AS (
    SELECT assigned_user_id, user_name,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status='concluida')::int AS concluidas,
      ROUND(AVG(score) FILTER (WHERE status='concluida'),2) AS avg_score
    FROM execs GROUP BY assigned_user_id, user_name
  ),
  by_template AS (
    SELECT template_id, template_title,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status='concluida')::int AS concluidas,
      ROUND(AVG(score) FILTER (WHERE status='concluida'),2) AS avg_score
    FROM execs GROUP BY template_id, template_title
  )
  SELECT jsonb_build_object(
    'totals', COALESCE((SELECT to_jsonb(t.*) FROM totals t), '{}'::jsonb),
    'by_company', COALESCE((SELECT jsonb_agg(to_jsonb(bc.*)) FROM by_company bc), '[]'::jsonb),
    'by_user', COALESCE((SELECT jsonb_agg(to_jsonb(bu.*)) FROM by_user bu), '[]'::jsonb),
    'by_template', COALESCE((SELECT jsonb_agg(to_jsonb(bt.*)) FROM by_template bt), '[]'::jsonb),
    'executions', COALESCE((SELECT jsonb_agg(to_jsonb(ex.*) ORDER BY ex.target_date DESC) FROM execs ex), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END $$;
