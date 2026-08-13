CREATE TABLE public.op_service_order_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  service_order_id uuid NOT NULL REFERENCES public.op_service_orders(id) ON DELETE CASCADE,
  label text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  done_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_os_checklist_os ON public.op_service_order_checklist(service_order_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_service_order_checklist TO authenticated;
GRANT ALL ON public.op_service_order_checklist TO service_role;

ALTER TABLE public.op_service_order_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read os checklist"
ON public.op_service_order_checklist FOR SELECT TO authenticated
USING (public.is_member_of_org(organization_id));

CREATE POLICY "org members manage os checklist"
ON public.op_service_order_checklist FOR ALL TO authenticated
USING (public.is_member_of_org(organization_id))
WITH CHECK (public.is_member_of_org(organization_id));

CREATE OR REPLACE FUNCTION public.op_seed_service_order_checklist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.op_service_order_checklist (organization_id, service_order_id, label, position)
  SELECT NEW.organization_id, NEW.id, l.label, l.pos
  FROM (VALUES
    ('Orçamento aprovado', 1),
    ('Peças recebidas', 2),
    ('Desmontagem', 3),
    ('Desempeno / Chassi', 4),
    ('Pintura', 5),
    ('Pré-montagem', 6),
    ('Montagem final', 7),
    ('Revisão / Teste', 8)
  ) AS l(label, pos);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_op_seed_service_order_checklist
AFTER INSERT ON public.op_service_orders
FOR EACH ROW EXECUTE FUNCTION public.op_seed_service_order_checklist();

INSERT INTO public.op_service_order_checklist (organization_id, service_order_id, label, position)
SELECT o.organization_id, o.id, l.label, l.pos
FROM public.op_service_orders o
CROSS JOIN (VALUES
  ('Orçamento aprovado', 1),
  ('Peças recebidas', 2),
  ('Desmontagem', 3),
  ('Desempeno / Chassi', 4),
  ('Pintura', 5),
  ('Pré-montagem', 6),
  ('Montagem final', 7),
  ('Revisão / Teste', 8)
) AS l(label, pos)
WHERE NOT EXISTS (
  SELECT 1 FROM public.op_service_order_checklist c WHERE c.service_order_id = o.id
);