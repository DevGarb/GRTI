CREATE TABLE public.op_service_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_service_types TO authenticated;
GRANT ALL ON public.op_service_types TO service_role;
ALTER TABLE public.op_service_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY op_st_select ON public.op_service_types FOR SELECT TO authenticated USING (is_member_of_org(organization_id));
CREATE POLICY op_st_insert ON public.op_service_types FOR INSERT TO authenticated WITH CHECK (is_op_staff(organization_id));
CREATE POLICY op_st_update ON public.op_service_types FOR UPDATE TO authenticated USING (is_op_staff(organization_id)) WITH CHECK (is_op_staff(organization_id));
CREATE POLICY op_st_delete ON public.op_service_types FOR DELETE TO authenticated USING (is_op_staff(organization_id));

CREATE TABLE public.op_service_type_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type_id uuid NOT NULL REFERENCES public.op_service_types(id) ON DELETE CASCADE,
  label text NOT NULL,
  points numeric NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_service_type_items TO authenticated;
GRANT ALL ON public.op_service_type_items TO service_role;
ALTER TABLE public.op_service_type_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY op_sti_select ON public.op_service_type_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.op_service_types t WHERE t.id = service_type_id AND is_member_of_org(t.organization_id)));
CREATE POLICY op_sti_insert ON public.op_service_type_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.op_service_types t WHERE t.id = service_type_id AND is_op_staff(t.organization_id)));
CREATE POLICY op_sti_update ON public.op_service_type_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.op_service_types t WHERE t.id = service_type_id AND is_op_staff(t.organization_id)));
CREATE POLICY op_sti_delete ON public.op_service_type_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.op_service_types t WHERE t.id = service_type_id AND is_op_staff(t.organization_id)));

CREATE TABLE public.op_service_type_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type_id uuid NOT NULL REFERENCES public.op_service_types(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.op_companies(id) ON DELETE CASCADE,
  UNIQUE (service_type_id, company_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_service_type_companies TO authenticated;
GRANT ALL ON public.op_service_type_companies TO service_role;
ALTER TABLE public.op_service_type_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY op_stc_select ON public.op_service_type_companies FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.op_service_types t WHERE t.id = service_type_id AND is_member_of_org(t.organization_id)));
CREATE POLICY op_stc_insert ON public.op_service_type_companies FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.op_service_types t WHERE t.id = service_type_id AND is_op_staff(t.organization_id)));
CREATE POLICY op_stc_update ON public.op_service_type_companies FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.op_service_types t WHERE t.id = service_type_id AND is_op_staff(t.organization_id)));
CREATE POLICY op_stc_delete ON public.op_service_type_companies FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.op_service_types t WHERE t.id = service_type_id AND is_op_staff(t.organization_id)));

CREATE TABLE public.op_extra_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  points numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_extra_services TO authenticated;
GRANT ALL ON public.op_extra_services TO service_role;
ALTER TABLE public.op_extra_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY op_es_select ON public.op_extra_services FOR SELECT TO authenticated USING (is_member_of_org(organization_id));
CREATE POLICY op_es_insert ON public.op_extra_services FOR INSERT TO authenticated WITH CHECK (is_op_staff(organization_id));
CREATE POLICY op_es_update ON public.op_extra_services FOR UPDATE TO authenticated USING (is_op_staff(organization_id)) WITH CHECK (is_op_staff(organization_id));
CREATE POLICY op_es_delete ON public.op_extra_services FOR DELETE TO authenticated USING (is_op_staff(organization_id));

