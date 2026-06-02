ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS last_seen_by_requester_at timestamptz;

DROP POLICY IF EXISTS "Requester can mark ticket as seen" ON public.tickets;
CREATE POLICY "Requester can mark ticket as seen"
ON public.tickets
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());