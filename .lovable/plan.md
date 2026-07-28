## Objetivo
Na página **Metas → Desempenho** (aba de ranking dos técnicos), exibir somente os técnicos que possuem meta individual definida para o mês/ano selecionado. Hoje a lista mostra todos os perfis com role de técnico/admin da org (Admin Grupo Ramos, Gabriel Porto, Ricardo Lima, Painel de TV etc.), mesmo sem meta.

## Mudança
Arquivo único: `src/pages/MetasTecnicos.tsx`

1. Criar uma lista derivada `visibleStats` = `stats.filter(s => hasGoals(s.userId))`.
   - `hasGoals` já existe (linha 178) e checa `performance_goals` com `target_type='individual'` para o mês/ano selecionado.
2. Trocar as referências de `stats` usadas para renderizar o ranking e os cards agregados por `visibleStats`:
   - `stats.map(...)` na lista (linha 377) → `visibleStats.map(...)`
   - `stats.length === 0` (linha 371) → `visibleStats.length === 0`, com mensagem ajustada ("Nenhuma meta individual definida para este mês.")
   - Contador do topo `{stats.length}` (linha 324) → `visibleStats.length`
   - Agregados `globalAvgScore`, `globalAvgHours`, `totalClosed`, `totalPoints` (linhas 180-187) → calcular sobre `visibleStats`, para os KPIs de topo refletirem apenas quem tem meta.
3. Não alterar a query do RPC nem a aba **Definir Metas** — ela continua listando todos os técnicos para permitir criar novas metas.

## Fora de escopo
- Nenhuma mudança em backend, RPC `get_metas_tecnicos`, RLS ou hook `useGoals`.
- Outras páginas (Dashboard, MVP, TV) permanecem inalteradas.
