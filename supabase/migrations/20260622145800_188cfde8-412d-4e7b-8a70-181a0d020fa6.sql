
ALTER TABLE public.ticket_comments
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_ticket_comments_updated_at ON public.ticket_comments;
CREATE TRIGGER update_ticket_comments_updated_at
BEFORE UPDATE ON public.ticket_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Authors or admins can update comments" ON public.ticket_comments;
CREATE POLICY "Authors or admins can update comments"
ON public.ticket_comments
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));
