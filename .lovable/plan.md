# Corrigir TMA: contar a partir de "Em Andamento"

## Problema
Hoje `tickets.started_at` está sendo preenchido no momento da **atribuição** (igual ao `picked_at`). Como todos os cálculos de TMA (frontend e funções SQL) usam `started_at` como início, o tempo é contabilizado desde a atribuição/abertura — não desde o início efetivo do atendimento.

Evidência: amostra de 10 chamados fechados → `started_at == picked_at` em 100% dos casos.

## Solução

O `started_at` deve representar **o primeiro instante em que o chamado entrou no status "Em Andamento"**. Nunca deve ser definido na atribuição.

### 1. Garantir que `started_at` nunca seja setado na atribuição
- Auditar `usePickTicket` e `AssignTicketModal` para confirmar que não escrevem `started_at` (o código atual já não escreve, mas dados antigos foram gravados — provavelmente por versão anterior do hook ou por trigger antigo). Remover qualquer escrita residual.
- Verificar/remover triggers/defaults no banco que copiem `picked_at` em `started_at`.

### 2. Setar `started_at` apenas quando o status vira "Em Andamento"
Em vez de depender do frontend lembrar disso (hoje feito em `KanbanBoard.tsx` e `TicketDetailModal.tsx`), centralizar em um **trigger** em `tickets`:

```text
BEFORE UPDATE: se NEW.status = 'Em Andamento' AND OLD.status <> 'Em Andamento'
              AND NEW.started_at IS NULL  → NEW.started_at = now()
```

Remover as escritas manuais de `started_at` em `KanbanBoard.tsx` e `TicketDetailModal.tsx` (passam a ser redundantes).

### 3. Backfill dos dados existentes
Migração de dados: para cada ticket, recomputar `started_at` a partir de `ticket_history`:

```text
started_at = MIN(created_at) FROM ticket_history
             WHERE ticket_id = t.id
               AND action = 'status_change'
               AND new_value = 'Em Andamento'
```

Se nenhum evento existir (chamado nunca entrou em "Em Andamento"), `started_at` fica `NULL` — e o TMA daquele ticket vira 0/ignorado, que é o comportamento correto.

### 4. Confirmar os cálculos de TMA
Revisar e ajustar se necessário:
- `src/lib/ticketTiming.ts` → `fetchTicketWorkMinutes` (já usa `started_at` + eventos; com o backfill, passa a estar correto).
- Funções SQL: `get_management_metrics`, `get_management_metrics_admin`, `get_metas_tecnicos` — todas usam `started_at` como base, então o backfill resolve. Verificar se há double-count entre `initial_min` e o primeiro par de `paired` (mesma janela contada duas vezes); se houver, corrigir.

### 5. Validação
- Rodar a migração de backfill.
- Conferir 3-5 chamados no dashboard: TMA deve cair (já que agora ignora o tempo entre atribuição e início real do atendimento).
- Conferir que novos chamados, ao serem movidos para "Em Andamento", recebem `started_at = now()`.

## Arquivos afetados
- Nova migração SQL: trigger `tickets_set_started_at` + backfill de `started_at` + possível ajuste em `get_management_metrics*` se houver double-count.
- `src/components/KanbanBoard.tsx`: remover escrita manual de `started_at`.
- `src/components/TicketDetailModal.tsx`: remover escrita manual de `started_at` (linha 339).
- `src/hooks/useTickets.ts`: confirmar que `usePickTicket` não escreve `started_at` (já confirmado, sem alteração).
