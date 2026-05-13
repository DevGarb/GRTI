## Problema

Dois bugs distintos no fluxo multi-tenant:

**1. A organização "RESOLVE" não aparece no seletor após o login.**
O trigger `handle_new_user` só vincula usuários novos às orgs `grupo-ramos` e `cgps-operacional` (hardcoded). Quando uma nova org é criada no SuperAdmin, ela é apenas inserida em `organizations` — ninguém é vinculado em `user_organizations`. O hook `useUserOrganizations` lista a partir dessa tabela, então a nova org fica invisível para todos (inclusive para o super admin que a criou).

**2. O usuário criado dentro da RESOLVE não aparece na aba "Usuários".**
A página `Usuarios.tsx` filtra por `user_organizations.organization_id = adminOrgId`. A função `create-user` faz insert em `profiles.organization_id` e em `user_organization_roles`, mas **não insere em `user_organizations`**. Como o trigger `handle_new_user` só vincula às duas orgs antigas, o novo usuário nunca entra em `user_organizations` da RESOLVE — daí some da listagem do admin, mas continua visível no painel SuperAdmin (que não filtra).

## Mudanças

### 1. `supabase/functions/create-user/index.ts`
Após resolver o `organizationId`, fazer upsert em `user_organizations` (`user_id`, `organization_id`) com `onConflict: "user_id,organization_id"`. Isso garante que todo usuário criado pelo admin de uma org seja membro daquela org, independente do que o trigger fez.

### 2. Criação de organizações no SuperAdmin
Após `insert` bem-sucedido em `organizations` (em `src/pages/SuperAdmin.tsx`, linha 377), vincular automaticamente:
- Todos os super_admins existentes em `user_organizations` (para que vejam/possam atuar na nova org).
- Opcional: dar role `admin` em `user_organization_roles` para os super_admins na nova org (super_admin já tem bypass via `is_super_admin`, então pode dispensar).

Implementação: após o insert retornar o id da nova org, buscar `user_roles` onde `role = 'super_admin'`, e fazer upsert em `user_organizations` para cada um deles, ignorando conflitos.

### 3. (opcional, recomendado) Atualizar `handle_new_user`
Hoje hardcoda 2 slugs. Trocar por: vincular todo usuário novo a **todas** as orgs com role default `solicitante`, OU manter como está e exigir vinculação explícita pelo admin. Como o ponto (1) já cobre o caso do admin criando usuários, **não vou alterar o trigger nesta rodada** para evitar efeitos colaterais — a menos que você queira.

## Fora de escopo

- Não mexer em RLS (já está correta — o problema é falta de linhas, não de policy).
- Não alterar o seletor de org nem o login (já funcionam quando há vínculo).
- Não alterar `handle_new_user` agora (a menos que você confirme).

## Como testar depois

1. Criar nova org "TESTE" no SuperAdmin → ela deve aparecer no `OrgSwitcher` para o super admin.
2. Trocar para "TESTE", abrir Usuários, criar `joao.silva` → deve aparecer na lista imediatamente após o invalidate.
3. Fazer login como `joao.silva` → ele entra direto na TESTE (sem precisar de seletor, pois é a única org dele).

Confirma que sigo com (1) e (2)? E se quer também o (3) (mudar o trigger).