CREATE TABLE public.op_extra_service_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extra_service_id uuid NOT NULL REFERENCES public.op_extra_services(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.op_companies(id) ON DELETE CASCADE,
  UNIQUE (extra_service_id, company_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_extra_service_companies TO authenticated;
GRANT ALL ON public.op_extra_service_companies TO service_role;
ALTER TABLE public.op_extra_service_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY op_esc_select ON public.op_extra_service_companies FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.op_extra_services e WHERE e.id = extra_service_id AND is_member_of_org(e.organization_id)));
CREATE POLICY op_esc_insert ON public.op_extra_service_companies FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.op_extra_services e WHERE e.id = extra_service_id AND is_op_staff(e.organization_id)));
CREATE POLICY op_esc_update ON public.op_extra_service_companies FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.op_extra_services e WHERE e.id = extra_service_id AND is_op_staff(e.organization_id)));
CREATE POLICY op_esc_delete ON public.op_extra_service_companies FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.op_extra_services e WHERE e.id = extra_service_id AND is_op_staff(e.organization_id)));

CREATE TABLE public.op_os_service_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  service_order_id uuid NOT NULL REFERENCES public.op_service_orders(id) ON DELETE CASCADE,
  item_type text NOT NULL DEFAULT 'checklist',
  label text NOT NULL,
  points numeric NOT NULL DEFAULT 0,
  done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  done_by uuid,
  approved boolean,
  points_approved numeric,
  audit_note text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_os_service_items TO authenticated;
GRANT ALL ON public.op_os_service_items TO service_role;
ALTER TABLE public.op_os_service_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY op_osi_select ON public.op_os_service_items FOR SELECT TO authenticated USING (is_member_of_org(organization_id));
CREATE POLICY op_osi_manage ON public.op_os_service_items FOR ALL TO authenticated USING (is_member_of_org(organization_id)) WITH CHECK (is_member_of_org(organization_id));

CREATE TABLE public.op_award_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  from_points numeric NOT NULL,
  to_points numeric,
  rate_brl numeric NOT NULL,
  position integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_award_tiers TO authenticated;
GRANT ALL ON public.op_award_tiers TO service_role;
ALTER TABLE public.op_award_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY op_at_select ON public.op_award_tiers FOR SELECT TO authenticated USING (is_member_of_org(organization_id));
CREATE POLICY op_at_insert ON public.op_award_tiers FOR INSERT TO authenticated WITH CHECK (is_op_staff(organization_id));
CREATE POLICY op_at_update ON public.op_award_tiers FOR UPDATE TO authenticated USING (is_op_staff(organization_id)) WITH CHECK (is_op_staff(organization_id));
CREATE POLICY op_at_delete ON public.op_award_tiers FOR DELETE TO authenticated USING (is_op_staff(organization_id));

ALTER TABLE public.op_service_orders
  ADD COLUMN service_type_id uuid REFERENCES public.op_service_types(id) ON DELETE SET NULL,
  ADD COLUMN points_requested numeric,
  ADD COLUMN points_approved numeric,
  ADD COLUMN points_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN points_audited_by uuid,
  ADD COLUMN points_audited_at timestamptz;

CREATE OR REPLACE FUNCTION public.op_seed_os_service_items() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.service_type_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.service_type_id IS NOT DISTINCT FROM OLD.service_type_id THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.op_os_service_items WHERE service_order_id = NEW.id AND item_type = 'checklist') THEN RETURN NEW; END IF;
  INSERT INTO public.op_os_service_items (organization_id, service_order_id, item_type, label, points, position)
  SELECT NEW.organization_id, NEW.id, 'checklist', i.label, i.points, i.position
  FROM public.op_service_type_items i
  WHERE i.service_type_id = NEW.service_type_id AND i.active
  ORDER BY i.position;
  RETURN NEW;
END $$;

CREATE TRIGGER op_so_seed_items_insert AFTER INSERT ON public.op_service_orders FOR EACH ROW EXECUTE FUNCTION public.op_seed_os_service_items();
CREATE TRIGGER op_so_seed_items_update AFTER UPDATE OF service_type_id ON public.op_service_orders FOR EACH ROW EXECUTE FUNCTION public.op_seed_os_service_items();

