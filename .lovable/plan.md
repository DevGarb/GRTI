## Objetivo

Substituir a barra de progresso atual (que mistura tarefas/chamados) por um indicador claro baseado em **sprints concluídas vs total de sprints** do projeto, alinhado à regra unificada `isSprintEffectivelyDone` (status `concluida` OU 100% dos itens finalizados).

## Mudanças

### 1. `src/hooks/useProjects.ts`
- Buscar também as **tarefas por sprint** (já feito) e os **chamados por sprint** para conseguir calcular o `donePct` de cada sprint usando a mesma regra do `useSprints`.
- Adicionar ao `ProjectAggregate`:
  - `completedSprints: number` — sprints com status `concluida` ou com 100% dos itens feitos.
  - `sprintProgressPct: number` — `round(completedSprints / totalSprints * 100)`, `0` quando não há sprints.
- Reaproveitar `isSprintEffectivelyDone` importado de `useSprints.ts`.

### 2. `src/components/projetos/ProjectCard.tsx`
- Trocar o bloco "Tarefas concluídas" pelo novo indicador:
  - Label: **"Progresso por sprints"**.
  - Contagem: `{completedSprints} / {totalSprints} sprints`.
  - `<Progress value={sprintProgressPct} />`.
  - Quando `totalSprints === 0`: exibir estado vazio discreto ("Nenhuma sprint criada") sem barra.
- Manter a linha de metadados (backlog, sprints ativas, datas, responsáveis).

### 3. `src/components/projetos/ProjectOverview.tsx`
- Alinhar o card de progresso do topo para usar a mesma métrica (sprints concluídas / total), mantendo o detalhamento de tarefas/chamados abaixo como informação complementar.

## Regra de cálculo

```text
sprintDone(s)   = s.status == "concluida" OR (totalItens(s) > 0 AND donePct(s) == 100)
completedSprints = count(sprintDone)
sprintProgressPct = totalSprints == 0 ? 0 : round(completedSprints / totalSprints * 100)
```

## Fora de escopo
- Nenhuma mudança em chamados, MVP ou métricas gerenciais.
- Sem migrations — cálculo 100% no client, reaproveitando dados já consultados.
