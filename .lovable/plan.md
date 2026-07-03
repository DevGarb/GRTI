# Notificar invalidação de retrabalho

A auditoria de retrabalho já existe: dentro do chamado, o admin clica no badge laranja **Retrabalho (Nx)**, abre o diálogo **Validar marcações de retrabalho**, informa o motivo e a marcação é removida do técnico e do contador do chamado (via RPC `invalidate_ticket_rework`).

O que falta é **avisar solicitante e técnico** quando isso acontece, com a mensagem do admin visível dentro do próprio chamado.

## Comportamento novo

Quando o admin confirmar "Não retrabalho":

1. **Comentário no chamado** (visível na aba de comentários):
   > "A marcação de retrabalho de DD/MM/AAAA HH:mm foi invalidada pela administração. Motivo: <texto informado pelo admin>."

   Criado como `ticket_comments` público, autor = admin que invalidou. Assim solicitante e técnico veem no histórico da conversa.

2. **Notificações in-app** (sino) para:
   - `tickets.created_by` (solicitante que registrou o retrabalho)
   - `tickets.assigned_to` (técnico do chamado), quando existir e for diferente do admin
   - Título: "Retrabalho invalidado — #<id curto>"
   - Corpo: motivo informado (truncado se muito longo)
   - `ticket_id` preenchido → clique abre o chamado

3. O comportamento atual continua igual:
   - `ticket_history`: linha vira `rework_invalidated` + linha `rework_removed` registrada
   - Contador de retrabalho do chamado e do técnico cai imediatamente
   - Métricas de admin / MVP recalculam

## Onde muda

### Backend (migration — SQL)
Atualizar `public.invalidate_ticket_rework(_history_id, _reason)` para, ao final da transação, inserir:

- 1 linha em `ticket_comments` (`ticket_id`, `user_id = auth.uid()`, `content = <mensagem acima>`, `is_public = true`)
- 1 linha em `notifications` para o `created_by` do ticket
- 1 linha em `notifications` para o `assigned_to`, se existir e ≠ admin e ≠ created_by
- `type = 'rework_invalidated'`, `ticket_id` preenchido, `organization_id` = org do ticket

Sem mudança de schema, sem novas policies (a função é SECURITY DEFINER).

### Frontend (`src/components/TicketDetailModal.tsx`)
No `handleRemoveRework`, após o RPC ter sucesso, invalidar também:
- `["ticket-comments", ticket.id]`
- `["notifications"]` (para o próprio admin ver contadores atualizados)

Nada muda no diálogo em si, nem nas telas de métricas.

## Fora do escopo

- Envio de e-mail (fica só no sino e no comentário do chamado).
- Nova aba de auditoria de retrabalhos.
- Categorização estruturada do motivo (continua texto livre).
- Auditoria de retrabalho de tarefas de Projetos.
