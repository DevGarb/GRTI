# Painel de TV — um único botão de data na Agenda

## O que muda

Hoje a Agenda tem dois controles: um menu (Hoje / Ontem / Mês passado / Personalizado) e um calendário de intervalo escondido atrás dele. Isso vira **um só botão** com a data selecionada (ex.: `01/09/2026`), que abre um calendário de **dia único**.

Comportamento:
- Clique no botão → calendário mensal abre.
- Só é possível navegar/selecionar dentro do **mês atual e do mês anterior**; datas futuras bloqueadas.
- Ao escolher um dia, o painel busca e mostra os chamados **criados naquele dia** (regra atual mantida) e o calendário fecha.
- Padrão ao abrir o painel: hoje. Um atalho "Hoje" fica ao lado do botão para voltar rápido.
- O título continua como "Agenda de Hoje" quando for o dia atual, e "Agenda · dd/MM/yyyy" nos demais dias.

## Detalhes técnicos

- `src/components/tv/TodayAgendaPanel.tsx`: remover `DropdownMenu` e o `PopoverTrigger` oculto; usar um `Popover` com botão visível e `Calendar mode="single"` com `fromDate` = primeiro dia do mês anterior e `toDate` = hoje. `AgendaFilter` passa a ter `from === to` sempre; manter o campo `type` com `"today"` quando a data for o dia atual e `"custom"` nos demais, para não quebrar o consumo em `TvDashboard.tsx` (que usa `type !== "today"` para decidir a query extra).
- `computeAgendaRange` fica com a assinatura simplificada para receber uma `Date` única.
- Como só há dia único, a `MultiDayView` deixa de ser usada; será removida.
- Nenhuma mudança na edge function `tv-dashboard`.

## Verificação

`bun run build` e conferência visual: selecionar ontem e um dia do mês anterior, ver a lista mudar.
