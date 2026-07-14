## Objetivo
Refinar o Painel da TV com 4 mudanças pontuais, sem alterar demais dados.

## 1) Toggle claro/escuro
- Adicionar botão `Sun/Moon` no header (ao lado do "Ativar Som").
- Persistir em `localStorage` (`tv-theme`).
- Trocar valores hardcoded `hsl(var(--tv-bg))` etc. por tokens que respondem à classe `.dark` no root do dashboard.
- Definir em `src/index.css` um bloco `.tv-light` com paleta clara equivalente (fundo off-white, superfícies brancas, texto near-black, mantendo mesmos acentos cyan/lime/amber/violet/magenta).
- Remover o `document.documentElement.classList.add("dark")` fixo; aplicar classe no wrapper do dashboard.

## 2) Top Técnico (KPI 03)
Novo layout do tile:
- Linha 1: nome completo (truncado a 2 linhas se preciso, font Space Grotesk).
- Linha 2: `<qtd> tickets` + badge `<pct>%` da produção do dia (fechados hoje do técnico ÷ total closed_today).
- Se sem fechamentos: manter placeholder "—".
- Edge function já retorna `ranking_today` com `fechados` — só calcular `pct = top.fechados / kpis.closed_today * 100`.

## 3) TMA Hoje — wall-clock
Na edge function `tv-dashboard/index.ts`, substituir o cálculo de TMA por diferença bruta em minutos entre `started_at` e `closed_at`:
```
const m = (cd.getTime() - new Date(t.started_at).getTime()) / 60000;
```
Aplicar aos três agregados (`tma_minutes`, `tma_month_minutes`, `tma_today_minutes`).
Tile "TMA Hoje" continua exibindo só chamados fechados hoje pelo técnico (já é o escopo atual).
Nota: `first_response_min` e SLA seguem usando `calcBusinessMinutes` (não são TMA).

## 4) Metas do Mês no header
- Remover a `<section>` inferior `<MonthGoalsStrip>`.
- Reposicionar como tira horizontal fina logo abaixo do título/nome da org, ocupando toda a largura do header.
- Criar variante `compact` em `MonthGoalsStrip.tsx`: altura menor (~44px), cada pill com ícone + label micro (10px) + valor + barra de progresso 2px. Sem título "METAS DO MÊS".
- Layout do dashboard passa a ser: Header (com metas embaixo) → Row KPIs+Timeline → Row Funil.

## Fora de escopo
- Não muda backend de metas/goals_summary.
- Não redesenha timeline, funil, ou KPIs 01/02/04.
- Não altera CSAT, backlog, preventivas.

## Arquivos afetados
- `src/pages/TvDashboard.tsx` — toggle tema, mover metas, passar pct do top tech.
- `src/components/tv/DailyKpiTile.tsx` — variante "topTech" com nome+qtd+pct (ou renderizar via `children`).
- `src/components/tv/MonthGoalsStrip.tsx` — prop `variant: "full" | "compact"`.
- `src/index.css` — tokens `.tv-light` equivalentes aos `--tv-*` atuais.
- `supabase/functions/tv-dashboard/index.ts` — TMA wall-clock.
