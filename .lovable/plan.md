# Abrir modal pela notificação + Métricas Gerenciais D-1

## Parte 1 — Notificação abre o modal do chamado na página atual

### Novo contexto global de modal
- Criar `src/contexts/TicketModalContext.tsx` com `openTicket(ticketId)` / `closeTicket()`.
- Provider envolve o app (em `App.tsx` dentro do `AuthProvider`).
- Quando `openTicketId` está setado, o provider busca o ticket via Supabase (`select * from tickets where id=...`) e renderiza `<TicketDetailModal>` por cima de qualquer rota.

### `NotificationBell.tsx`
- Trocar `navigate('/chamados?open=...')` por `openTicket(ticket_id)` do novo contexto.
- Mantém o `markAsRead` / `markGroupAsRead`.

### Limpeza
- Remover `setSelectedTicket` duplicado nas páginas? Não — as páginas mantêm o seu modal local (clicar numa linha de tabela continua funcionando). Apenas a notificação usa o modal global.

## Parte 2 — Métricas Gerenciais D-1

### Banco (migration)

1. Função RPC `public.get_management_metrics(_from timestamptz, _to timestamptz)` (security definer, escopada por organização via `is_member_of_org` ou super_admin) retornando uma linha por técnico/desenvolvedor:
   - `user_id`, `full_name`
   - `closed_in_period` — `tickets.closed_at` entre `_from` e `_to` com `assigned_to = user`
   - `in_progress_now` — `status = 'Em Andamento'` agora
   - `total_assigned` — todos os tickets atribuídos (acumulado)
   - `awaiting_approval` — `status = 'Aguardando Aprovação'` agora
   - `points` — soma de `evaluations.score` tipo `meta` dos chamados fechados no período
   - `rework_percent` — chamados com pelo menos 1 `ticket_history.action='rework'` ÷ `closed_in_period`
   - `avg_csat` — média de `evaluations.score` tipo `satisfaction` dos fechados no período
   - `avg_handle_minutes` (TMA) — média de `business_minutes_between(started_at, closed_at)` dos fechados no período
   - Também retornar totais agregados em uma linha "TOTAL" (ou expor função separada `get_management_totals`).

2. Tabela `public.management_report_config` (1 linha por organização):
   - `organization_id` (unique), `webhook_url`, `send_time` (TIME, default `08:00`), `is_active` (bool), `timezone` (default `America/Sao_Paulo`), `last_sent_at`.
   - RLS: admins da org podem ler/escrever; service_role acesso total.
   - GRANTs para `authenticated` (admins) e `service_role`.

### Edge function `send-management-report`
- Recebe `{ organization_id }` no body (service-role auth).
- Calcula janela D-1 em `America/Sao_Paulo` (00:00 a 23:59:59 do dia anterior).
- Chama `get_management_metrics` com a janela.
- Faz `POST` no `webhook_url` configurado com payload JSON estruturado: `{ organization_id, period: {from, to}, totals: {...}, technicians: [...] }`.
- Atualiza `last_sent_at`.

### Cron via `pg_cron` + `pg_net`
- Habilitar extensões (se ainda não).
- Job que roda a cada 5 min, lê `management_report_config` ativos onde `send_time` (no fuso configurado) bate com agora ±intervalo e `last_sent_at` não é de hoje, e dispara `net.http_post` para a edge function.
- Inserido via tool `insert` (não migration) pois contém URL/key específica do projeto.

### Frontend
- Nova rota `/metricas-gerenciais` (acesso admin/desenvolvedor), entrada no menu.
- Página `src/pages/MetricasGerenciais.tsx`:
  - Date range picker (default D-1; presets: Ontem, Hoje, Últimos 7 dias, Mês atual).
  - Cards de totais: Fechados, Em andamento, Aguardando aprovação, Total acumulado, TMA, NPS médio, % retrabalho, Pontuação total.
  - Tabela por técnico com todas as colunas acima, ordenável.
  - Botão "Exportar CSV" (UTF-8 BOM, `;`).
  - Bloco "Configuração do envio automático" (visível para admin):
    - Input `webhook_url`, time picker `send_time`, switch `is_active`.
    - Botão "Enviar agora" (chama a edge function manualmente para teste).
- Hook `src/hooks/useManagementMetrics.ts` (RPC + react-query).
- Hook `src/hooks/useManagementReportConfig.ts` (CRUD da config).
- Adicionar item no `src/config/menuItems.ts`.

## Fora de escopo
- Não alterar triggers de notificação existentes.
- Não mexer no envio por WhatsApp/UaZAPI (somente webhook genérico).
- Sem realtime na página de métricas — refresh manual / por filtro.
