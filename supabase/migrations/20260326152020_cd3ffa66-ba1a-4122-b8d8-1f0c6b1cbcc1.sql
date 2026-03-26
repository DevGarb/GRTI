
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS sla_deadline timestamptz DEFAULT (now() + interval '6 hours'),
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS picked_at timestamptz,
  ADD COLUMN IF NOT EXISTS original_assigned_to uuid;

-- Update existing open tickets to have sla_deadline
UPDATE public.tickets 
SET sla_deadline = created_at + interval '6 hours' 
WHERE sla_deadline IS NULL;

-- Update RLS SELECT policy to allow technicians to see "Disponível" tickets
DROP POLICY IF EXISTS "Users can view own tickets or admins all" ON public.tickets;
CREATE POLICY "Users can view own tickets or admins all" ON public.tickets
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (status = 'Disponível' AND has_role(auth.uid(), 'tecnico'::app_role))
  );

-- Update UPDATE policy to allow technicians to pick available tickets
DROP POLICY IF EXISTS "Admins and technicians can update tickets" ON public.tickets;
CREATE POLICY "Admins and technicians can update tickets" ON public.tickets
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'tecnico'::app_role)
    OR (status = 'Disponível' AND has_role(auth.uid(), 'tecnico'::app_role))
  );
