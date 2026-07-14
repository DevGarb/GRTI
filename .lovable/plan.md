## Objetivo
Simplificar o Painel de TV ("menos é mais") com foco em acompanhamento diário + metas mensais + calendário do dia.

## Estrutura proposta da tela (1080p, sem scroll)

```text
┌──────────────────────────────────────────────────────────────────────┐
│  HEADER: Logo org · Data/Hora · Status operacional · Última atualiz. │
├───────────────────────────────────┬──────────────────────────────────┤
│  BLOCO DIÁRIO (4 KPIs grandes)    │                                  │
│  ┌─────────┬─────────┐            │   CALENDÁRIO DE HOJE             │
│  │Fechados │  CSAT   │            │   (somente o dia atual)          │
│  │  HOJE   │  médio  │            │                                  │
│  ├─────────┼─────────┤            │   Lista dos chamados do dia      │
│  │Top Téc. │  TMA    │            │   (título · prioridade · hora ·  │
│  │  do dia │  médio  │            │    técnico · status)             │
│  └─────────┴─────────┘            │                                  │
├───────────────────────────────────┴──────────────────────────────────┤
│  FLUXO OPERACIONAL (destaque, faixa larga)                           │
│  Aberto → Em Andamento → Aguardando → Fechado   (+micro-KPIs)        │
├──────────────────────────────────────────────────────────────────────┤
│  METAS DO MÊS (substitui OKRs)                                       │
│  Pontuação · CSAT · TMA · Projetos Entregues · % Retrabalho ·        │
│  Preventivas · Fechamentos                                           │
└──────────────────────────────────────────────────────────────────────┘
```

## 3 direções visuais a gerar (mockups PNG)

Vou gerar 3 mockups para você escolher antes de codar:

1. **"War Room Dark"** — fundo escuro, tipografia display grande, KPIs em tiles neon, calendário como coluna lateral timeline vertical, metas mensais como barras horizontais finas embaixo.
2. **"Editorial Claro"** — fundo claro, muito espaço em branco, números gigantes serif/display, calendário como cartão único do dia estilo agenda, metas como anéis/gauges alinhados.
3. **"Bento Grid Colorido"** — grid tipo bento com blocos coloridos por status, KPIs diários no bento superior, calendário-bento à direita com timeline horária, metas em faixa inferior com pills coloridas.

Todas mantêm: 4 KPIs diários no topo-esquerda, calendário do dia no topo-direita, fluxo operacional em destaque no meio, metas do mês embaixo.

## Fontes de dados (mapa)

- **Fechados hoje** → `kpis.closed_today` (edge `tv-dashboard`, já existe)
- **CSAT médio hoje** → NOVO campo `csat_today` (evaluations type=satisfaction do dia)
- **Top técnico do dia** → `ranking_today[0]` (já existe)
- **TMA médio hoje** → NOVO `tma_today_minutes` (tickets fechados hoje, business minutes)
- **Calendário do dia** → NOVO `today_tickets` (tickets criados OU com prazo hoje: id, título, prioridade, hora, técnico, status)
- **Fluxo operacional** → `kpis.open/in_progress/awaiting/closed_today` (já existe)
- **Metas do mês** → `goals_summary` (RPC já existe) + `preventivas_month` + `closed_month`

## Passos de implementação (após você escolher o layout)

1. Ajustar edge `tv-dashboard/index.ts`: adicionar `csat_today`, `tma_today_minutes`, `today_tickets`.
2. Criar componentes: `DailyKpiTile`, `TodayCalendarPanel`, adaptar `GoalsPanel` para incluir Preventivas e Fechamentos.
3. Refatorar `TvDashboard.tsx` para o novo grid (remover OKRs antigos e quadrantes redundantes).
4. Manter subscription realtime + banner de novo chamado + som (já funcional).

## Fora de escopo agora

- Definir os valores/regras das metas mensais adicionais (você disse que ainda vai definir).
- Mudar página de Metas dos técnicos.
- Alterar thresholds de SLA.

## Próximo passo

Ao aprovar este plano, gero os 3 mockups PNG e te apresento para escolher qual seguir. Só depois faço as mudanças de código.
