## Visão geral

Reformulação completa da aba **Projetos** em uma entrega única (big bang), transformando-a numa central de gestão com 6 áreas: Dashboard, Projetos, Backlog, Sprints, Calendário e MVP.

Modelo de dados unificado em `project_tasks` (backlog absorve tarefas e mantém compatibilidade com chamados vinculados). Retrabalho é detectado automaticamente por reabertura após conclusão. Premiação tem histórico mensal com fluxo de aprovação pelo admin.

## 1. Mudanças de banco (migration única)

**`projects`** — novas colunas:
- `co_owner_id uuid` (corresponsável)
- `priority text default 'Média'`
- `planned_end_date date` (data prevista — `end_date` vira "data real")
- `progress_percent int default 0` (calculado por trigger ao mudar tasks)

**`project_tasks`** — campos novos:
- `co_assignee_id uuid`
- `priority text default 'Média'`
- `planned_date date`, `delivered_date date`
- `status` aceita: `Pendente`, `Em Desenvolvimento`, `Em Homologação`, `Concluído`, `Retrabalho` (mapeamento dos antigos `todo/doing/done` em migration)
- `rework_count int default 0`
- `reopened_at timestamptz`

**`sprints`** — novas colunas:
- `owner_id uuid`
- `quality_checklist jsonb` (5 itens, peso 20% cada: documentação, evidências, homologação, backlog atualizado, padrões técnicos)
- `quality_score numeric` (gravado no fechamento)

**Tabelas novas:**

```text
sprint_quality_checks   -- 1:1 com sprint quando fechada
  sprint_id, doc_ok, evidence_ok, homolog_ok,
  backlog_ok, standards_ok, checked_by, checked_at

task_status_history     -- alimenta detecção de retrabalho
  task_id, old_status, new_status, changed_by, changed_at

delivery_reschedules    -- justificativas de mudança de data no calendário
  task_id, old_date, new_date, reason, user_id, created_at

mvp_awards              -- premiação mensal com aprovação
  user_id, organization_id, year, month,
  on_time_rate, quality_rate, rework_rate, final_score,
  award_level ('none'|'prata'|'ouro'), amount_brl,
  status ('pendente'|'aprovado'|'rejeitado'),
  approved_by, approved_at, notes
  UNIQUE (user_id, organization_id, year, month)
```

Todas com `GRANT` adequados + RLS por organização (membros leem da org; admin aprova).

**Triggers:**
- `task_status_change_log` em `project_tasks`: registra histórico e, se `old_status='Concluído'` e `new_status` ativo, faz `rework_count = rework_count + 1`, marca `reopened_at`, e seta status para `Retrabalho`.
- `project_progress_recalc`: recalcula `projects.progress_percent` ao alterar tasks.

**Funções SQL (SECURITY DEFINER):**
- `get_projects_dashboard(_org, _from, _to)` → cards (ativos, concluídos, atrasados, sprints em andamento, backlog pendente, entregas/retrabalhos do mês, eficiência operacional, qualidade técnica, eficiência MVP final).
- `get_mvp_metrics(_org, _year, _month)` → linha por colaborador com `entregas`, `entregas_no_prazo`, `retrabalhos`, `qualidade_tecnica`, `eficiencia_operacional`, `eficiencia_final`, `nivel_premiacao`, `valor_brl`.
- `close_sprint_with_checklist(_sprint_id, _checks jsonb)` → valida checklist completo, grava `quality_score`, fecha sprint.
- `compute_mvp_awards(_org, _year, _month)` → upsert em `mvp_awards` em status `pendente`.
- `approve_mvp_award(_id, _approve bool, _notes)` → apenas admin.

## 2. Estrutura de rotas/UI

Nova rota principal `/projetos` com sub-navegação (sidebar interna ou tabs com NavLink):

```text
/projetos                       -> Dashboard executivo
/projetos/lista                 -> Projetos (Lista | Kanban | Timeline)
/projetos/:id                   -> Detalhe (mantém com melhorias)
/projetos/backlog               -> Backlog global
/projetos/sprints               -> Sprints (todas as orgs do usuário)
/projetos/calendario            -> Calendário de entregas
/projetos/mvp                   -> Dashboard MVP + premiação
```

## 3. Telas

**Dashboard (`/projetos`)**
- 10 cards de KPI (grid responsivo).
- Gráficos (recharts): entregas por mês (barra), retrabalho por colaborador (barra horizontal), eficiência/qualidade por colaborador (radar ou barras lado a lado), evolução mensal dos 4 indicadores (linha), projetos por status (donut).
- Seletor de período (mês atual / últimos 3 meses / personalizado).

**Projetos (`/projetos/lista`)**
- Toggle de visualização: **Lista** (tabela densa com colunas pedidas), **Kanban** (por status), **Timeline** (Gantt simples por mês usando barras posicionadas por start/end).
- Filtros no topo: responsável, projeto, sprint, prioridade, status, período.
- Card/linha mostra % concluído, indicador de retrabalho (badge) e qualidade (badge da última sprint).

