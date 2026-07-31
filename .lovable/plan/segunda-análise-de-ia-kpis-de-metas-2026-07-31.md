# Segunda análise de IA: KPIs de Metas

Hoje a tela Métricas Gerenciais tem uma única análise (operacional: volume, backlog, CSAT, retrabalho, TMA). Vamos manter essa e adicionar uma segunda análise, focada em Metas.

## O que a nova análise mostra

Baseada no mês de referência do filtro ativo (metas são mensais — se o filtro for "Hoje"/"Ontem"/"7 dias", usamos o mês correspondente à data final do período e indicamos isso no cabeçalho):

- **Atingimento das metas** — por técnico com meta definida, o percentual de atingimento de cada métrica (chamados fechados, nota média, tempo de resolução, pontuação, preventivas, retrabalho máximo, projetos entregues), mais o atingimento médio geral da equipe.
- **Volume de chamados resolvidos** — total do mês e por técnico.
- **CSAT** — média do mês e por técnico (com quantidade de avaliações).
- **Pódio de pontuação** — Top 1, Top 2, Top 3 e Top 4 em pontos de chamados no mês.

Além dos números, a IA gera insights específicos de metas: quem já bateu, quem está no caminho, quem está em risco de não atingir (com o gap que falta e o ritmo diário necessário nos dias úteis restantes), e uma recomendação nominal.

## Como fica na tela

Na página Métricas Gerenciais, o card de insights ganha duas abas:

```text
[ Operacional ]  [ Metas ]
```

- **Operacional** — exatamente a análise atual, sem mudanças.
- **Metas** — novo bloco com: cards de KPI (atingimento médio, chamados resolvidos, CSAT médio, técnicos com meta), pódio Top 1–4 com pontuação, tabela de atingimento por técnico com barra de progresso por métrica, e a lista de insights da IA.

Cada aba gera e cacheia sua análise separadamente; o botão "Regerar" atua sobre a aba ativa.

## Detalhes técnicos

- **Edge function** `generate-executive-summary`: aceitar `analysis_type: "operational" | "goals"` (default `operational`, mantendo compatibilidade). Para `goals`, buscar dados via RPC `get_metas_tecnicos(_year, _month)` e a tabela `performance_goals` (filtrada por org, `reference_year`/`reference_month`, `target_type = 'individual'`), calcular atingimento reaproveitando a mesma lógica de `GoalsSummaryCards` (incluindo métricas inversas: `avg_resolution_hours` e `rework_percent`), montar o pódio por `total_points` e chamar o modelo com um prompt novo, dedicado a metas.
- **Cache**: `daily_insights_cache` passa a chavear também pelo tipo de análise (sufixo no par from/to ou coluna adicional), para que as duas análises não sobrescrevam uma à outra.
- **Frontend**:
  - `src/hooks/useExecutiveSummary.ts`: parâmetro `analysisType` na query key e no body; novo tipo de retorno com `goal_kpis`, `podium` e `goal_rows`.
  - Novo componente `src/components/metricas/GoalsAnalysisCard.tsx` (KPIs + pódio + tabela + insights).
  - `src/pages/MetricasGerenciais.tsx`: abas Operacional/Metas no bloco de insights.
- **Sem mudanças** em regras de negócio, banco (exceto a chave de cache), no cálculo de metas existente ou na análise operacional atual.
