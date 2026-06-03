## Problema

Hoje as RLS de **`op_deliveries`** (Entregas) exigem `is_op_staff(organization_id)` (admin/técnico/desenvolvedor) tanto para INSERT quanto para UPDATE/DELETE. Por isso colaboradores comuns recebem "permissão RLS" ao tentar criar uma entrega.

A **Oficina** (`op_service_orders`) já permite INSERT para qualquer membro (`is_member_of_org`), então essa parte funciona — mas vou alinhar a regra também aqui.

A regra confirmada é: **qualquer colaborador da organização pode abrir registros; edição/movimentação/exclusão continua restrita à equipe operacional**.

## O que muda

### Banco (RLS)
- `op_deliveries`: trocar a policy de INSERT para `is_member_of_org(organization_id)` (igual ao padrão da Oficina). UPDATE/DELETE seguem restritos a `is_op_staff`.
- `op_maintenance_orders` (OM): aplicar a mesma liberação no INSERT, para manter coerência com Entregas e Oficina (também é abertura de chamado operacional).
- `op_service_orders`: já está correto — sem mudanças.

### Frontend
- Nenhuma mudança funcional necessária para abertura. Os hooks `useDeliveries.add` e `useOficina.add` já enviam `organization_id` e `created_by` corretamente.
- Pequeno ajuste de UX: esconder/desabilitar botões de **editar/excluir/arrastar** quando o usuário não for `op_staff`, para evitar erros silenciosos depois de criar. Vou expor um helper `isOpStaff` a partir de `useAuth` (baseado em `roles.includes('admin'|'tecnico'|'desenvolvedor')`) e usar nas páginas `OpEntregas.tsx`, `OpOficina.tsx`, `OpManutencao.tsx`.

## Detalhes técnicos

Policies novas (substituindo as atuais de INSERT):

```sql
-- Entregas
DROP POLICY "op_del_insert" ON public.op_deliveries;
CREATE POLICY "op_del_insert" ON public.op_deliveries
  FOR INSERT TO authenticated
  WITH CHECK (is_member_of_org(organization_id) AND created_by = auth.uid());

-- Manutenção
DROP POLICY "op_mo_insert" ON public.op_maintenance_orders;
CREATE POLICY "op_mo_insert" ON public.op_maintenance_orders
  FOR INSERT TO authenticated
  WITH CHECK (is_member_of_org(organization_id) AND created_by = auth.uid());
```

`op_service_orders.op_so_insert` já usa `is_member_of_org` — mantido.

No frontend, em `OpKanbanBoard`/ações de edição, passar a prop `isAllowed` considerando `isOpStaff` para colaboradores comuns só visualizarem.

## Validação

- Logar como `natielle` (solicitante na OPERACIONAL) → criar Entrega e OS com sucesso; tentar mover card → bloqueado pelo UI; UPDATE direto → ainda barrado pelo RLS (defesa em profundidade).
- Logar como admin/técnico → fluxo completo continua funcionando.

## Memória

Atualizar `mem://features/multi-tenancy` (ou criar entrada em `mem://features/operacional`) registrando: "Abertura de Entregas/OS/OM no módulo Operacional é liberada para qualquer membro da organização; edição segue restrita a admin/técnico/desenvolvedor".