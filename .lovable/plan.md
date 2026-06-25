## Permitir admin editar/remover marcações de Retrabalho

Hoje o badge laranja `Retrabalho (Nx)` no topo do modal do chamado vem da contagem de linhas em `ticket_history` com `action='rework'`. Não há como o admin desfazer uma marcação feita por engano.

### Mudanças

**1. UI — `src/components/TicketDetailModal.tsx`**
- Tornar o badge `Retrabalho (Nx)` clicável **apenas para admin/superadmin** (mantém visual atual, vira botão).
- Ao clicar, abrir um `Dialog` "Validar marcações de retrabalho" listando cada entrada `rework` do histórico do chamado, mostrando:
  - Data/hora
  - Autor (quem marcou)
  - Motivo (`details`)
  - Origem: solicitante reprovou / admin reabriu fechado
  - Botão **"Remover marcação"** com `AlertDialog` de confirmação.
- Para não-admins, o badge continua apenas informativo (sem clique).

**2. Ação de remoção**
- Deletar a linha de `ticket_history` correspondente (id específico).
- Registrar uma nova entrada de histórico `action='rework_removed'` com o motivo informado pelo admin (textarea obrigatória) para manter auditoria de quem invalidou.
- Invalidar queries: `ticket-rework-count`, `ticket-history`, `tickets`.
- Toast de sucesso/erro.

**3. RLS / banco**
- `ticket_history` já é gerenciado por triggers/edge; verificar se há policy de DELETE para admin. Se não houver, adicionar via migration:
  - Policy `DELETE` em `public.ticket_history` permitindo quando `has_role(auth.uid(), 'Administrador')` ou superadmin, restrita ao mesmo `organization_id` do ticket.
- Nada muda para colaboradores/técnicos.

### Fora do escopo
- Não altera a lógica de criação de retrabalho (reprovação pelo solicitante e botão "Marcar como Retrabalho e Reabrir" continuam iguais).
- Não mexe nas penalidades de MVP (são calculadas a partir de `project_tasks`, não desse contador).
