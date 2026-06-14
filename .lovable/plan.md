## Objetivo

Diferenciar metas entre **Técnicos** (Felipe, Izabele — foco em chamados) e **Desenvolvedores** (Danilo, Victor — meta menor de chamados e maior em projetos), adicionando a KPI de **Projetos** que hoje não existe e criando **presets rápidos por papel**.

## 1. Nova KPI: Tarefas de Projeto Entregues

Adicionar métrica `project_tasks_done` em `GoalsManager.tsx` (METRICS), `MyGoalCard.tsx` e `GoalsSummaryCards.tsx` (METRIC_CONFIG).

- **Label:** "Projetos Entregues" / short "Projetos"
- **Unit:** "" (contagem), step 1, ícone `Briefcase` ou `Rocket` (lucide).
- **Fonte de dados:** tabela `project_tasks` — contar tarefas onde `assigned_to = user.id` E `status = 'done'` (ou equivalente concluído) E `updated_at` dentro do mês de referência.
  - Validar o nome exato do status final consultando `project_tasks` antes de implementar (provavelmente `"Concluído"` / `"done"`).
- Atualizar `MyGoalCard.tsx` (query `my-goal-stats`) e o cálculo agregado em `MetasTecnicos.tsx` (que monta `stats` para `GoalsSummaryCards`) para incluir `projectTasksDone`.

Nenhuma mudança de schema — `performance_goals.metric` é texto livre.

## 2. Presets por Papel (UX para aplicar a sugestão)

No modal **"Definir Metas"** (`GoalsManager.tsx`), adicionar uma linha de **botões de preset** acima da grade de KPIs, ativos apenas quando `target_type === "individual"` e um técnico está selecionado:

- **Preset "Técnico (foco chamados)"** — preenche valores sugeridos:
  - tickets_closed: **40**
  - avg_score: **4.5**
  - avg_resolution_hours: **8**
  - rework_percent: **5**
  - points: **80**
  - preventivas_done: **5**
  - project_tasks_done: *(vazio)*
- **Preset "Desenvolvedor (foco projetos)"** — preenche:
  - tickets_closed: **15** (menor)
  - project_tasks_done: **8** (maior)
  - avg_score: **4.5**
  - avg_resolution_hours: **8**
  - rework_percent: **5**
  - points: **30**
  - preventivas_done: *(vazio)*
- **Preset "Limpar"** — zera todos os campos.

Os valores são *defaults editáveis*: o usuário pode ajustar antes de salvar. Isso resolve diretamente a sugestão (Felipe/Izabele recebem o preset Técnico; Danilo/Victor recebem o preset Desenvolvedor).

> Os números acima são **chutes iniciais razoáveis** — pode confirmar/ajustar antes de implementar.

## 3. Detecção opcional do papel

Para destacar o preset recomendado, ler o papel do técnico selecionado em `user_organization_roles` (já buscado para popular o select). Se `role === "desenvolvedor"`, marcar visualmente o preset "Desenvolvedor" como recomendado; se `tecnico`, o preset "Técnico". Sem bloquear a escolha.

## Arquivos afetados

- `src/components/metas/GoalsManager.tsx` — nova métrica `project_tasks_done`, presets, leitura de `role` no select de técnicos.
- `src/components/metas/MyGoalCard.tsx` — METRIC_CONFIG + query de `projectTasksDone`.
- `src/components/metas/GoalsSummaryCards.tsx` — METRIC_CONFIG + `getActualValue`.
- `src/pages/MetasTecnicos.tsx` — agregar `projectTasksDone` por técnico no `stats` passado ao Summary.

## Perguntas antes de implementar

1. Os **valores dos presets** acima fazem sentido, ou prefere ajustar (ex.: quantos chamados/mês são realistas para Felipe e Izabele hoje)?
2. "Projetos Entregues" deve contar **tarefas concluídas** (`project_tasks` com status final) ou **projetos/sprints finalizados**? Tarefas é o mais granular e mensal — recomendado.
