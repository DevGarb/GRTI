# Retrabalho: flag no chamado e filtro funcionando

## O que está acontecendo

O Dashboard conta retrabalho corretamente, mas a lista de Chamados sempre mostra zero — por isso o filtro "Retrabalho" não retorna nada.

Causa confirmada: em `src/hooks/useTickets.ts` a contagem de retrabalho é buscada com um `in(ticket_id, [...])` contendo **todos** os IDs de chamados da organização. A organização T.I tem 2.001 chamados, o que gera uma URL enorme e a requisição falha; o erro é ignorado no código e o resultado vira "0 retrabalhos" para todos. No Dashboard a mesma consulta usa só os chamados do período (lista pequena), por isso lá funciona — hoje existe 1 retrabalho registrado (chamado 00294, fechado em 12/08).

## Solução

Parar de recalcular retrabalho no cliente e passar a guardar essa informação no próprio chamado.

### 1. Flag persistida no chamado (banco)
- Adicionar em `tickets` a coluna `rework_count` (inteiro, padrão 0).
- Trigger que incrementa `rework_count` sempre que um registro de histórico com ação `rework` é inserido.
- Ajustar a função `invalidate_ticket_rework` para decrementar o contador quando um retrabalho é invalidado.
- Backfill: preencher `rework_count` de todos os chamados existentes a partir do histórico atual.

### 2. Leitura direta (frontend)
- `useTickets.ts`: remover a busca em lote no histórico e usar `rework_count` que já vem na linha do chamado.
- `TicketModalContext.tsx`: passar a usar o mesmo campo (hoje fica fixo em 0).
- Filtro "Retrabalho" e a contagem da lista passam a funcionar por consequência, sem mudança de regra.

### 3. Flag visual no chamado
- Badge "Retrabalho (Nx)" laranja na linha da lista de chamados e no Kanban, além do que já existe no modal de detalhes.
- Manter o comportamento atual do modal (histórico de retrabalhos e invalidação pelo admin).

## Detalhes técnicos
- Migração: `ALTER TABLE public.tickets ADD COLUMN rework_count integer NOT NULL DEFAULT 0`, trigger `AFTER INSERT ON ticket_history WHEN action = 'rework'`, update de backfill e ajuste da função existente `invalidate_ticket_rework`.
- Nenhuma alteração nas RPCs de Metas/MVP — elas já contam retrabalho direto no banco.
- Ao final: `bun run build`.
