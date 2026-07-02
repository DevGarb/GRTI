## Problema

No painel Operacional (ex.: Entregas), o KPI "Finalizados" mostra 8, mas a coluna "Finalizado" do Kanban aparece zerada.

## Causa

Em `src/pages/OpEntregas.tsx`, o filtro `filtered` (linha 79) remove **todas** as entregas com status "Finalizado" quando `hideFinalized = true` e a view é Kanban. Como `hideFinalized` começa em `true`, os cards finalizados nunca chegam ao `itemsByCol`, então a própria coluna "Finalizado" fica vazia.

O toggle "Ocultar finalizados" deveria esconder finalizados apenas das colunas de motoristas/pendentes — não da coluna "Finalizado" em si (ou então ocultar a coluna inteira).

## Correção

Aplicar a mesma lógica nas telas Kanban do painel Operacional que possuem coluna terminal:

- `src/pages/OpEntregas.tsx` (Entregas — status "Finalizado")
- Verificar também `src/pages/OpOficina.tsx` e `src/pages/OpManutencao.tsx` para o mesmo padrão (coluna terminal + toggle "ocultar finalizados") e ajustar se necessário.

### Mudanças em `OpEntregas.tsx`

1. **Remover** do `filtered` (linha 79) a condição `if (hideFinalized && view === "kanban" && d.status === "Finalizado") return false;`.
2. **Aplicar `hideFinalized` no `itemsByCol`**: quando `hideFinalized === true`, não popular `map[FINALIZED_COL]` (coluna aparece com contador 0) — OU melhor: **ocultar a própria coluna** do array `kanbanColumns` quando `hideFinalized === true`. Optar por ocultar a coluna, que é mais limpo visualmente.
3. Ao clicar no KPI "Finalizados" (linha 253), já é feito `setHideFinalized(false)` — manter, pois agora fará a coluna reaparecer com os cards.
4. Ajustar rótulo do botão toggle para deixar claro que oculta a coluna inteira.

### Resultado esperado

- Toggle "Ocultar finalizados" ON → coluna "Finalizado" some do Kanban (comportamento atual esperado, sem cards órfãos).
- Toggle OFF (ou clique no KPI Finalizados) → coluna "Finalizado" aparece com os 8 cards do mês.
- Filtros de mês / motorista / busca continuam se aplicando aos finalizados.

## Verificação

Após a mudança: abrir `/op/entregas`, confirmar que com toggle desligado a coluna "Finalizado" exibe a mesma contagem do KPI, e que clicar no KPI "Finalizados" traz os cards à tona.
