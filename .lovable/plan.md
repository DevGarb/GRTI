## Objetivo

Voltar o módulo Projetos ao essencial. Sem dashboard, sem eficiência, sem capacidade da equipe, sem painel de impacto. Apenas:

1. **Visão geral** — informações do projeto + sprint ativa.
2. **Sprints** — lista de sprints com seus chamados/tarefas.
3. **Backlog** — itens manuais (tarefas) e chamados ainda não colocados em sprint.

A pontuação continua sendo gerada pelo fechamento do chamado (no módulo de chamados), não no projeto.

---

## Tela de detalhe do projeto (`ProjetoDetalhe.tsx`)

Abas reduzidas para **3**:

```text
[ Visão geral ]  [ Sprints ]  [ Backlog ]
```

### Visão geral
- Cabeçalho do projeto (nome, status, descrição, datas).
- Bloco da **sprint ativa** (se existir): nome, meta, contagem de chamados/tarefas, % concluído (chamados fechados ÷ chamados totais da sprint). Botão "Adicionar chamados".
- Botão "Nova sprint" se não houver ativa.
- Sem meta de pontos. Sem ProjectDashboard. Sem barra de capacidade.

### Sprints
- Lista de sprints.
- Cada `SprintCard` mostra: nome, status, datas, meta, contagem de chamados, contagem de tarefas, % concluído.
- Ações: Ativar / Concluir / Reabrir / Editar / Excluir. Sem "Fechar" (lock), sem aba de Histórico.
- Botão "Adicionar chamados" abre modal já apontando para esta sprint.

### Backlog
- Renomear de volta para **"Backlog"** (mais simples que "Não planejados").
- Lista combinada de:
  - **Tarefas** criadas manualmente sem sprint.
  - **Chamados** já vinculados ao projeto mas sem sprint.
- Botões: "Nova tarefa" e "Adicionar chamados ao backlog".

---

## Modal "Adicionar chamados" (`AddTicketsToSprintModal.tsx`)

Drasticamente simplificado:

- Seleção de destino: sprint ativa (default) ou backlog.
- Busca por título/técnico/ID.
- Filtro por prioridade.
- Tabela com checkbox + título + prioridade + técnico + indicador visual de SLA (vencido / próximo).
- Ordenação automática: SLA vencido primeiro, depois prioridade.
- **Remover:** painel de impacto, sugestão automática, edição de pontos, simulação, capacidade técnica, alertas de capacidade rígida, modo de planejamento.
- Confirma e vincula. Pontos do chamado seguem o que já vier da categoria do chamado (não é editável aqui).

---

## Componentes/arquivos a remover

- `src/components/projetos/EfficiencyDashboard.tsx`
- `src/components/projetos/TeamCapacityTab.tsx`
- `src/components/projetos/SprintImpactPanel.tsx`
- `src/components/projetos/SprintHistoryTimeline.tsx`
- `src/components/projetos/ProjectDashboard.tsx`
- `src/hooks/useSprintMetrics.ts`
- `src/hooks/useTechnicianCapacity.ts`
- `src/hooks/useSprintHistory.ts`
- `src/lib/sprintPlanning.ts` (lógica de urgency/suggest/impact); manter só helper simples de ordenação por SLA dentro do próprio modal.

## Componentes a editar

- `src/pages/ProjetoDetalhe.tsx` — reduzir para 3 abas, remover bloco de "Capacidade rígida", remover meta de pontos.
- `src/components/projetos/SprintCard.tsx` — remover capacidade/pontos/Lock/aba Histórico, manter contagens simples.
- `src/components/projetos/AddTicketsToSprintModal.tsx` — versão enxuta descrita acima.
- `src/components/projetos/NewProjectModal.tsx` — remover campos `total_points_target`, `enforce_capacity`, `max_critical_per_sprint`, `enforce_technician_capacity`.
- `src/components/projetos/NewSprintModal.tsx` — remover campo `capacity_points`.
- `src/hooks/useSprints.ts` — manter `totalPoints`/`completedPoints` opcional só para o badge interno; ou remover totalmente e usar contagem de chamados.

---

## Banco de dados

Migração leve para remover o que não vai mais ser usado, sem quebrar dados existentes:

- `projects`: dropar colunas `total_points_target`, `enforce_capacity`, `max_critical_per_sprint`, `enforce_technician_capacity`.
- `sprints`: dropar `capacity_points`. Status `fechada` continua válido no enum mas não é mais usado pela UI.
- Dropar tabelas: `sprint_metrics`, `sprint_planning_history`, `technician_capacity`.
- Dropar triggers/funções relacionadas: `enforce_sprint_capacity`, captura de histórico, snapshot de métricas.

Os campos `story_points` em `tickets`/`project_tasks` permanecem (já vêm da categoria do chamado).

---

## Resultado

Tela de Projetos volta a ser direta:

```text
Projeto X
├─ Visão geral   → resumo + sprint ativa
├─ Sprints       → cada sprint com seus chamados
└─ Backlog       → tarefas manuais + chamados sem sprint
```

Sem capacidade, sem eficiência, sem dashboards. A pontuação real do técnico continua acontecendo no fechamento do chamado, como já é hoje.

Posso prosseguir com essa simplificação?