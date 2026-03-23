
-- Add photo_url column to patrimonio
ALTER TABLE public.patrimonio ADD COLUMN photo_url text NULL;

-- Create storage bucket for patrimonio photos
INSERT INTO storage.buckets (id, name, public) VALUES ('patrimonio-photos', 'patrimonio-photos', true);

-- RLS: authenticated users can view photos
CREATE POLICY "Anyone can view patrimonio photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'patrimonio-photos');

-- RLS: admins and technicians can upload photos
CREATE POLICY "Admins and technicians can upload patrimonio photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'patrimonio-photos'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'tecnico'::public.app_role))
);

-- RLS: admins and technicians can delete photos
CREATE POLICY "Admins and technicians can delete patrimonio photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'patrimonio-photos'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'tecnico'::public.app_role))
);
