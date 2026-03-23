
-- Fix overly permissive INSERT policy on ticket_attachments
DROP POLICY "Authenticated users can add attachments" ON public.ticket_attachments;

CREATE POLICY "Users can add attachments to their tickets"
  ON public.ticket_attachments FOR INSERT TO authenticated
  WITH CHECK (
    ticket_id IN (
      SELECT id FROM public.tickets WHERE created_by = auth.uid() OR assigned_to = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'tecnico')
  );

-- Fix permissive storage policy
DROP POLICY "Authenticated users can upload attachments" ON storage.objects;

CREATE POLICY "Authenticated users can upload to attachments bucket"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'attachments' AND auth.uid() IS NOT NULL);