-- Seeds iniciais (org OPERACIONAL)
WITH st AS (
  INSERT INTO public.op_service_types (organization_id, name, description)
  SELECT '8c1dd9b4-313e-44d0-8594-7cb39d166c2e', v.name, v.description FROM (VALUES
    ('Revisão Simples', 'Revisões de 1.000 km e 6.000 km · até 3,00 pontos'),
    ('Revisão Geral', 'Manutenção completa · até 5,00 pontos'),
    ('Manutenção Básica', 'Manutenção básica da moto · até 2,00 pontos'),
    ('Serviço Avulso / Adicional', 'OS composta por serviços adicionais da biblioteca'),
    ('Colisão Resolve', 'Fluxo de colisão · até 7,00 pontos'),
    ('Ajuste Simples', 'Ajustes menores · até 1,00 ponto'),
    ('Ajuste Intermediário', 'Ajustes intermediários · até 1,50 ponto'),
    ('Finalização', 'Finalização / serviço complexo · até 2,00 pontos')
  ) AS v(name, description)
  RETURNING id, name
)
, sti AS (
  INSERT INTO public.op_service_type_items (service_type_id, label, points, position, is_required)
  SELECT st.id, v.label, v.points, v.position, true
  FROM st JOIN (VALUES
    ('Revisão Simples','Inspeção geral',0.25,1),
    ('Revisão Simples','Troca de óleo',0.75,2),
    ('Revisão Simples','Regulagem dos freios',0.50,3),
    ('Revisão Simples','Regulagem da embreagem',0.40,4),
    ('Revisão Simples','Regulagem/lubrificação da corrente',0.50,5),
    ('Revisão Simples','Lubrificação dos eixos',0.25,6),
    ('Revisão Simples','Calibragem dos pneus',0.10,7),
    ('Revisão Simples','Teste final',0.25,8),
    ('Revisão Geral','Inspeção geral',0.30,1),
    ('Revisão Geral','Troca de óleo',0.75,2),
    ('Revisão Geral','Sistema de freios',0.50,3),
    ('Revisão Geral','Sistema de transmissão',0.40,4),
    ('Revisão Geral','Corrente',0.35,5),
    ('Revisão Geral','Embreagem',0.35,6),
    ('Revisão Geral','Suspensão',0.40,7),
    ('Revisão Geral','Rodas e pneus',0.35,8),
    ('Revisão Geral','Sistema de direção',0.35,9),
    ('Revisão Geral','Sistema elétrico',0.40,10),
    ('Revisão Geral','Lubrificação',0.25,11),
    ('Revisão Geral','Ajustes necessários',0.30,12),
    ('Revisão Geral','Teste final',0.30,13),
    ('Manutenção Básica','Inspeção geral',0.40,1),
    ('Manutenção Básica','Troca de óleo',0.75,2),
    ('Manutenção Básica','Regulagem dos freios',0.40,3),
    ('Manutenção Básica','Calibragem dos pneus',0.10,4),
    ('Manutenção Básica','Teste final',0.35,5),
    ('Colisão Resolve','Orçamento e avaliação inicial',0.50,1),
    ('Colisão Resolve','Desmontagem',1.25,2),
    ('Colisão Resolve','Direcionamento para oficina parceira',0.00,3),
    ('Colisão Resolve','Remontagem',1.50,4),
    ('Colisão Resolve','Ajustes',1.00,5),
    ('Colisão Resolve','Revisão',1.00,6),
    ('Colisão Resolve','Checagem final',0.75,7),
    ('Colisão Resolve','Lavagem',1.00,8),
    ('Ajuste Simples','Avaliação',0.25,1),
    ('Ajuste Simples','Ajuste executado',0.60,2),
    ('Ajuste Simples','Teste final',0.15,3),
    ('Ajuste Intermediário','Avaliação',0.30,1),
    ('Ajuste Intermediário','Ajuste executado',0.90,2),
    ('Ajuste Intermediário','Checagem final',0.30,3),
    ('Finalização','Avaliação',0.40,1),
    ('Finalização','Execução do serviço',1.20,2),
    ('Finalização','Checagem final',0.40,3)
  ) AS v(tname, label, points, position) ON v.tname = st.name
  RETURNING id
)
INSERT INTO public.op_service_type_companies (service_type_id, company_id)
SELECT st.id, c.id FROM st
JOIN (VALUES
  ('Revisão Simples','CearaGPS'), ('Revisão Simples','CearaGPS Motoloc'),
  ('Revisão Geral','CearaGPS'), ('Revisão Geral','CearaGPS Motoloc'),
  ('Manutenção Básica','CearaGPS'), ('Manutenção Básica','CearaGPS Motoloc'),
  ('Serviço Avulso / Adicional','CearaGPS'), ('Serviço Avulso / Adicional','CearaGPS Motoloc'), ('Serviço Avulso / Adicional','Resolve'),
  ('Colisão Resolve','Resolve'),
  ('Ajuste Simples','Resolve'),
  ('Ajuste Intermediário','Resolve'),
  ('Finalização','Resolve')
) AS v(tname, cname) ON v.tname = st.name
JOIN public.op_companies c ON c.name = v.cname AND c.organization_id = '8c1dd9b4-313e-44d0-8594-7cb39d166c2e';

