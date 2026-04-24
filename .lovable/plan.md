# Sprint Management — Plano Completo (UX + Inteligência + Robustez)

Três camadas: **UX rápida** no front, **planejamento inteligente** com simulação local, e **regras invioláveis + auditoria** no backend.

---

## Parte A — UX (resolve o problema atual)

- **Destino padrão inteligente**: ao abrir "Adicionar chamados", default = sprint `ativa` > sprint `planejada` mais antiga > backlog.
- **Botão "+ Adicionar chamados"** no card da sprint ativa e no bloco "Sprint ativa" da Visão geral.
- **Renomear**: aba "Backlog" → "Não planejados"; opção do select → "Deixar para depois (sem sprint)".
- **Modal enxuto**: chips de prioridade, coluna "Pontos" oculta por padrão (toggle "Editar pontos"), aviso amarelo ao escolher "sem sprint" havendo sprint ativa.

---

## Parte B — Planejamento inteligente

### B1. Painel de impacto em tempo real
Rodapé fixo do modal:
```text
Selecionados: 8 · 24 pts
Sprint "Sprint 3":  Atual 12/30 → Após 36/30 (+24)  ⚠ excede em 6
Por prioridade:  2 Crítica · 3 Alta · 3 Média
Por técnico:     João 16/8 ⚠  Maria 8/12 ✓  Sem atribuição 1
```
Barra de progresso com 3 cores: verde (atual) + azul (delta) + vermelho (excedente).

### B2. Ordenação por urgência
```text
score = (prioridade × 10) + bônus_sla
prioridade: Crítica=4, Alta=3, Média=2, Baixa=1
bônus_sla: vencido +20 · <2h +15 · <24h +8 · <72h +3
```
Vencidos com faixa vermelha à esquerda; perto de vencer, amarela. Toggle "Urgência | Mais antigos | Prioridade".

### B3. Sugestão inteligente — "Sugerir para a sprint"
Knapsack greedy considerando:
1. Capacidade restante da sprint.
2. **Capacidade por técnico** (ver C5).
3. Limite de chamados Críticos por sprint.
4. Ordem por `score_urgência`.

Pré-marca checkboxes com badge "Sugerido". Usuário pode ajustar antes de confirmar.

### B4. Modo Planejamento (simulação)
Nova aba `Planejamento` no card da sprint. Estado local com diff:
```text
+ 4 chamados · +12 pts  |  − 1 chamado · −3 pts  |  Saldo: +9 pts
```
Botões **Confirmar plano** (persiste em batch) ou **Descartar**.

---

## Parte C — Robustez backend (esta camada nova)

### C1. Validações no banco (regras invioláveis)

Trigger `enforce_sprint_capacity` em INSERT/UPDATE de `tickets` e `project_tasks` quando `sprint_id` mudar:

```sql
-- pseudocódigo da trigger
1. se sprint.status = 'fechada' → RAISE 'Sprint fechada não aceita alterações'
2. se sprint.status = 'cancelada' → RAISE 'Sprint cancelada'
3. carrega project.enforce_capacity, max_critical_per_sprint
4. soma_atual = SUM(story_points) de tickets+tasks na sprint
5. se project.enforce_capacity AND soma_atual + NEW.story_points > sprint.capacity_points
   → RAISE 'Capacidade da sprint excedida (X/Y pts)'
6. se ticket.priority = 'Crítica':
   conta_criticos = COUNT(*) de tickets críticos na sprint
   se conta_criticos >= project.max_critical_per_sprint
   → RAISE 'Limite de chamados críticos atingido'
7. valida capacidade do técnico (ver C5)
```

**Soft cap (default)**: front mostra aviso, backend permite.
**Hard cap**: `project.enforce_capacity = true` → trigger bloqueia.

### C2. Status "fechada" + ciclo de vida
Status atual: `planejada → ativa → concluida`. Adicionar **`fechada`**:
- `concluida` = sprint terminou, pode reabrir/ajustar.
- `fechada` = **escopo trancado**, nada entra, nada sai, nada muda de pontos. Snapshot dos KPIs é registrado.
- Transições válidas (validadas por trigger):
```text
planejada ↔ ativa
ativa     → concluida
concluida → fechada (irreversível) | ativa (reabrir)
qualquer  → cancelada
```
Botão "Fechar sprint" exige confirmação dupla com aviso de irreversibilidade.

### C3. Histórico de planejamento — `sprint_planning_history`
Nova tabela:
```sql
create table sprint_planning_history (
  id uuid primary key default gen_random_uuid(),
  sprint_id uuid not null references sprints(id) on delete cascade,
  project_id uuid not null,
  organization_id uuid,
  user_id uuid not null,
  action text not null,  -- ticket_added, ticket_removed, points_changed,
                          -- capacity_changed, status_changed, plan_committed
  entity_type text,       -- ticket | task | sprint
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  context text,           -- 'modal' | 'planning_panel' | 'auto_suggestion'
  created_at timestamptz not null default now()
);
```
Triggers automáticos:
- `log_ticket_sprint_changes` em UPDATE de `tickets` quando `sprint_id` ou `story_points` mudarem dentro de um projeto.
- `log_task_sprint_changes` equivalente em `project_tasks`.
- `log_sprint_changes` em UPDATE de `sprints` (status, capacity_points).

Aba **"Histórico"** dentro do card da sprint mostra timeline.

