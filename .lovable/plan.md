
# Painel de TV / Monitoramento — GRTI

Rota pública responsiva, protegida por token, que fica aberta 24/7 numa TV mostrando o status operacional da GRTI em tempo quase real.

## Rota e acesso

- Nova rota pública: `/tv/:orgSlug` (fora do `ProtectedRoute`), aceitando `?token=XYZ` na URL.
- Token estático por organização, guardado como secret no backend (`TV_DASHBOARD_TOKEN_GRTI`). Sem token válido → tela "Acesso negado".
- Sem sessão de usuário: os dados vêm de uma edge function pública (`tv-dashboard`) que valida o token e devolve tudo pronto (KPIs, listas, ranking). Nenhuma escrita, só leitura.
- Auto-refresh a cada 60s (react-query `refetchInterval`), com indicador discreto de "última atualização há Xs".

## Layout

- Página full-screen sem sidebar/topbar (não usa `AppLayout`).
- Responsivo: em **retrato** (TV rotacionada / tablet em pé) vira coluna única empilhada; em **paisagem 16:9** vira grid 12 colunas.
- Tema escuro fixo para leitura à distância, tipografia grande, cores dos status já existentes (`--status-open`, `--status-waiting`, `--status-closed`).
- Cabeçalho fixo: logo da org + relógio + data + badge de status operacional (reaproveita `computeOpStatus`).

## Blocos exibidos

1. **KPIs do dia** — cards grandes: Finalizados hoje, Em andamento, Em aberto, CSAT, TMA, Backlog total. Reaproveita `ExecutiveSummary` visualmente (versão XL).
2. **Fila de chamados em aberto** — tabela rolando: nº, categoria, solicitante, tempo aguardando, prioridade. Destaque vermelho para os que estouraram SLA (horário comercial). Máx. 10 linhas visíveis com auto-scroll suave se houver mais.
3. **Chamados em andamento** — tabela: nº, técnico (avatar+nome), categoria, tempo decorrido, status. Ordena por tempo decorrido desc.
4. **Preventivas do mês** — 4 mini-cards: Total previstas, Concluídas, Pendentes, Atrasadas + barra de progresso do mês.
5. **Ranking do dia + Alertas SLA** — coluna dupla:
   - Top 5 técnicos por chamados fechados / pontuação de hoje.
   - Lista curta de alertas: chamados/preventivas com SLA estourado ou prestes a estourar.

## Backend

Nova edge function `supabase/functions/tv-dashboard/index.ts` (public, `verify_jwt=false`):

- Recebe `?org=<slug>&token=<token>`.
- Valida token contra secret `TV_DASHBOARD_TOKEN_<SLUG_UPPER>`. Falha → 401.
- Resolve `organization_id` pelo slug.
- Retorna JSON único com:
  - `kpis`: closed_today, in_progress, open, csat, csat_count, tma_minutes, backlog_total
  - `open_queue`: até 20 chamados em aberto (id, número, categoria, solicitante, aguardando_min, sla_estourado)
  - `in_progress_list`: até 20 (id, número, técnico, categoria, decorrido_min)
  - `preventivas_month`: {total, feitas, pendentes, atrasadas}
  - `ranking_today`: top 5 técnicos (nome, fechados, pontos, csat)
  - `sla_alerts`: até 10 itens (tipo, número, título, estourado_por_min)
- Reaproveita a lógica de horário comercial (`src/lib/businessHours`) portada para Deno dentro da função.

Nenhuma migration nova é necessária — todos os dados já existem em `tickets`, `preventive_maintenance`, `profiles`, `categories`, `evaluations`.

## Frontend — arquivos

- `src/pages/TvDashboard.tsx` (novo) — página, controla token, chama a function via `fetch` (sem auth), react-query com `refetchInterval: 60_000`.
- `src/components/tv/TvHeader.tsx`, `TvKpiCard.tsx`, `TvOpenQueue.tsx`, `TvInProgressList.tsx`, `TvPreventivas.tsx`, `TvRanking.tsx`, `TvSlaAlerts.tsx` — blocos.
- `src/App.tsx` — registrar `<Route path="/tv/:orgSlug" element={<TvDashboard />} />` **fora** do `ProtectedRoute` (igual `/asset/:id`).

## Segurança

- Token só circula no querystring — assumido aceitável porque a TV fica em rede local; dá para trocar via `update_secret` a qualquer momento.
- Function não expõe dados de outras organizações (filtra por `organization_id` resolvido do slug).
- Nada de sessão, nada de escrita, nada de PII sensível além do que já aparece nas telas normais.

## Como usar depois de pronto

1. Gerar/rotacionar `TV_DASHBOARD_TOKEN_GRTI` via secret manager.
2. Abrir na TV: `https://<seu-domínio>/tv/grti?token=<token>`.
3. Ativar modo full-screen do navegador (F11). Refresh acontece sozinho a cada 1 min.

## Fora de escopo

- Configuração de blocos por org via UI (por enquanto blocos são fixos para GRTI; extensível depois).
- Notificações sonoras / TTS.
- Modo edição direto da TV (é read-only).
