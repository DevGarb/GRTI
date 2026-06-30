## Bug

Datas "date-only" (`YYYY-MM-DD` vindas do Postgres como `date`) estão sendo formatadas via `new Date("2026-07-02").toLocaleDateString("pt-BR")`. O JS parseia a string ISO como **UTC 00:00**, e o navegador em BRT (UTC-3) renderiza como 21:00 do dia anterior → exibe **01/07** em vez de **02/07**. Já corrigido pontualmente nas preventivas com `parseISO`, mas a regressão está espalhada por todo o sistema.

## Solução

Criar um helper único e substituir todas as ocorrências para garantir consistência.

### 1) Novo arquivo `src/lib/dateFormat.ts`

Helpers tolerantes a `string | Date | null`:

- `formatDateBR(v)` → `dd/MM/yyyy`
- `formatDateShortBR(v)` → `dd/MM`
- `formatDateTimeBR(v)` → `dd/MM/yyyy HH:mm`
- `formatDateTimeFullBR(v)` → `dd/MM/yyyy HH:mm:ss`

Regra interna: se a string casar com `^\d{4}-\d{2}-\d{2}$`, parsear como data **local** (`new Date(y, m-1, d)`); caso contrário usar `new Date(v)` normalmente (timestamps com timezone permanecem corretos).

### 2) Substituir nos componentes

Trocar `new Date(x).toLocaleDateString("pt-BR")` e `format(new Date(x), "dd/MM/yyyy"...)` pelos novos helpers nestes arquivos (campos `date`/planned_date/start_date/end_date/due_date/reference_date/last_date e também `created_at`/`completed_at` por padronização):

- `src/components/TicketDetailModal.tsx`
- `src/components/projetos/ProjectCard.tsx`
- `src/components/projetos/ProjectOverview.tsx`
- `src/components/projetos/SprintCard.tsx`
- `src/components/projetos/TaskDetailModal.tsx`
- `src/components/preventivas/OverdueAlerts.tsx`
- `src/components/preventivas/PatrimonioTab.tsx`
- `src/components/preventivas/EquipmentTable.tsx`
- `src/components/todos/TodoRow.tsx`
- `src/components/todos/TodoDetailModal.tsx`
- `src/components/operacional/OpNotesPanel.tsx`
- `src/components/ticket-detail/TicketComments.tsx`
- `src/components/ticket-detail/TicketHistory.tsx`
- `src/components/superadmin/ApiTokensTab.tsx`
- `src/components/metas/PreventivasMonthlyTarget.tsx`
- `src/pages/projetos/ProjetosBacklog.tsx`
- `src/pages/projetos/ProjetosCalendario.tsx`
- `src/pages/projetos/ProjetosSprints.tsx`
- `src/pages/projetos/ProjetosPenalidades.tsx`
- `src/pages/Preventivas.tsx`
- `src/pages/chamados/ChamadosCalendario.tsx`
- `src/pages/Chamados.tsx`, `Avaliacoes.tsx`, `Historico.tsx`, `Auditoria.tsx`, `Usuarios.tsx`, `Todos.tsx`, `Patrimonio.tsx`, `OpEntregas.tsx`, `OpOficina.tsx`, `ProjetoDetalhe.tsx`, `SuperAdmin.tsx`, `WebhookLogs.tsx`, `MetricasGerenciais.tsx`, `AssetPublicView.tsx`, `dashboard/DashboardPadrao.tsx`
- `src/components/KanbanBoard.tsx`

### 3) Calendários (mês/grid)

Em `ProjetosCalendario.tsx` e `chamados/ChamadosCalendario.tsx`, o agrupamento por dia já usa `format(day,'yyyy-MM-dd')` + `parseISO` (correto). Apenas garantir que toda exibição de `start_date`/`end_date`/`planned_date` passe pelos helpers.

### 4) Sem mudanças no backend

O bug é 100% de renderização no frontend. Datas continuam armazenadas como `date`/`timestamptz` normalmente.

### Validação

- Criar um chamado/projeto/sprint/preventiva com data 02/07 e confirmar que aparece **02/07** em: card de projeto, card de sprint, backlog, calendário de projetos, calendário de chamados, modal de detalhe do chamado, lista de preventivas, alertas de atraso, penalidades, todos.