### C4. Snapshot de eficiência — `sprint_metrics`
Quando sprint vai para `concluida` ou `fechada`, trigger grava snapshot:
```sql
create table sprint_metrics (
  sprint_id uuid primary key references sprints(id) on delete cascade,
  project_id uuid not null,
  organization_id uuid,
  -- snapshot no momento da ativação
  planned_points int not null default 0,
  planned_tickets int not null default 0,
  planned_tasks int not null default 0,
  -- snapshot no fechamento
  delivered_points int not null default 0,
  delivered_tickets int not null default 0,
  delivered_tasks int not null default 0,
  -- mudanças durante a execução
  scope_added_points int not null default 0,
  scope_removed_points int not null default 0,
  -- KPIs
  efficiency_pct numeric,        -- delivered / planned * 100
  scope_change_pct numeric,      -- (added + removed) / planned * 100
  predictability_pct numeric,    -- delivered / capacity * 100
  closed_at timestamptz,
  created_at timestamptz default now()
);
```
- `planned_*` é gravado no momento `planejada → ativa`.
- `delivered_*`, `scope_*` e KPIs são calculados em `→ concluida` ou `→ fechada`.

**Painel "Eficiência" no Dashboard do projeto**:
- Velocidade média (média de `delivered_points` últimas 5 sprints).
- Previsibilidade (média de `predictability_pct`).
- Estabilidade de escopo (média de `scope_change_pct` — quanto menor, melhor).
- Gráfico barra: Planejado vs Entregue por sprint.

### C5. Capacidade por técnico
Nova tabela:
```sql
create table technician_capacity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid,             -- null = padrão para todos os projetos da org
  organization_id uuid not null,
  points_per_sprint int not null default 8,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, project_id)
);
```
- Aba "Capacidade da equipe" no projeto: lista técnicos da org com input de pontos/sprint.
- Algoritmo de sugestão (B3) respeita: para cada técnico, soma dos `story_points` na sprint ≤ `points_per_sprint`.
- Trigger `enforce_sprint_capacity` (C1) também valida — em modo hard cap, bloqueia atribuir mais que a capacidade do técnico.
- Painel de impacto (B1) mostra carga por técnico com cores: verde ≤80%, amarelo 80-100%, vermelho >100%.

---

## Detalhes técnicos

### Migrations
Uma migration única com tudo:
1. `alter table projects add column enforce_capacity boolean default false, max_critical_per_sprint int default 5`.
2. `alter table sprints` — atualizar check de status para incluir `fechada`.
3. `create table sprint_planning_history` + RLS (admin/auditor view, admin insert via trigger).
4. `create table sprint_metrics` + RLS (org members view, system insert via trigger).
5. `create table technician_capacity` + RLS (admin manage, org view).
6. Funções:
   - `enforce_sprint_capacity()` — validação no INSERT/UPDATE de tickets/tasks.
   - `enforce_sprint_status_transition()` — valida transições.
   - `log_sprint_planning_change()` — grava em history.
   - `snapshot_sprint_metrics()` — grava planejado/entregue.
7. Triggers para amarrar tudo nas tabelas certas.

### Frontend
- `src/lib/sprintPlanning.ts` *(novo)* — `urgencyScore`, `sortByUrgency`, `suggestForSprint`, `simulateImpact`.
- `src/hooks/useSprintHistory.ts` *(novo)*.
- `src/hooks/useSprintMetrics.ts` *(novo)*.
- `src/hooks/useTechnicianCapacity.ts` *(novo)*.
- `src/components/projetos/AddTicketsToSprintModal.tsx` — destino inteligente, chips, ordenação, sugestão, painel impacto, tratamento de erros do trigger.
- `src/components/projetos/SprintCard.tsx` — botão "+ Adicionar", barra excedida, abas Planejamento + Histórico, botão "Fechar sprint".
- `src/components/projetos/SprintPlanningPanel.tsx` *(novo)*.
- `src/components/projetos/SprintImpactPanel.tsx` *(novo)*.
- `src/components/projetos/SprintHistoryTimeline.tsx` *(novo)*.
- `src/components/projetos/EfficiencyDashboard.tsx` *(novo)* — gráficos planejado vs entregue.
- `src/components/projetos/TeamCapacityTab.tsx` *(novo)*.
- `src/components/projetos/NewProjectModal.tsx` — campos de configuração (`enforce_capacity`, limites).
- `src/pages/ProjetoDetalhe.tsx` — bloco "Sprint ativa", aba "Capacidade da equipe", aba "Eficiência".

### Tratamento de erros
Mutações capturam `error.message` dos RAISE do banco e mostram toast claro:
> "Capacidade excedida: 36/30 pts. Aumente a capacidade ou remova chamados."
> "João já está com 12/8 pts. Atribua a outro técnico."
> "Sprint fechada — escopo bloqueado."

---

## Resultado final

Modelo completo de execução:

1. **Planejar** — sugestão respeita capacidade da sprint e dos técnicos, simulação antes de confirmar.
2. **Executar** — sprint ativa com escopo controlado, alterações registradas em histórico.
3. **Fechar** — snapshot automático de planejado vs entregue, escopo trancado.
4. **Medir** — dashboard de eficiência, velocidade, previsibilidade, estabilidade de escopo.
5. **Auditar** — timeline completa de quem mudou o quê, quando e em qual contexto.

Regras críticas (capacidade, limites, status) ficam **no banco** — impossível burlar via API direta, edge function ou app mobile futuro. Front reflete e melhora UX, mas não é a fonte da verdade.
