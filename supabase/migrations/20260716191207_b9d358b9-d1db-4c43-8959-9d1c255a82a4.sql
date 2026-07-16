ALTER TABLE public.op_deliveries
  ADD COLUMN IF NOT EXISTS receiver_name text,
  ADD COLUMN IF NOT EXISTS receiver_document text,
  ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}';

DO $$ BEGIN
  CREATE POLICY "delivery-photos auth read"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'delivery-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "delivery-photos auth upload"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'delivery-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "delivery-photos auth update"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'delivery-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "delivery-photos auth delete"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'delivery-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;