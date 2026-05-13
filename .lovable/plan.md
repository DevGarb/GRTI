## Objetivo
Permitir que cada usuário tenha liberações de módulos diferentes por organização. Hoje os overrides de menu são salvos por usuário "global" (sem considerar a org ativa), e na leitura também são todos misturados.

## O que muda

### 1. Banco — `user_menu_overrides` por organização
- Trocar a chave única `(user_id, menu_key)` por `(user_id, organization_id, menu_key)`.
- Tornar `organization_id` NOT NULL (todos os registros atuais já têm valor).
- Adicionar índice `(user_id, organization_id)` para a leitura por org ativa.
- Manter as RLS atuais (já validam `is_same_organization(organization_id)`).

### 2. Leitura de permissões (`useMenuAccess`)
- Buscar overrides filtrando pela organização ativa do usuário (`profile.organization_id`), e refazer a busca quando a org ativa muda.
- Assim, ao trocar de organização no `OrgSwitcher`, o menu reflete as permissões daquela org.

### 3. Modal de permissões (`UserPermissionsModal` + `Usuarios.tsx`)
- Mostrar no cabeçalho a organização cujas permissões estão sendo editadas (a org ativa do admin que está editando).
- Carregar overrides filtrando por `(user_id, organization_id)`.
- Carregar os papéis (`roles`) do usuário **naquela organização** via `user_organization_roles` (em vez de papéis globais), para que o "Padrão" exibido reflita o que aquele usuário realmente tem na org em questão.
- Ao salvar: deletar/inserir filtrando também por `organization_id` (para não apagar overrides de outras orgs do mesmo usuário).
- Bloquear o botão se o admin não tiver `organization_id` ativa.

### Fora do escopo
- Não muda papéis (`user_organization_roles` já é por org).
- Não muda RLS das outras tabelas.
- Não cria UI nova para "ver/editar permissões de outra org" — segue o modelo de "edita a org que você está logado". Para liberar X em outra org, o admin troca de org e edita lá.

## Resumo técnico
1. Migração SQL: `DROP CONSTRAINT user_menu_overrides_user_id_menu_key_key`, `ALTER COLUMN organization_id SET NOT NULL`, `ADD CONSTRAINT ... UNIQUE (user_id, organization_id, menu_key)`, `CREATE INDEX idx_umo_user_org`.
2. `src/hooks/useMenuAccess.ts`: incluir `.eq("organization_id", profile.organization_id)` e dependência do org id no `useEffect`.
3. `src/components/usuarios/UserPermissionsModal.tsx`: filtrar select/delete por `organization_id`, carregar roles via `user_organization_roles` para a org ativa, exibir nome da org no header.
