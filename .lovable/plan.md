# Refatoração do módulo Projetos — Helpdesk + Agile

Transformar o módulo atual (mock estático) num sistema completo de gestão ágil que **usa chamados reais como unidade de execução**, com Sprints, Backlog, capacidade por pontos e dashboards de progresso.

---

## 1. Modelo de dados (migration)

### Alterações em `tickets`
Adicionar 3 colunas (nullable, sem quebrar nada existente):
- `project_id uuid` — projeto vinculado
- `sprint_id uuid` — sprint vinculada
- `story_points integer` — pontos atribuídos pelo admin (default = score da categoria do chamado, fallback 1)

Index em `(project_id, sprint_id)` para queries rápidas.

### Reaproveitar `projects` (já existe) e estender
Adicionar:
- `code text` — sigla curta (ex: "INFRA-2026")
- `goal text` — objetivo do projeto
- `total_points_target integer default 0` — meta total
- Manter `status`, `start_date`, `end_date`, `owner_id`

### Nova tabela `sprints`
```
id uuid pk
project_id uuid not null
organization_id uuid
name text                 -- "Sprint 1", "Sprint Out/26"
goal text
status text default 'planejada'  -- planejada | ativa | concluida | cancelada
start_date date
end_date date
capacity_points integer default 0  -- limite de pontos da sprint
created_by uuid
created_at, updated_at
```

### Nova tabela `project_tasks` (tarefas manuais — opcional, prioridade secundária)
```
id, project_id, sprint_id (nullable), title, description,
status (todo|doing|done), story_points, assignee_id, created_by, timestamps
```

### Constraint / regra (via trigger)
- Não permitir vincular um chamado a uma sprint que não pertence ao mesmo `project_id` do ticket
- Bloquear vinculação se a soma de `story_points` da sprint exceder `capacity_points` (com flag `force` opcional pelo admin via UPDATE direto — manteremos validação só no client por simplicidade, sinalizando o exceso)

### RLS
- `sprints` e `project_tasks`: SELECT por organização (`is_same_organization`); INSERT/UPDATE/DELETE só `admin` ou `super_admin`.
- Atualizações em `tickets` para vinculação reaproveitam policy existente (admin já pode atualizar).

---

## 2. UI/UX — nova estrutura da página `/projetos`

### Lista de projetos (nova `Projetos.tsx`)
Substituir mock por dados reais. Cards com:
- nome, código, status, owner, datas
- progresso: `pontos concluídos / pontos totais` (barra)
- nº de sprints ativas, nº de chamados vinculados
- Botão **"Novo projeto"** (modal)

### Detalhe do projeto `/projetos/:id` (nova rota)
Layout com tabs:

**Tab 1 — Visão geral**
- Cards: total de pontos, pontos concluídos, % vindo de chamados vs tarefas, chamados planejados vs concluídos
- Mini-timeline de sprints

**Tab 2 — Sprints**
- Lista de sprints com badge de status, capacidade usada (`72/100 pts`)
- Botão **"Nova sprint"** (modal: nome, datas, capacidade, objetivo)
- Cada sprint expansível mostrando seus chamados + tarefas, com botão **"Ativar"** / **"Concluir"**
- Kanban opcional dentro da sprint (reaproveitar `KanbanBoard` existente filtrado por `sprint_id`)

**Tab 3 — Backlog**
- Lista priorizada de chamados + tarefas vinculadas ao projeto **sem sprint**
- Drag-to-sprint (ou botão "Mover para sprint X")
- Botão **"+ Adicionar chamados"** → abre modal (ver abaixo)
- Botão **"+ Nova tarefa"** (manual)

**Tab 4 — Dashboard**
- Gráfico de burndown (pontos restantes por dia da sprint ativa)
- Origem dos pontos (pizza chamados vs tarefas)
- Eficiência: % de chamados planejados que foram concluídos no prazo da sprint
- Throughput por técnico no projeto

### Modal "Adicionar Chamados" (componente novo `AddTicketsToSprintModal`)
- Lista chamados da org com filtros:
  - status (default: Aberto, Em Andamento, Disponível)
  - prioridade, técnico, categoria, busca por título/id
  - já mostra apenas chamados **sem `project_id`** (não vinculados)
- Multi-select com checkbox
- Seletor de sprint destino (sprints do projeto + opção "Apenas backlog")
- Mostra preview: "X chamados, Y pontos serão adicionados. Capacidade da sprint: Z/W"
- Avisa em vermelho se exceder capacidade (admin pode forçar)
- Botão "Vincular"

### Modal "Editar pontos do chamado"
Quando admin abre um chamado dentro do projeto, pode ajustar `story_points` (default = score da categoria).

---

## 3. Hooks novos (`src/hooks/`)

- `useProjects()` — lista projetos da org com agregados (pontos, sprints, chamados)
- `useProject(id)` — detalhe + cache compartilhado
- `useCreateProject()`, `useUpdateProject()`, `useDeleteProject()`
- `useSprints(projectId)` + create/update/delete + `useActivateSprint`
- `useProjectBacklog(projectId)` — chamados+tarefas com `project_id` e sem sprint
- `useSprintItems(sprintId)` — chamados+tarefas da sprint
- `useAvailableTickets(projectId)` — chamados não vinculados a nenhum projeto da org
- `useLinkTicketsToProject(projectId, sprintId?)` — bulk update em `tickets`
- `useUnlinkTicket(ticketId)` — limpa `project_id` e `sprint_id`
- `useProjectMetrics(projectId)` — burndown, origem dos pontos, eficiência
- `useProjectTasks(projectId)` + CRUD

