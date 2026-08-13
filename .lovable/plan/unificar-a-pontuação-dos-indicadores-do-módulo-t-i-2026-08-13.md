# Unificar a pontuação dos indicadores do módulo T.I

## O que está acontecendo

Conferi os números de agosto/2026 direto no banco. As duas telas mostram valores diferentes porque usam **regras diferentes de pontuação**:

| Técnico | Metas (card) | Dashboard (tabela) | Correto |
|---|---|---|---|
| Maria Izabele | 103 | 112 | 103 |
| Felipe Augusto | 102 | 106 | 102 |
| Victor Hugo | 107 | 60 | 107 |
| Danilo | 48 | 25 | 48 |

Duas causas confirmadas:

1. **Pontos de sprint ficam de fora do Dashboard.** Chamados de crédito de sprint (tipo "Projeto") não têm avaliação, valem pelos `story_points`. Victor tem 47 pontos de sprint e Danilo 23 — o Dashboard simplesmente ignora esses pontos.
2. **Data de corte diferente.** As Metas contam o chamado no mês em que ele foi *finalizado* (entrou em "Aguardando Aprovação"); o Dashboard conta pelo `closed_at`. Chamados finalizados em julho e fechados em agosto entram em agosto no Dashboard — é o que infla Izabele (+9) e Felipe (+4). O Dashboard também ignora chamados com status "Aprovado".

Também verifiquei que a pontuação da categoria e a nota de "meta" do chamado são idênticas em 100% dos casos, então a diferença não vem daí.

## Regra única a ser adotada

A regra das Metas (já usada também no MVP), aplicada em todos os pontos do módulo T.I:

- Período: mês em que o chamado foi finalizado (`Aguardando Aprovação`, ou fechamento quando foi direto para Fechado/Aprovado)
- Status: Fechado e Aprovado
- Pontos: pontuação da categoria; quando não houver categoria e o chamado for do tipo "Projeto", usar os `story_points` da sprint

## Onde ajustar

1. **Dashboard T.I** (`useDashboardMetrics`) — coluna "Pts" da tabela "Acompanhamento Detalhado por Técnico" e o card "Pontuação Total" passam a usar a regra única.
2. **Métricas Gerenciais** (RPC `get_management_metrics` e `get_management_metrics_admin`) — a coluna de pontos hoje soma só as avaliações; passa a incluir os pontos de sprint.
3. **Painel de TV** (RPC `get_tv_goals_summary`) — o total de pontos do mês hoje usa `closed_at` e ignora pontos de sprint; passa a usar a mesma regra.
4. Metas dos Técnicos, MVP e a tela de Chamados T.I já seguem a regra — só serão conferidos, sem alteração.

## Detalhes técnicos

- Uma migration ajustando as três funções: nas CTEs de chamados fechados, incluir `t.type` e `t.story_points` e trocar a soma de pontos por
  `COALESCE(cat.score, CASE WHEN t.type = 'Projeto' THEN t.story_points END, 0)`.
- `get_tv_goals_summary` também troca o filtro `closed_at` por `COALESCE(aguardando_aprovacao_at, closed_at)` no bloco de pontos.
- No frontend, `src/hooks/useDashboardMetrics.ts` passa a montar os pontos com os helpers de `src/lib/sprintScoring.ts` (mesma lógica já usada em `ChamadosTI.tsx`), incluindo status "Aprovado" e o corte por finalização efetiva.
- Sem mudança de layout; nenhum dado é reescrito, o recálculo é retroativo automaticamente.

## Verificação

Após a mudança, em agosto/2026 as duas telas devem mostrar 103 / 102 / 107 / 48 para Izabele, Felipe, Victor e Danilo, e o painel de TV o mesmo total.
