# Agrupar notificações por chamado no sino

## Objetivo
No popover do sino, em vez de listar cada notificação solta, agrupar por `ticket_id` mostrando: título do chamado, quantas atualizações teve, quantas estão não lidas e um resumo dos tipos (comentário, status, atribuição, resolvido, rejeitado). Notificações sem `ticket_id` ficam em uma seção "Outras".

## Mudanças

### `src/hooks/useNotifications.ts`
- Adicionar um seletor derivado `groups: NotificationGroup[]` agrupando `items` por `ticket_id` (mantém ordem pela notificação mais recente do grupo).
- Cada grupo expõe: `ticket_id`, `latest` (notificação mais recente, usada para título/tempo), `count`, `unreadCount`, `typeCounts` (ex.: `{ ticket_comment: 3, ticket_status: 1 }`), `items` (ordenadas desc).
- Nova ação `markGroupAsRead(ticketId)`: marca todas as não lidas daquele ticket como lidas (otimista + update no banco com `.eq('ticket_id', ticketId).is('read_at', null)`).

### `src/components/NotificationBell.tsx`
- Renderizar `groups` em vez de `items`.
- Cada linha do grupo mostra:
  - Ícone do tipo mais recente
  - Título do chamado (do `latest.title`, que já referencia o ticket) + badge com `count` total
  - Linha de chips compactos por tipo com contagem (ex.: 💬 3 · 🔔 1 · ✅ 1) usando os mesmos ícones do `iconFor`
  - Ponto vermelho + contagem de não lidas quando `unreadCount > 0`
  - Tempo relativo da atualização mais recente
- Clique no grupo: chama `markGroupAsRead(ticket_id)` e navega para `/chamados?open=${ticket_id}`.
- Botão expandir (chevron) opcional: revela a lista completa de notificações daquele ticket inline (reaproveita layout atual de item), para quem quiser ver detalhe sem abrir o chamado.
- Seção "Outras" no fim para notificações sem `ticket_id` (comportamento atual mantido).
- "Marcar todas como lidas" continua igual.

## Fora de escopo
- Sem mudanças no banco, triggers ou tipos de notificação.
- Sem alterar realtime, contador do badge do sino, nem o som do admin.