Realtime: subscrever `tickets`, `sprints`, `project_tasks` com invalidação seletiva (já temos pattern em `useTickets`).

---

## 4. Integração com chamados existentes

### `Chamados.tsx` / `TicketDetailModal.tsx`
- Mostrar badge "📁 Projeto X · Sprint Y" se vinculado
- Admin: botão "Remover do projeto" no modal de detalhe

### `useTickets.ts`
- Retornar `project_id`, `sprint_id`, `story_points` no objeto `Ticket`
- Adicionar filtro opcional `excludeLinkedToProjects`

### Pontuação automática
Ao fechar um chamado vinculado (status → "Aguardando Aprovação"/"Aprovado"/"Fechado"):
- Não precisa de trigger no DB; o cálculo de "pontos concluídos da sprint" é **derivado em runtime** via query `SUM(story_points) WHERE sprint_id=X AND status IN (...)`. Assim não há divergência.
- `useProjectMetrics` faz esse SUM e atualiza dashboard via realtime.

### Score da categoria como sugestão de story_points
Ao vincular chamado, default `story_points = categories.score || 1`. Admin pode editar.

---

## 5. Governança e regras

| Ação | Admin | Técnico | Solicitante |
|---|---|---|---|
| Ver projetos da org | ✅ | ❌ (futuro) | ❌ |
| Criar/editar projeto e sprint | ✅ | ❌ | ❌ |
| Vincular/desvincular chamados | ✅ | ❌ | ❌ |
| Definir capacidade / story points | ✅ | ❌ | ❌ |
| Trabalhar no chamado (executar) | ✅ | ✅ | — |
| Ver burndown da sprint onde tem chamado atribuído | ✅ | ✅ (read-only futuro) | ❌ |

Restrições no client + RLS no DB:
- Chamado **fechado** não pode ser vinculado (validação no modal — opcional, controlada por toggle "permitir vincular fechados" para fins históricos)
- Um chamado em **uma única sprint** garantido pela coluna única `sprint_id`
- Remover chamado da sprint = `UPDATE sprint_id = null` (continua no projeto)
- Remover do projeto = ambos campos a null

---

## 6. Estrutura de arquivos

**Criar:**
- `supabase/migrations/<timestamp>_projects_sprints.sql`
- `src/hooks/useProjects.ts`
- `src/hooks/useSprints.ts`
- `src/hooks/useProjectTasks.ts`
- `src/hooks/useProjectMetrics.ts`
- `src/pages/Projetos.tsx` (substitui o mock)
- `src/pages/ProjetoDetalhe.tsx`
- `src/components/projetos/ProjectCard.tsx`
- `src/components/projetos/NewProjectModal.tsx`
- `src/components/projetos/SprintCard.tsx`
- `src/components/projetos/NewSprintModal.tsx`
- `src/components/projetos/BacklogList.tsx`
- `src/components/projetos/AddTicketsToSprintModal.tsx`
- `src/components/projetos/ProjectDashboard.tsx` (burndown + cards)
- `src/components/projetos/TaskItem.tsx`

**Editar:**
- `src/App.tsx` — nova rota `/projetos/:id`
- `src/hooks/useTickets.ts` — incluir novos campos
- `src/components/TicketDetailModal.tsx` — badge de projeto/sprint + ações admin
- `src/integrations/supabase/types.ts` — atualizado automaticamente após migration

**Remover:**
- `src/data/mockData.ts` (`mockProjects`) — após migrar

---

## 7. Fluxo end-to-end (validação)

```text
1. Solicitante abre chamado normal           → status=Aberto, project_id=null
2. Admin entra em /projetos/:id, aba Backlog → clica "Adicionar chamados"
3. Modal lista chamados livres da org        → admin seleciona 5, escolhe Sprint 2
4. Sistema: UPDATE tickets SET project_id=P, sprint_id=S2 WHERE id IN (...)
5. Realtime invalida queries → backlog/sprint atualizam
6. Técnico assume e trabalha (interface de chamados padrão)
7. Técnico fecha → ticket vai para "Aguardando Aprovação"
8. useProjectMetrics recalcula: pontos concluídos da sprint sobem
9. Burndown e dashboard refletem em tempo real
```

---

## 8. O que NÃO está no escopo desta entrega

- Drag-and-drop visual no kanban da sprint (usaremos botões "Mover para Sprint X" — DnD pode vir depois)
- Notificações por WhatsApp ao vincular chamado a sprint
- Velocity histórica multi-sprint (gráfico) — começamos com burndown da ativa
- Permissão de leitura para técnicos verem o projeto (entregaremos só admin nesta fase, conforme regra de governança)

---

## Pergunta antes de implementar

**Story points:** quando um chamado é vinculado, devo usar como pontos default (a) o `score` da categoria do chamado, (b) sempre 1, ou (c) deixar o admin sempre escolher manualmente? Recomendo **(a) com possibilidade de edição** para integrar com sua pontuação existente. Confirma?

Aprova o plano para eu implementar?
