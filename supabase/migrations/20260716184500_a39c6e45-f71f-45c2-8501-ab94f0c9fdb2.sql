-- Categorias dinâmicas de serviço
CREATE TABLE public.op_delivery_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#0d4a56',
  icon text NOT NULL DEFAULT 'Package',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_delivery_categories TO authenticated;
GRANT ALL ON public.op_delivery_categories TO service_role;

ALTER TABLE public.op_delivery_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "op_delivery_categories_select_org" ON public.op_delivery_categories
  FOR SELECT TO authenticated USING (public.is_member_of_org(organization_id));

CREATE POLICY "op_delivery_categories_manage_staff" ON public.op_delivery_categories
  FOR ALL TO authenticated
  USING (public.is_op_staff(organization_id))
  WITH CHECK (public.is_op_staff(organization_id));

CREATE TRIGGER update_op_delivery_categories_updated_at
  BEFORE UPDATE ON public.op_delivery_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Novos campos em op_deliveries
ALTER TABLE public.op_deliveries
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.op_delivery_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vehicle_required text NOT NULL DEFAULT 'qualquer',
  ADD COLUMN IF NOT EXISTS receiver_phone text,
  ADD COLUMN IF NOT EXISTS requester_name text;

-- Seed categorias padrão para todas as orgs que já têm entregas ou motoristas
INSERT INTO public.op_delivery_categories (organization_id, name, color, icon, sort_order, created_by)
SELECT DISTINCT o.id, x.name, x.color, x.icon, x.ord,
  COALESCE(
    (SELECT user_id FROM public.user_organization_roles WHERE organization_id = o.id AND role = 'admin' LIMIT 1),
    (SELECT user_id FROM public.user_organization_roles WHERE organization_id = o.id LIMIT 1)
  )
FROM public.organizations o
CROSS JOIN (VALUES
  ('Entrega', '#0d4a56', 'Package', 0),
  ('Buscar Mercadoria', '#e8531f', 'PackageOpen', 1),
  ('Vistoria Resolve', '#0284c7', 'ClipboardCheck', 2)
) AS x(name, color, icon, ord)
WHERE EXISTS (
  SELECT 1 FROM public.op_deliveries d WHERE d.organization_id = o.id
  UNION SELECT 1 FROM public.op_drivers dr WHERE dr.organization_id = o.id
)
ON CONFLICT (organization_id, name) DO NOTHING;

-- Backfill: liga entregas antigas na categoria pelo nome do type
UPDATE public.op_deliveries d
SET category_id = c.id
FROM public.op_delivery_categories c
WHERE d.category_id IS NULL
  AND c.organization_id = d.organization_id
  AND lower(c.name) = lower(COALESCE(d.type, 'Entrega'));