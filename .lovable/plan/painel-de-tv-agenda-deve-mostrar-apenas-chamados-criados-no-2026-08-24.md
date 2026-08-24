# Painel de TV — Agenda deve mostrar apenas chamados CRIADOS no dia

## Diagnóstico (o que mudou)

A Agenda/Timeline da TV é alimentada pela lista `today_tickets` da edge function `tv-dashboard`. Hoje ela inclui um chamado quando ele foi **criado no período OU fechado no período** (`createdInRange || closedInRange`, linhas ~230-250 de `supabase/functions/tv-dashboard/index.ts`). Quando um chamado antigo é aprovado/pontuado, o `closed_at` passa a ser hoje e ele entra na agenda — mesmo tendo sido criado dias atrás.

Por que isso passou a aparecer agora:

1. **16/07 (commit b49875e3)** — a consulta de tickets foi dividida em duas: uma de abertos e outra de "recentes" com `closed_at >= início do mês`. Antes, uma consulta única limitada a 1000 linhas frequentemente nem trazia chamados antigos fechados hoje; depois da divisão, eles passaram a ser carregados com garantia e a regra "fechado no período" começou a pegá-los.
2. O fluxo de fechamento automático com IA (`close-approved-tickets-ai`) e a pontuação em lote gravam `closed_at = agora` em chamados antigos, aumentando a frequência do problema.

A regra "criado OU fechado" em si existe desde 14/07, mas só ficou visível depois que a consulta passou a garantir a carga dos fechados do mês.

## O que muda

**`supabase/functions/tv-dashboard/index.ts`** — no bloco que monta `todayTickets`:
- Remover a condição `closedInRange` (e o uso de `closed_at` como data de referência).
- Manter apenas `createdInRange`: o chamado entra na agenda somente se `created_at` estiver dentro do período selecionado, sempre posicionado pelo horário de criação.

Isso vale para todos os filtros da agenda (Hoje, Ontem, Mês passado, Personalizado): cada período mostra só o que foi **criado** nele.

## Fora de escopo

- KPIs não mudam: "Fechados Hoje", TMA, ranking e "Equipe Agora" continuam usando a finalização efetiva (`aguardando_aprovacao_at`/`closed_at`) como hoje.
- Nenhuma alteração nos componentes React (`TodayAgendaPanel`, `TodayTimelinePanel`) — eles só consomem a lista.

## Verificação

1. Deploy da edge function `tv-dashboard`.
2. Conferir o painel: chamado antigo aprovado/pontuado hoje não aparece mais na Agenda de Hoje; chamado criado hoje continua aparecendo no horário correto.
3. `bun run build`.
