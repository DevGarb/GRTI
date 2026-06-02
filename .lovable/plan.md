# Permitir colaboradores abrirem OS na org Operacional

## Problema
Hoje, na organização Operacional, somente técnicos/admins/desenvolvedores conseguem criar Ordens de Serviço (OS) na Oficina. Isso ocorre porque a RLS de `op_service_orders` (e tabelas filhas de peças/fotos) usa `is_op_staff(organization_id)` para INSERT, e essa função exige role `admin`, `tecnico` ou `desenvolvedor`.

A regra desejada espelha o que já vale para chamados na org de T.I.: colaboradores podem **abrir** o registro, mas a gestão (atualizar/excluir) continua com o time técnico.

## Solução — apenas RLS (sem mudança de UI)

A página `/op/oficina` já está visível para colaboradores (nenhum gating de role no menu nem na rota). O botão "Nova OS" também não tem trava de role. Logo, basta liberar o INSERT no banco.

Migração ajustando as policies de INSERT (mantendo SELECT/UPDATE/DELETE como estão):

1. `op_service_orders` — policy `op_so_insert`: trocar `is_op_staff(organization_id)` por `is_member_of_org(organization_id)`.
2. `op_service_order_parts` — policy `op_sop_write` (ALL): substituir por policies separadas:
   - INSERT permitido a qualquer membro da org da OS pai.
   - UPDATE/DELETE permanecem restritos a `is_op_staff`.
3. `op_service_order_photos` — policy `op_soph_write` (ALL): mesmo desdobramento (INSERT por membro da org; UPDATE/DELETE só staff).

Isso garante que o colaborador consiga criar a OS e anexar peças/fotos no momento da abertura, mas não consiga editar/excluir OS de outros.

## Fora de escopo
- Nenhuma alteração em código frontend (`OpOficina.tsx`, `useOficina.ts`).
- Sem mudanças nas demais tabelas operacionais (entregas, manutenção, checklists), que seguem com a regra atual de staff.
- Sem mudança no fluxo de chamados da org de T.I.

## Observação para memória
Após aplicar, atualizar `mem://features/multi-tenancy` (ou similar) registrando: "Colaboradores podem abrir OS na org Operacional; gestão (update/delete) continua restrita a staff."