**Backlog (`/projetos/backlog`)**
- Lista única com filtros e busca instantânea (debounce).
- Drag-and-drop com `@dnd-kit/core` (já em uso comum); edição inline de prioridade, status, story points, datas, responsável.
- Agrupamento opcional por projeto ou prioridade.

**Sprints (`/projetos/sprints`)**
- Lista de sprints com cards mostrando: período, responsável, qtd tarefas, concluídas, atrasadas, retrabalhos, taxa conclusão, taxa retrabalho, eficiência.
- Detalhe da sprint: **Burndown chart** (recharts area), **velocidade** (story points/dia), **timeline** de eventos.
- Botão **Fechar sprint** abre modal com checklist obrigatório de 5 itens (bloqueado se faltar item) → chama `close_sprint_with_checklist`.

**Calendário (`/projetos/calendario`)**
- Grid mensal próprio (component novo `DeliveryCalendar`) com células por dia.
- Entregas renderizadas como chips coloridos: verde (entregue), azul (planejada), amarelo (em andamento), vermelho (atrasada — `planned_date < hoje` e não concluída).
- Drag-and-drop entre dias → abre modal de **justificativa de alteração** (obrigatória), grava em `delivery_reschedules` e atualiza `planned_date`.
- Filtros: colaborador, projeto, sprint, status.
- Click em entrega → drawer lateral com detalhes/edição rápida.

**Dashboard MVP (`/projetos/mvp`)**
- Seletor ano/mês.
- Tabela por colaborador: entregas, no prazo %, qualidade %, retrabalho %, **eficiência final %**, nível (Prata/Ouro/—), valor (R$ 300/500/0), status (pendente/aprovado/rejeitado).
- Botões admin: **Recalcular mês**, **Aprovar**, **Rejeitar** (com nota).
- Cards de totais: total a pagar, ouros, pratas.
- Histórico: navegação por mês mantém registros aprovados.

## 4. Hooks

- `useProjectsDashboard(period)` → RPC `get_projects_dashboard`.
- `useMvpMetrics(year, month)` → RPC `get_mvp_metrics`.
- `useBacklog(filters)` → query unificada em `project_tasks` cross-projetos.
- `useDeliveryCalendar(month, filters)` → tasks com `planned_date` no mês.
- `useRescheduleTask()` → update + insert em `delivery_reschedules`.
- `useCloseSprint()` → RPC `close_sprint_with_checklist`.
- `useMvpAwards()` / `useApproveAward()` → leitura/aprovação.

## 5. UX/UI

- Layout inspirado em Linear/ClickUp: sub-sidebar à esquerda dentro de `/projetos` com ícones + labels, mantendo o sidebar global.
- Densidade ajustável (compacto/confortável) na Lista e Backlog.
- Indicadores visuais: badges com cores semânticas via tokens (`bg-emerald-500/15`, etc — já no padrão do projeto), barra de progresso fina nos cards de projeto.
- Atalhos de teclado básicos: `n` (novo), `/` (busca), `1/2/3` (alternar visualização da lista).
- Toda interação deve usar componentes shadcn existentes; novos componentes ficam em `src/components/projetos/`.

## 6. Compatibilidade

- Tarefas antigas com status `todo/doing/done` migradas para `Pendente/Em Desenvolvimento/Concluído`.
- Tickets vinculados ao projeto continuam visíveis no Backlog e Sprint (sem mudar modelo de tickets) — apenas renderizados em lista paralela com badge "Chamado".
- Retrabalho do MVP considera tanto reaberturas de `project_tasks` quanto a ação `rework` já existente em `tickets` (consultando `ticket_history`).
- Indicadores de eficiência operacional usam: entregas totais = tasks concluídas + tickets fechados no período; retrabalhos = reaberturas + `ticket_history.action='rework'`.

## 7. Entregáveis

1. Migration única com schema, triggers, funções RPC, RLS, GRANTs.
2. Hooks novos e revisão dos existentes (`useProjects`, `useProjectTasks`, `useSprints`) para os campos novos.
3. 6 telas novas + sub-layout `ProjetosLayout`.
4. Componentes: `KpiCard`, `DeliveryCalendar`, `BurndownChart`, `SprintCloseChecklistModal`, `RescheduleDialog`, `MvpAwardsTable`, `ProjectsTimeline`, `BacklogList`.
5. Roteamento atualizado em `App.tsx` + entrada no menu.
6. Sem alterações em outras áreas do sistema fora de `src/pages/projetos/`, `src/components/projetos/`, hooks de projeto, App.tsx e migration.

## 8. Fora de escopo

- Notificações push de mudanças de prazo (pode entrar depois).
- Integração com WhatsApp para premiação.
- Pagamento automatizado da premiação (somente registro + aprovação).
