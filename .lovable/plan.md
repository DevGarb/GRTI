## Objetivo
Refazer o Painel de TV no estilo **Bento Grid Tech** — mesma estrutura do mockup aprovado (imagem enviada), mas com estética séria/tecnológica em vez de infantil.

## Direção visual (Bento Tech)

Fora:
- Gradientes pastel saturados (coral, roxo lavanda, verde menta, laranja abóbora)
- Emojis 3D (estrela amarela, cronômetro, avatar cartoon)
- Bordas arredondadas exageradas (rounded-3xl)
- Ícones em círculos coloridos "fofos"

Dentro:
- Fundo escuro **near-black** (`#0A0E1A` / `#0F1420`) com camadas sutis de superfície
- Cartões bento com **glassmorphism sutil**: `bg-white/[0.03]`, borda `border-white/[0.06]`, `backdrop-blur`
- Acentos monocromáticos por cartão: **ciano elétrico**, **âmbar**, **violeta**, **verde-limão** — usados só em números, ícones lineares e uma barra fina de "spine" no topo do card
- Tipografia display **JetBrains Mono** ou **Space Grotesk** para números gigantes (tabular-nums, tracking apertado); corpo em **Inter** já existente
- Ícones **Lucide stroke 1.5** — nada de emoji, nada de 3D
- Micro-labels em UPPERCASE + `tracking-[0.2em]` + `text-[10px]` em cinza-azulado
- Grid lines sutis nos backgrounds (SVG pattern) em alguns cards, estilo "HUD"
- Status dots pulsantes pequenos (2px) em vez de badges coloridos grandes
- Timeline horária como linha fina com nodes circulares vazados; hover/active preenchido com o accent do ticket

## Estrutura (mantém o mockup)

```text
┌─────────┬─────────┬───────────────────────────────┐
│ FECHADOS│  CSAT   │  HOJE — timeline 8h → 18h     │
│  HOJE   │  4.8    │  ─●─●──●─●───●──●──●──●──●─   │
├─────────┼─────────┤  [#7812] [#7813] [#7814] ...  │
│TOP TÉC. │  TMA    │                               │
│  João   │ 2h14    │                               │
├─────────┴─────────┴───────────────────────────────┤
│ FUNIL OPERACIONAL                                 │
│ Recebidos ─▶ Andamento ─▶ Aguardando ─▶ Fechados  │
│   128         78            32            47      │
├───────────────────────────────────────────────────┤
│ METAS DO MÊS — 7 pills escuras com spine colorida │
│ Tickets · CSAT · TMA · 1º Contato · Reab · Qual · Trein│
└───────────────────────────────────────────────────┘
```

## Componentes a criar/refatorar

- `BentoTile.tsx` — wrapper glassmorphism com prop `accent` (cyan|amber|violet|lime|magenta) que controla spine + cor do número
- `DailyKpiTile.tsx` — variante do BentoTile para os 4 KPIs (Fechados, CSAT, Top Técnico, TMA)
- `TodayTimelinePanel.tsx` — timeline horária 8h–18h com nodes SVG + lista horizontal scrollável de cards de ticket compactos
- `OperationalFunnel.tsx` — 4 estágios em linha, ícone lucide + número mono grande + % do volume, conectados por seta fina animada
- `MonthGoalsStrip.tsx` — 7 pills escuras horizontais, cada uma com spine vertical accent + label + valor/alvo + barra de progresso 2px

Reaproveita `GoalsPanel` como base, mas visual novo.

## Design tokens (index.css)

Adicionar semânticos:
- `--tv-bg`: `220 30% 6%`
- `--tv-surface`: `220 25% 9%`
- `--tv-border`: `220 20% 18%`
- `--tv-accent-cyan`: `190 95% 55%`
- `--tv-accent-amber`: `35 95% 60%`
- `--tv-accent-violet`: `260 85% 68%`
- `--tv-accent-lime`: `85 80% 55%`
- `--tv-accent-magenta`: `320 85% 62%`

Fonte display: adicionar **Space Grotesk** via Google Fonts no `index.html`, classe `.font-display`.

## Dados (mantém o plano aprovado)

Sem mudanças no backend em relação ao último plano — edge `tv-dashboard` já vai expor `csat_today`, `tma_today_minutes`, `today_tickets`. Só refatoro visual + adiciono esses campos na edge se ainda não estiverem lá.

## Fora de escopo

- Trocar dados/RPCs
- Alterar página de Metas dos técnicos
- Animações pesadas (mantém transições CSS simples)

## Próximo passo

Aprovando, implemento direto: tokens → componentes bento → refactor `TvDashboard.tsx` → ajuste edge se faltar campo.
