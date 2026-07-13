
# Redesign do Painel de Monitoramento (TV Dashboard)

Trocar o layout atual (KPIs pequenos + tabelas lineares de chamados) por uma grade estilo **war room**: quadrantes grandes com indicadores, gauges e status semafóricos. Foco em leitura à distância (TV) e visão executiva por OKR, não em listas de itens.

## Estrutura visual (grid 12 colunas, tela cheia)

```text
┌──────────────────────── HEADER (org • relógio • status semáforo global) ────────────────────────┐
│                                                                                                  │
│  ┌───────────────┬───────────────┬───────────────┬───────────────┐                              │
│  │ Q1 PRODUÇÃO   │ Q2 SLA        │ Q3 QUALIDADE  │ Q4 CAPACIDADE │  ← 4 quadrantes principais    │
│  │ Finalizados   │ Gauge % SLA   │ CSAT gauge    │ Técnicos on   │                              │
│  │ vs meta dia   │ no prazo      │ 0-5 estrelas  │ Carga/técnico │                              │
│  │ (barra prog.) │ Crít/Aten/OK  │ Nº avaliações │ TMA médio     │                              │
│  └───────────────┴───────────────┴───────────────┴───────────────┘                              │
│                                                                                                  │
│  ┌─────────────────────── OKRs / Metas do Mês (3-4 cards grandes) ──────────────────────────┐  │
│  │  ⬤ Fechar 200 chamados   ⬤ CSAT ≥ 4.5   ⬤ Preventivas 100%   ⬤ Backlog < 20            │  │
│  │     [progress ring]        [progress ring] [progress ring]      [progress ring]           │  │
│  └───────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│  ┌─────────── FLUXO (funil) ──────────┬──────────── ALERTAS CRÍTICOS ─────────────┐            │
│  │ Aberto → Andamento → Aprov → Fech  │ Nº de chamados estourando SLA (contador   │            │
│  │ (barras horizontais proporcionais) │ grande + top 3 categorias impactadas)     │            │
│  └────────────────────────────────────┴───────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Quadrantes principais (Q1-Q4)

Cada quadrante = card grande com **título**, **valor gigante**, **indicador de status (🟢🟡🔴)** e **micro-contexto** (meta, delta vs. ontem, ou barra):

- **Q1 Produção do dia** — Finalizados hoje / meta diária, barra de progresso, delta vs. média 7d.
- **Q2 SLA no prazo** — Gauge circular % de chamados ativos dentro do SLA (usa `sla_alerts` + total ativos). Cores: verde ≥ 90%, amarelo 70-90%, vermelho < 70%.
- **Q3 Qualidade (CSAT)** — Nota média com estrelas + nº de avaliações do período.
- **Q4 Capacidade** — Técnicos ativos, chamados/técnico, TMA médio como sub-métricas.

## OKRs (faixa central)

Cards de OKR com **progress ring** (SVG). Metas puxadas de valores calculados no edge (não requer nova tabela nesta fase — usar constantes por org ou já-existentes de `useGoals`/preventivas):
- Fechamentos do mês vs. meta
- CSAT médio do mês vs. 4.5
- Preventivas feitas/total
- Backlog atual vs. teto (20)

Cada card mostra: nome do OKR, valor atual/meta, % de atingimento, cor semafórica.

## Funil operacional

Barras horizontais empilhadas proporcionais (Aberto/Em andamento/Aguardando aprov/Fechados hoje) — substitui a tabela "Fila em Aberto". Mostra o balanço do funil, não itens.

## Alertas críticos

Card grande com:
- Contador enorme de chamados fora do SLA (crit + warn separados)
- Top 3 categorias/prioridades mais impactadas (agregação, não lista de tickets)
- Semáforo global

## Header

Adicionar **badge de status operacional global** (🟢 Normal / 🟡 Atenção / 🔴 Crítico) reutilizando `computeOpStatus` de `src/lib/opStatus.ts` — já existe a lógica.

## Detalhes técnicos

- **Frontend only nesta fase**: reaproveita o payload atual de `tv-dashboard` (kpis, sla_alerts, preventivas_month, ranking_today, in_progress_list, open_queue). Faz as agregações no cliente:
  - % SLA no prazo = 1 − (sla_alerts.length / (open + in_progress))
  - Distribuição do funil = kpis.open / in_progress / awaiting / closed_today
  - Top categorias em alerta = agrupar `open_queue` + `in_progress_list` filtrando `sla !== "ok"` por `category`
- **Metas OKR**: hardcoded no client por enquanto (constantes por org via mapa `orgSlug → metas`) — para não mexer no edge/backend nesta iteração. Deixa `TODO` para depois puxar de `goals` real.
- **Realtime, som e alerta de novo chamado**: mantidos exatamente como estão (canal `tv:{slug}`, beep, banner).
- **Componentes novos** (todos em `src/components/tv/`):
  - `QuadrantCard.tsx` — card grande com valor + status + micro-contexto
  - `GaugeRing.tsx` — SVG circular progress (usado em Q2, Q3 e OKRs)
  - `OkrCard.tsx` — card de OKR com ring
  - `FunnelBar.tsx` — barra empilhada horizontal
  - `CriticalAlertsPanel.tsx` — contador + top categorias
- **Arquivo alterado**: `src/pages/TvDashboard.tsx` — remove seção de tabelas (Fila em Aberto, Em Andamento, Ranking) e monta o novo grid. Ranking do dia vira um card compacto opcional no rodapé (top 3 apenas, sem tabela).
- **Sem mudanças em**: edge function `tv-dashboard`, migrations, realtime, autenticação por token.

## Fora do escopo

- Não alterar o edge function nesta fase (payload já cobre tudo).
- Não criar tabela de metas OKR (usar constantes por enquanto).
- Não mexer nos outros dashboards (`DashboardOperacional`, `ProjetosDashboard`).
