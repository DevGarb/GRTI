# Ajuste no card de Pontos da aba Metas

## Objetivo
No card de métricas individuais do técnico (componente `GoalsSummaryCards.tsx`), quando a métrica for **Pontos**, exibir a porcentagem atingida em relação à meta em vez do valor absoluto.

Exemplo: meta 250 pontos e técnico com 274 pontos → exibir **110%** (274 ÷ 250 × 100, arredondado).

## Alterações propostas

1. **Modificar `src/components/metas/GoalsSummaryCards.tsx`**
   - No bloco que renderiza o valor principal do card (linhas 191–198), adicionar uma condição para `d.metricKey === "points"`.
   - Exibir `Math.round((d.actual / d.target) * 100)` seguido de `%`.
   - Manter a linha "meta: {valor}" inalterada.
   - A barra de progresso e a coloração (verde quando atinge a meta) continuam baseadas no `d.pct` já calculado.

## Validação
- Executar `bun run build` para garantir que não haja erros de compilação.
