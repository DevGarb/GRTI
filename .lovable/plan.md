## Diagnóstico

Verifiquei o erro "RLS em op_service_orders" ao abrir uma OS na Oficina. O usuário **Gabriel Porto** tem perfil em `grupo-ramos` com role `admin` e está vinculado a 2 organizações (`grupo-ramos` e `cgps-operacional`). As policies atuais funcionam apenas via `is_same_organization()`, que olha somente para `profiles.organization_id` — o que falha em vários cenários (membros multi-org, sessão recém-trocada, super_admin com org nula).

Além disso, as policies dos módulos operacionais foram criadas como um único `FOR ALL` por tabela, o que dificulta diferenciar visualização (todos da org) de escrita (apenas staff). Isso gera inconsistências e erros silenciosos em inserções de filhos (peças, fotos, checklist).

## O que vou fazer

### 1. Corrigir o root cause de RLS (uma migração)

Criar/atualizar funções `SECURITY DEFINER`:
- `public.is_member_of_org(_org uuid)` — true se o usuário tem o org como `profiles.organization_id` **ou** vínculo em `user_organizations` (ou é super_admin).
- `public.is_op_staff(_org uuid)` — true se for super_admin **ou** (membro do org **e** com role admin/tecnico/desenvolvedor).

Reescrever todas as policies das tabelas `op_*` separando claramente:
- `SELECT` → `is_member_of_org(organization_id)` (qualquer membro do org vê).
- `INSERT/UPDATE/DELETE` → `is_op_staff(organization_id)`.

Tabelas cobertas: `op_service_orders`, `op_service_order_parts`, `op_service_order_photos`, `op_maintenance_orders`, `op_maintenance_photos`, `op_deliveries`, `op_companies`, `op_drivers`, `op_vehicles`, `op_mechanics`, `op_parts`, `op_sites`, `op_checklist_templates`, `op_checklist_items`, `op_checklist_executions`, `op_card_notes`.

Para tabelas filhas (parts/photos/items) o `is_op_staff` é avaliado via `EXISTS` no pai usando o `organization_id` da OS/OM/template.

### 2. Varredura nos módulos do Operacional (frontend)

Para cada módulo (`OpOficina`, `OpManutencao`, `OpEntregas`, `OpCadastros`):
- Garantir que **todo insert** envia `organization_id = profile.organization_id` e `created_by = user.id`, com early-return + toast quando esses valores estiverem ausentes (evita erros 42501 silenciosos).
- Padronizar o tratamento de erro: exibir `error.message` no toast em todas as mutações dos hooks `useOficina`, `useManutencao`, `useDeliveries`, `useOperacional` (alguns updates/removes hoje silenciam erros de RLS).
- Verificar o fluxo de **fechamento** (modal "O que foi feito?") nos 3 módulos para usar o mesmo padrão.
- Conferir o upload de fotos no Storage `op-service-orders` e `patrimonio-photos` (path com `organization_id` quando aplicável) — não mexer nas policies de Storage agora se não houver erro.

### 3. Validação

- Após a migração, confirmar via SQL que todas as tabelas `op_*` têm policies SELECT + INSERT + UPDATE + DELETE corretas (sem `FOR ALL` ambíguo).
- Pedir ao usuário para tentar abrir uma OS novamente e reportar.

## Arquivos afetados

- **Nova migração**: `supabase/migrations/<timestamp>_op_rls_overhaul.sql` (funções + recriação de policies de todas as tabelas `op_*`).
- **Frontend (apenas tratamento de erro / guards)**: 
  - `src/hooks/useOficina.ts`
  - `src/hooks/useManutencao.ts`
  - `src/hooks/useDeliveries.ts`
  - `src/hooks/useOperacional.ts`
- Páginas dos módulos não devem precisar de alteração estrutural; só ajustes pontuais se algum insert estiver enviando org errada.

## Observações

- Não vou alterar regras de negócio dos status, kanban ou modais — apenas RLS e guards de erro.
- A nova função `is_member_of_org` resolve de uma vez o problema de usuários multi-org (que já causou o bug dos TODOs do Gabriel aparecerem na org operacional).
