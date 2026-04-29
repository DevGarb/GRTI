-- 1. Backfill: atribuir categorias órfãs ao Grupo Ramos
UPDATE public.categories
SET organization_id = 'a543a17b-0def-4ceb-acf5-91017f2b0ad3'
WHERE organization_id IS NULL;

-- 2. Tornar obrigatório
ALTER TABLE public.categories
  ALTER COLUMN organization_id SET NOT NULL;

-- 3. Endurecer RLS de SELECT (remover brecha do IS NULL)
DROP POLICY IF EXISTS "Users can view org categories" ON public.categories;
CREATE POLICY "Users can view org categories"
  ON public.categories
  FOR SELECT
  TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR is_same_organization(organization_id)
  );