INSERT INTO public.op_extra_services (organization_id, name, points)
SELECT '8c1dd9b4-313e-44d0-8594-7cb39d166c2e', v.name, v.points FROM (VALUES
  ('Troca de óleo', 1.00),
  ('Lubrificação/regulagem da corrente', 0.50),
  ('Regulagem de freio', 0.25),
  ('Calibragem dos pneus', 0.10),
  ('Troca de pastilha dianteira', 0.50),
  ('Troca de lona traseira', 0.60),
  ('Troca de vela', 0.30),
  ('Troca de filtro de ar', 0.25),
  ('Troca de kit de tração', 1.00),
  ('Desmontagem da balança + lubrificação', 1.00),
  ('Desmontagem/manutenção da caixa de direção', 1.00),
  ('Regulagem de válvulas', 1.00),
  ('Teste final', 0.15)
) AS v(name, points);

INSERT INTO public.op_extra_service_companies (extra_service_id, company_id)
SELECT e.id, c.id
FROM public.op_extra_services e
CROSS JOIN public.op_companies c
WHERE e.organization_id = '8c1dd9b4-313e-44d0-8594-7cb39d166c2e'
  AND c.organization_id = '8c1dd9b4-313e-44d0-8594-7cb39d166c2e'
  AND c.is_workshop = true;

INSERT INTO public.op_award_tiers (organization_id, from_points, to_points, rate_brl, position) VALUES
  ('8c1dd9b4-313e-44d0-8594-7cb39d166c2e', 1, 50, 10.00, 1),
  ('8c1dd9b4-313e-44d0-8594-7cb39d166c2e', 51, 99, 15.00, 2),
  ('8c1dd9b4-313e-44d0-8594-7cb39d166c2e', 100, NULL, 20.00, 3);

-- Backfill: OS finalizadas existentes entram no modelo de pontos (R$ 10 = 1 ponto)
INSERT INTO public.op_os_service_items (organization_id, service_order_id, item_type, label, points, done, done_at, approved, points_approved, position)
SELECT o.organization_id, o.id, 'nao_cadastrado', 'Serviço realizado (legado)',
       ROUND(COALESCE(o.award_amount, 0) / 10.0, 2),
       true, (o.finished_at::text || 'T12:00:00')::timestamptz, true,
       ROUND(COALESCE(o.award_amount, 0) / 10.0, 2), 0
FROM public.op_service_orders o
WHERE o.finished_at IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.op_os_service_items i WHERE i.service_order_id = o.id);

UPDATE public.op_service_orders o
SET points_requested = x.p, points_approved = x.p, points_status = 'aprovada'
FROM (
  SELECT service_order_id, SUM(points_approved) AS p
  FROM public.op_os_service_items WHERE approved = true GROUP BY service_order_id
) x
WHERE o.id = x.service_order_id;