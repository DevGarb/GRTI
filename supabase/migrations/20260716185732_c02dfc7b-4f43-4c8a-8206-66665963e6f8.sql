
-- 1. PIN em motoristas
ALTER TABLE public.op_drivers ADD COLUMN IF NOT EXISTS pin TEXT;
ALTER TABLE public.op_drivers ADD CONSTRAINT op_drivers_pin_format CHECK (pin IS NULL OR pin ~ '^[0-9]{4,6}$');

-- 2. Solicitantes de entrega
CREATE TABLE IF NOT EXISTS public.op_delivery_requesters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  pin TEXT CHECK (pin IS NULL OR pin ~ '^[0-9]{4,6}$'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_delivery_requesters TO authenticated;
GRANT ALL ON public.op_delivery_requesters TO service_role;

ALTER TABLE public.op_delivery_requesters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members see requesters of their org"
  ON public.op_delivery_requesters FOR SELECT TO authenticated
  USING (public.is_member_of_org(organization_id));

CREATE POLICY "Op staff manage requesters"
  ON public.op_delivery_requesters FOR ALL TO authenticated
  USING (public.is_op_staff(organization_id))
  WITH CHECK (public.is_op_staff(organization_id));

CREATE TRIGGER update_op_delivery_requesters_updated_at
  BEFORE UPDATE ON public.op_delivery_requesters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_op_delivery_requesters_org ON public.op_delivery_requesters(organization_id, is_active);

-- 3. Avaliações de entrega
CREATE TABLE IF NOT EXISTS public.op_delivery_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL REFERENCES public.op_deliveries(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  rated_by_type TEXT NOT NULL CHECK (rated_by_type IN ('solicitante','admin','motorista')),
  rated_by_name TEXT,
  rated_by_user UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_delivery_ratings TO authenticated;
GRANT ALL ON public.op_delivery_ratings TO service_role;

ALTER TABLE public.op_delivery_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members see ratings of their org"
  ON public.op_delivery_ratings FOR SELECT TO authenticated
  USING (public.is_member_of_org(organization_id));

CREATE POLICY "Members create ratings in their org"
  ON public.op_delivery_ratings FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of_org(organization_id));

CREATE POLICY "Op staff manage ratings"
  ON public.op_delivery_ratings FOR UPDATE TO authenticated
  USING (public.is_op_staff(organization_id))
  WITH CHECK (public.is_op_staff(organization_id));

CREATE POLICY "Op staff delete ratings"
  ON public.op_delivery_ratings FOR DELETE TO authenticated
  USING (public.is_op_staff(organization_id));

CREATE INDEX IF NOT EXISTS idx_op_delivery_ratings_delivery ON public.op_delivery_ratings(delivery_id);
CREATE INDEX IF NOT EXISTS idx_op_delivery_ratings_org ON public.op_delivery_ratings(organization_id);
