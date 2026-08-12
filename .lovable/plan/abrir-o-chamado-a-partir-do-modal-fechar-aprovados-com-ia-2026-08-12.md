# Abrir o chamado a partir do modal "Fechar Aprovados com IA"

Hoje a lista de propostas da IA mostra só título, técnico, categoria sugerida e pontos — não dá para conferir se a pontuação faz sentido sem sair do modal.

## O que muda

- O título de cada chamado na tabela vira clicável (com indicação visual de link e cursor de mão).
- Ao clicar, abre o modal de detalhes do chamado por cima, com descrição, histórico e comentários, para validar se a categoria/pontuação sugerida está correta.
- Ao fechar o detalhe, o modal da IA continua aberto, com as escolhas de categoria já feitas preservadas (nada é perdido).

## Detalhes técnicos

- `src/components/chamados/AiCloseApprovedModal.tsx`: usar `useTicketModal()` (já disponível via `TicketModalProvider` em `App.tsx`) e chamar `openTicket(r.ticket_id)` no clique do título; `stopPropagation` para não fechar o overlay.
- Ajustar o `z-index` do overlay da IA (hoje `z-50`, igual ao do `TicketDetailModal`) para uma camada inferior (ex.: `z-40`), garantindo que o detalhe do chamado apareça por cima.
- Sem mudanças em regras de negócio, banco ou na edge function `close-approved-tickets-ai`.
