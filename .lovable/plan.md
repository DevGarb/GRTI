## Problema

A organização **OPERACIONAL** está vendo as categorias do **Grupo Ramos**.

**Causa raiz:** todas as 179 categorias existentes no banco têm `organization_id = NULL`. A política RLS atual (`organization_id IS NULL OR is_same_organization(...)`) trata `NULL` como "categoria global", então qualquer organização nova (KONFIA, OPERACIONAL) enxerga todas elas.

Além disso, o código em `src/pages/Categorias.tsx` cria novas categorias **sem** preencher `organization_id`, perpetuando o problema.

Outras tabelas (sectors, patrimonio, tickets, projects) já estão corretas — todos os registros têm `organization_id` preenchido.

## Solução

### 1. Backfill das categorias órfãs (migração de dados)
Atribuir todas as 179 categorias existentes ao **Grupo Ramos** (organização original onde foram criadas):

```sql
UPDATE categories
SET organization_id = 'a543a17b-0def-4ceb-acf5-91017f2b0ad3'
WHERE organization_id IS NULL;
```

### 2. Tornar `organization_id` obrigatório (migração de schema)
Para evitar regressão futura:

```sql
ALTER TABLE categories
  ALTER COLUMN organization_id SET NOT NULL;
```

### 3. Endurecer a política RLS de SELECT
Remover a brecha do `IS NULL`:

```sql
DROP POLICY "Users can view org categories" ON categories;
CREATE POLICY "Users can view org categories" ON categories
FOR SELECT TO authenticated
USING (is_super_admin(auth.uid()) OR is_same_organization(organization_id));
```

### 4. Corrigir `src/pages/Categorias.tsx`
No `createCategory.mutationFn`, incluir `organization_id: profile?.organization_id` no insert (usando `useAuth`). Sem isso, novas categorias continuariam quebrando o NOT NULL.

## Resultado esperado

- **Grupo Ramos**: continua vendo as 179 categorias (agora marcadas como dele).
- **KONFIA** e **OPERACIONAL**: começam zeradas, e cada admin cria as próprias.
- Super admin: continua vendo tudo via filtro de organização.
- Novas categorias sempre nascem vinculadas à organização do criador.

## Arquivos afetados

- Nova migração SQL (backfill + NOT NULL + RLS)
- `src/pages/Categorias.tsx` (incluir `organization_id` no insert)
- `mem://features/multi-tenancy` (registrar que categorias agora também são auto-associadas)
