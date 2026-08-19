ALTER TABLE public.op_service_orders
  ADD COLUMN IF NOT EXISTS scheduled_date date,
  ADD COLUMN IF NOT EXISTS scheduled_period text,
  ADD COLUMN IF NOT EXISTS schedule_notes text,
  ADD COLUMN IF NOT EXISTS schedule_order integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.op_workshop_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  company_id uuid REFERENCES public.op_companies(id) ON DELETE SET NULL,
  requester_name text,
  vehicle_plate text NOT NULL,
  vehicle_model text,
  service_type text,
  description text,
  preferred_date date,
  preferred_period text,
  status text NOT NULL DEFAULT 'pendente',
  scheduled_date date,
  scheduled_period text,
  mechanic_id uuid REFERENCES public.op_mechanics(id) ON DELETE SET NULL,
  service_order_id uuid REFERENCES public.op_service_orders(id) ON DELETE SET NULL,
  admin_notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.op_workshop_bookings TO authenticated;
GRANT ALL ON public.op_workshop_bookings TO service_role;

ALTER TABLE public.op_workshop_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS op_wb_select ON public.op_workshop_bookings;
CREATE POLICY op_wb_select ON public.op_workshop_bookings FOR SELECT TO authenticated USING (is_member_of_org(organization_id));
DROP POLICY IF EXISTS op_wb_insert ON public.op_workshop_bookings;
CREATE POLICY op_wb_insert ON public.op_workshop_bookings FOR INSERT TO authenticated WITH CHECK (is_member_of_org(organization_id));
DROP POLICY IF EXISTS op_wb_update ON public.op_workshop_bookings;
CREATE POLICY op_wb_update ON public.op_workshop_bookings FOR UPDATE TO authenticated USING (is_member_of_org(organization_id)) WITH CHECK (is_member_of_org(organization_id));
DROP POLICY IF EXISTS op_wb_delete ON public.op_workshop_bookings;
CREATE POLICY op_wb_delete ON public.op_workshop_bookings FOR DELETE TO authenticated USING (is_op_staff(organization_id));

CREATE INDEX IF NOT EXISTS idx_op_wb_org_status ON public.op_workshop_bookings(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_op_so_scheduled ON public.op_service_orders(organization_id, scheduled_date);

DROP TRIGGER IF EXISTS trg_op_wb_updated_at ON public.op_workshop_bookings;
CREATE TRIGGER trg_op_wb_updated_at BEFORE UPDATE ON public.op_workshop_bookings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();