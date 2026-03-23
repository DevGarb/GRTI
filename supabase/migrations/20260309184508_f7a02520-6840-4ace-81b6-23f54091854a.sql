
-- Comments table
CREATE TABLE public.ticket_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on their tickets or admins/technicians all"
  ON public.ticket_comments FOR SELECT TO authenticated
  USING (
    is_public = true
    OR user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'tecnico'::app_role)
  );

CREATE POLICY "Authenticated users can insert comments"
  ON public.ticket_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- History table
CREATE TABLE public.ticket_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history of their tickets or admins all"
  ON public.ticket_history FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'tecnico'::app_role)
    OR ticket_id IN (SELECT id FROM public.tickets WHERE created_by = auth.uid() OR assigned_to = auth.uid())
  );

CREATE POLICY "Authenticated users can insert history"
  ON public.ticket_history FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
