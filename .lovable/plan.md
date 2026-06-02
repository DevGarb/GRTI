## Problema

A página `/avaliacoes` está listando registros da tabela `evaluations` sem filtrar por `type`. A tabela guarda dois tipos diferentes:

- `satisfaction` (NPS do chamado, escala 1–5) — 717 registros
- `meta` (pontuação interna por categoria, escala até 10) — 965 registros

Hoje a query traz os dois, por isso aparecem notas "estranhas" (ex.: 2/5 do GABRIEL PORTO no ONBOARDING WILKEN, RESET SENHA, etc.) que na verdade são pontuação de categoria, não avaliação NPS do solicitante.

Foi isso que voltou: depois de mudarmos a escala visual para 1–5, as linhas `meta` (até 10) viraram "X/5" com `Math.min(score,5)`, dando 2/5, 5/5 falsos.

## Correção (somente frontend, 1 arquivo)

### `src/pages/Avaliacoes.tsx`

1. **Query `evaluations`**: adicionar `.eq("type", "satisfaction")` no `select` para nunca trazer registros de pontuação de categoria.
2. **Remover o `Math.min(ev.score, 5)`** já que agora todos os scores são 1–5 nativos.
3. **Card "Promotores (5)"**: manter o filtro `score >= 5` (já é compatível com escala 1–5).
4. **Form "Nova Avaliação"**: o insert já usa `type: "satisfaction"` — sem mudança.

## Fora de escopo

- Não alterar a tabela `evaluations` nem RLS.
- Não tocar nos hooks de pontuação/metas (`useGoals`, `MetasTecnicos`, `useManagementMetrics`) que continuam usando `type='meta'` corretamente.
- Não migrar dados antigos.
