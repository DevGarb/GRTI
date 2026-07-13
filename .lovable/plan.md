
## De onde vem cada indicador hoje (diagnóstico)

Fonte única: edge function `supabase/functions/tv-dashboard/index.ts`, agregando `tickets`, `evaluations`, `preventive_maintenance`, `patrimonio`, `maintenance_intervals`.

- **Q1 "Produção do Dia"** → `closed_today` = tickets com `status IN ('Fechado','Aprovado')` e `closed_at >= hoje 00:00`. Ou seja, já é "quando o técnico finaliza". Meta usada hoje é uma constante hardcoded (`DEFAULT_TARGETS.dailyClosed = 15`), não vem da tabela `performance_goals`.
- **Q2 "SLA no Prazo"** → cálculo derivado no front: `1 − (sla_alerts / (open + in_progress + awaiting))`. `sla_alerts` sai da edge function comparando `waiting_min`/`elapsed_min` contra limiares fixos por prioridade (Urgente 4h/8h, Alta 8h/16h, Média 16h/32h, Baixa 32h/80h). Não vem de meta configurada.
- **Q3 "CSAT"** → média de `evaluations.score` **dos últimos 30 dias corridos** (não do mês vigente). Filtro atual: `created_at >= now-30d`, sem filtro de `type`, o que ainda mistura `satisfaction` com `meta` — bug real (o CSAT deve ser só `type='satisfaction'`).
- **Q4 "Capacidade"** → `active_techs` = `DISTINCT assigned_to` **apenas** de tickets com status `Em Andamento` (por isso vem 0 quando ninguém está trabalhando agora). `tma_minutes` = média de minutos úteis `started_at → closed_at` de **todos** os tickets fechados de todos os tempos, sem recorte de período, por isso fica inflado.
- **OKR "Fechamentos do mês"** → bug: usa `d.kpis.closed_today` como proxy (não existe métrica mensal no payload).
- **OKR "CSAT ≥ 4.5"** → mesmo CSAT de 30d acima.
- **OKR "Preventivas do mês"** → `preventivas_month.feitas` (execuções do mês) sobre `preventivas_month.total` que é o nº de patrimônios ativos com intervalo cadastrado — não usa metas dos técnicos.
- **OKR "Backlog"** → `kpis.backlog` = todos os tickets abertos/em andamento/aguardando aprovação; teto é constante (`20`). Nada a ver com sprints.
- **Alertas Críticos** → contagem crit/warn dos `sla_alerts` acima + top categorias derivadas.

## O que muda

### 1. Edge function `tv-dashboard` — novos campos

- `closed_month`: tickets fechados no mês vigente (`closed_at` entre 1º do mês e agora).
- `csat_month`: média + count de `evaluations` com `type='satisfaction'` do **mês vigente** (filtrando por org via join).
- `tma_month_minutes`: TMA calculado só com tickets fechados **no mês** (mais fiel à realidade atual).
- `active_techs_today`: `DISTINCT assigned_to` de tickets fechados hoje ∪ em `Em Andamento` agora (não só quem está com ticket aberto no instante).
- `active_sprints_backlog`: soma de `project_tasks` com `status <> 'Concluído'` ligadas a `sprints` com `status = 'ativa'` da org (fonte para o OKR de backlog).
- `goals_summary`: RPC nova (`get_tv_goals_summary(_org, _year, _month)`) que devolve, para o mês vigente:
  - `preventivas_target_total` = soma de `performance_goals.target_value` com `metric='preventivas_done'`, `period='monthly'`, mês/ano corrente, org do dashboard.
  - `csat_target_avg` = média das metas de `avg_score` do mês.
  - `points_target_total` e `points_actual_total` (somatório da pontuação dos técnicos vs. meta) — usado no novo painel de Metas.
  - `rework_target_avg` (média de metas `rework_percent`) e `rework_actual_percent` (retrabalhos do mês / fechados do mês × 100).
  - `tma_target_avg_hours` (média de metas `avg_resolution_hours`) e `tma_actual_hours` (do mês).
  - `projects_target_total` e `projects_actual_total` (`project_tasks_done` metas vs. `project_tasks` concluídas no mês).
  - `csat_actual_avg` e `csat_actual_count` (mês vigente).

A RPC roda como `SECURITY DEFINER` para respeitar o modelo já usado por outras funções (`get_projects_dashboard`, `get_metas_tecnicos`).

### 2. Frontend `src/pages/TvDashboard.tsx`

**Quadrantes (topo)** — mesma grade 4 colunas, agora com dados corretos:

