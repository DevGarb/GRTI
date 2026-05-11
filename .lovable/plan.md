## Roles por organização

Hoje a role é global: `user_roles(user_id, role)`. Vamos passar para `user_organization_roles(user_id, organization_id, role)` para que o mesmo usuário possa ser Técnico no CGPS Operacional e Solicitante no Grupo Ramos.

A "organização ativa" do usuário continua sendo `profiles.organization_id` (já é assim em todo o app). As RLS e o frontend passam a olhar a role nessa org ativa.

### 1. Migração de schema

Criar nova tabela:

```
user_organization_roles
  id, user_id, organization_id, role (app_role), created_at
  UNIQUE (user_id, organization_id, role)
```

RLS:
- `SELECT`: o próprio user, admin da mesma org, ou super_admin.
- `INSERT/UPDATE/DELETE`: admin da mesma org (sem permitir mexer em `super_admin`) ou super_admin.

`super_admin` continua **global** em `user_roles` (não faz sentido por org). Demais roles migram para a nova tabela.

### 2. Migrar dados existentes

Para cada `(user_id, role)` em `user_roles` onde role ≠ `super_admin`:
- Inserir um registro em `user_organization_roles` para **cada** organização à qual o usuário pertence (via `user_organizations`).

Assim ninguém perde acesso. Depois você pode ajustar caso a caso (ex.: tirar "Técnico" do Wandson no Grupo Ramos).

### 3. Atualizar funções security definer

Reescrever para considerar a org ativa do `profiles.organization_id`:

- `has_role(_user_id, _role)` → true se `super_admin` global, ou existe role em `user_organization_roles` para o `_user_id` na org ativa do profile.
- `is_op_staff(_org)` → true se super_admin, ou se for membro da org E tem role admin/tecnico/desenvolvedor **naquela org** (`_org`, não a ativa).
- `is_staff_user(_user_id)` → idem, considerando a org ativa.
- Nova função `has_role_in_org(_user_id, _role, _org)` para casos específicos.

Todas as RLS de tickets, op_*, categories, etc. continuam funcionando — elas já chamam essas funções.

### 4. Frontend

- **AuthContext**: buscar roles de `user_organization_roles` filtrando por `profile.organization_id`. Manter `super_admin` vindo de `user_roles`.
- **Usuarios.tsx** (admin de cada org): editar role apenas do escopo da org atual, lendo/gravando em `user_organization_roles` com o `organization_id` do admin logado.
- **SuperAdmin.tsx**: permitir editar role por organização — adicionar coluna/seletor "Organização" ao lado do seletor de role, listando as orgs do usuário. Suporta múltiplas roles por org.
- Quando o usuário troca de organização ativa (futuro), o AuthContext refaz o fetch de roles.

### 5. Limpeza

- Manter `user_roles` apenas para `super_admin` (remover demais linhas após validação).
- Trigger `handle_new_user` continua criando `solicitante` em `user_roles`? → Mudar para inserir `solicitante` em `user_organization_roles` para cada org auto-vinculada (`grupo-ramos`, `cgps-operacional`).

### Detalhes técnicos

- Nova função:
  ```
  current_org_role(_user_id, _role) returns boolean
    -- exists in user_organization_roles for the user's profile.organization_id
  ```
- `has_role` passa a delegar para `current_org_role` + check de super_admin.
- Mantemos as chaves antigas (`user_roles`) só para `super_admin` para não quebrar nada.

### Verificações pós-migração

- Wandson: confirmar que terá `solicitante` no Grupo Ramos e podermos promovê-lo para `tecnico` apenas no CGPS Operacional.
- Admins atuais: garantir que continuam admin nas duas orgs (até você decidir reduzir).
- Login + dashboard de cada role nas duas orgs.
