
-- Remove broad SELECT policies on public storage buckets to prevent listing.
-- Files remain accessible via public URLs (getPublicUrl); only LIST is blocked.

DROP POLICY IF EXISTS "Anyone can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view patrimonio photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read op-service-orders" ON storage.objects;
DROP POLICY IF EXISTS "Auth read maint photos bucket" ON storage.objects;

-- Allow only authenticated users to list/select objects in these buckets when needed by app UI.
CREATE POLICY "Authenticated can read attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'attachments');

CREATE POLICY "Authenticated can read org-logos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'org-logos');

CREATE POLICY "Authenticated can read patrimonio-photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'patrimonio-photos');

CREATE POLICY "Authenticated can read op-service-orders"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'op-service-orders');
