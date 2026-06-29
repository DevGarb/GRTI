## Problema

Ao excluir um chamado, a aba **Metas** (cards de TMA, Pontos, etc.) não recalcula automaticamente. Os dados continuam mostrando o ticket antigo até atualizar manualmente (F5).

Causa: o RPC `get_metas_tecnicos` lê direto da tabela `tickets`, então depois do DELETE o cálculo correto já está disponível no backend — porém o React Query mantém o cache da query `["metas-tecnicos", year, month]` (e queries irmãs de MVP/dashboard) porque os hooks de exclusão só invalidam `["tickets"]`.

Hoje só `TicketDetailModal` (mudanças de status) invalida `metas-tecnicos`. Os hooks `useDeleteTicket` e `useBulkDeleteTickets` em `src/hooks/useTickets.ts` não. O mesmo vale para o delete inline do `TicketDetailModal.tsx` (linha ~1155).

## Mudanças

1. **`src/hooks/useTickets.ts`** — em `useDeleteTicket.onSuccess` e `useBulkDeleteTickets.onSuccess`, invalidar também:
   - `["metas-tecnicos"]`
   - `["mvp-metrics"]`, `["mvp-chamados-metrics"]`, `["mvp-evolution"]`
   - `["projetos-dashboard"]`, `["dashboard-metrics"]`
   - `["tickets-calendar"]`, `["open-tickets"]`

2. **`src/components/TicketDetailModal.tsx`** — no handler de exclusão (~linha 1155), aplicar a mesma lista de invalidações antes de fechar o modal.

Sem mudanças no backend — o RPC já recalcula corretamente; o bug é puramente de cache no frontend.
