# Ajuste no card de Pontos da aba Metas

## Objetivo
No card de métricas individuais do técnico (`GoalsSummaryCards.tsx`), para a métrica **Pontos**, manter o valor absoluto de pontos e exibir a porcentagem atingida em relação à meta como um badge ao lado.

Exemplo: meta 250 pontos e técnico com 274 pontos → exibir **274** com badge **110%**.

## Alterações propostas

1. **Modificar `src/components/metas/GoalsSummaryCards.tsx`**
   - Na linha que renderiza o valor principal do card (atualmente linha 198–200), voltar a exibir o valor absoluto de pontos (`Math.round(d.actual)`).
   - Adicionar um badge pequeno ao lado do valor, mostrando `Math.round((d.actual / d.target) * 100)` seguido de `%`.
   - O badge deve usar cor visualmente coerente com o restante do card (ex.: verde quando meta atingida, tom neutro/destaque caso contrário).
   - Manter a linha "meta: {valor}" inalterada.
   - A barra de progresso e a coloração do card continuam baseadas no `d.pct` já calculado.

## Validação
- Executar `bun run build` para garantir que não haja erros de compilação.
