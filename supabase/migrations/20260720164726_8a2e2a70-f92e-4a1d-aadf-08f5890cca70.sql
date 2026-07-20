
-- 1. Link mechanics and requesters to auth users
ALTER TABLE public.op_mechanics ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS op_mechanics_user_id_key ON public.op_mechanics(user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.op_delivery_requesters ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS op_delivery_requesters_user_id_key ON public.op_delivery_requesters(user_id) WHERE user_id IS NOT NULL;

-- 2. Add mechanic + requester references on maintenance orders
ALTER TABLE public.op_maintenance_orders ADD COLUMN IF NOT EXISTS assigned_mechanic_id uuid REFERENCES public.op_mechanics(id) ON DELETE SET NULL;
ALTER TABLE public.op_maintenance_orders ADD COLUMN IF NOT EXISTS requester_id uuid REFERENCES public.op_delivery_requesters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS op_mo_assigned_mechanic_idx ON public.op_maintenance_orders(assigned_mechanic_id);
CREATE INDEX IF NOT EXISTS op_mo_requester_idx ON public.op_maintenance_orders(requester_id);

-- 3. Update RLS policies on op_maintenance_orders
DROP POLICY IF EXISTS op_mo_select ON public.op_maintenance_orders;
CREATE POLICY op_mo_select ON public.op_maintenance_orders
FOR SELECT
USING (
  is_op_staff(organization_id)
  OR created_by = auth.uid()
  OR assigned_mechanic_id IN (SELECT id FROM public.op_mechanics WHERE user_id = auth.uid())
  OR requester_id IN (SELECT id FROM public.op_delivery_requesters WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS op_mo_insert ON public.op_maintenance_orders;
CREATE POLICY op_mo_insert ON public.op_maintenance_orders
FOR INSERT
WITH CHECK (
  is_member_of_org(organization_id)
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS op_mo_update ON public.op_maintenance_orders;
CREATE POLICY op_mo_update ON public.op_maintenance_orders
FOR UPDATE
USING (
  is_op_staff(organization_id)
  OR assigned_mechanic_id IN (SELECT id FROM public.op_mechanics WHERE user_id = auth.uid())
)
WITH CHECK (
  is_op_staff(organization_id)
  OR assigned_mechanic_id IN (SELECT id FROM public.op_mechanics WHERE user_id = auth.uid())
);
