## Retrabalho em chamado já fechado (admin)

### Problema
Hoje só o solicitante consegue mandar para retrabalho — e só quando o chamado está em "Aguardando Aprovação". Quando o chamado já foi fechado e o problema retorna depois, não há como o admin marcar retrabalho nem reabrir.

### Solução
Adicionar, no `TicketDetailModal`, um botão **"Marcar como retrabalho"** visível apenas para admin/super_admin quando `status === "Fechado"`. Ao clicar, abre um modal de confirmação (`AlertDialog`) com um campo obrigatório de motivo. Ao confirmar:

1. Registra histórico `action = "rework"` com `old = "Fechado"`, `new = "Em Andamento"`, descrição `"Retrabalho: <motivo>"` — isso já é contado em todos os hooks/métricas existentes (`reworkCount`, `get_metas_tecnicos`, `get_management_metrics`).
2. Atualiza o ticket para `status = "Em Andamento"` (o trigger `set_ticket_closed_at` automaticamente limpa `closed_at`). Mantém o `assigned_to` atual.
3. Registra histórico `status_change` (Fechado → Em Andamento).
4. Dispara webhook `ticket_reopened` (novo evento, reaproveita a função `dispatchWebhookEvent`) e WhatsApp event `rework` para o técnico, igual ao fluxo existente.
5. Toast de sucesso e fecha o modal de confirmação.

### Localização da UI
Na barra de ações do `TicketDetailModal`, junto dos outros botões admin que aparecem para chamado fechado (próximo ao "Avaliar Atendimento" / "Alterar pontuação"). Estilo destacado em laranja (mesma paleta do badge `Retrabalho`) com ícone `RefreshCw`.

### Detalhes técnicos

**Arquivo:** `src/components/TicketDetailModal.tsx`

- Novo estado: `showReworkDialog`, `reworkReason`, `isReworking`.
- Novo handler `handleAdminRework()`:
  ```
  - valida reworkReason.trim()
  - addHistory("rework", "Fechado", `Retrabalho: ${reason}`)
  - updateTicket.mutate({ id, status: "Em Andamento" })
  - addHistory("status_change", "Fechado", "Em Andamento")
  - dispatchWebhookEvent(ticket.id, "ticket_reopened", { reason })
  - send-whatsapp event_type: "rework"
  - invalidate queries: tickets, ticket-rework-count, ticket-history
  - toast.success + reset
  ```
- Botão renderizado quando `isAdmin && isClosed`, antes ou junto do bloco de avaliação.
- `AlertDialog` (já usado em outros pontos do arquivo) com `Textarea` para motivo, botão "Confirmar Retrabalho" desabilitado quando vazio.

### Fora do escopo
- Não alterar permissão para técnico — só admin/super_admin.
- Não mexer no cálculo de métricas (já contam `action='rework'` automaticamente).
- Não criar nova policy de RLS — admin já tem UPDATE em tickets e INSERT em ticket_history.