- **Q1 Produção do Dia**: usa `closed_today` (ok, já é "finalizado"). Meta diária deixa de ser constante e passa a ser calculada como `ceil(soma de metas mensais de tickets_closed / 22 dias úteis)` a partir do `goals_summary`. Fallback = 15 se não houver meta.
- **Q2 SLA no Prazo**: mantém o cálculo, mas passa a exibir no rodapé "meta X% no prazo" quando existir; sem meta cadastrada continua mostrando só o % atual (é derivado dos limiares de SLA por prioridade, não é meta configurável hoje). Adicionar tooltip curto explicando a fórmula ("(ativos − fora do SLA) / ativos").
- **Q3 CSAT do mês**: passa a usar `csat_month` (satisfaction only, mês vigente). Meta do rodapé vem de `goals_summary.csat_target_avg` (fallback 4.5). Corrige mistura com evaluations `meta`.
- **Q4 Capacidade**: usa `active_techs_today` e `tma_month_minutes`. Rodapé passa a mostrar "TMA meta: Xh" quando houver meta.

**Faixa OKRs do mês** (mesma grade de 4 cards):

- **Fechamentos do mês** → `closed_month` vs. soma de metas `tickets_closed` do mês (fallback 200).
- **CSAT do mês** → `csat_month.avg` vs. `goals_summary.csat_target_avg`.
- **Preventivas do mês** → `preventivas_month.feitas` vs. `goals_summary.preventivas_target_total` (soma de metas de todos os técnicos).
- **Backlog de sprints** → `active_sprints_backlog` (tarefas pendentes das sprints ativas) vs. teto configurável (fallback 20, higherIsBetter=false).

**Fluxo Operacional (mais detalhes)**:

- Mantém o `FunnelBar` mas adiciona linha inferior com micro-KPIs: `Retrabalho mês`, `TMA mês`, `1ª resposta média`, `Aging médio do backlog` (calculados no payload — reaproveitando dados já buscados).
- Ranking passa a mostrar **top 5** (não 3), com nº fechados no dia e mini-badge de CSAT do mês do técnico quando disponível.

**Substituir "Alertas Críticos" por painel "Metas do Mês"**:

- Novo componente `src/components/tv/GoalsPanel.tsx` mostrando 5 linhas com barra de progresso + valor atual/meta + status colorido (verde ≥100%, âmbar 70–99%, vermelho <70%; invertido para retrabalho):
  1. **Pontuação** — `points_actual_total` / `points_target_total`
  2. **CSAT** — `csat_actual_avg` / `csat_target_avg`
  3. **TMA** — `tma_actual_hours` / `tma_target_avg_hours` (menor é melhor)
  4. **Projetos Entregues** — `projects_actual_total` / `projects_target_total`
  5. **% Retrabalho** — `rework_actual_percent` / `rework_target_avg` (menor é melhor)
- `CriticalAlertsPanel.tsx` deixa de ser usado (arquivo pode continuar existindo, sem import).

### 3. Migração de banco

- Nova função `public.get_tv_goals_summary(_organization_id uuid, _year int, _month int)` retornando um `jsonb` com os campos listados acima. Sem novas tabelas; sem novas policies.

## Detalhes técnicos

- Todos os cálculos de "mês vigente" no fuso `America/Sao_Paulo` (consistente com `business_minutes_between` e `get_metas_tecnicos`).
- No front, `derived` no `useMemo` ganha os campos novos; nenhum `refetchInterval` novo — realtime já cobre inserção; polling de 5min continua como fallback.
- `active_sprints_backlog` conta `project_tasks` com `status <> 'Concluído'` cujo `sprint_id` está em `sprints` com `status = 'ativa'` da org.
- "1ª resposta média" = média em minutos úteis entre `created_at` e a **primeira** transição para `Em Andamento` (via `ticket_history`), só do mês.
- "Aging médio do backlog" = média de minutos úteis entre `created_at` de tickets ainda abertos e `now`.
- Nenhuma mudança em RLS, auth, ou outros dashboards.

## Fora de escopo

- Editar limiares de SLA por prioridade (permanecem os atuais).
- Criar tela nova para gerenciar meta de "backlog máximo" (segue constante configurável no código).
- Mexer em `Meu MVP`, `Metas` (página) ou `MetricasGerenciais`.

## Arquivos afetados

```text
supabase/functions/tv-dashboard/index.ts      (adiciona campos ao payload)
supabase/migrations/*_tv_goals_summary.sql    (nova RPC get_tv_goals_summary)
src/pages/TvDashboard.tsx                     (novas fontes + novo painel)
src/components/tv/GoalsPanel.tsx              (novo)
```
