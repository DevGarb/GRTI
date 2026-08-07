# Painel de TV — Passe de legibilidade (somente visual)

Depois do ajuste nos títulos dos KPIs, o resto do painel ainda usa fontes de 8 a 11 pixels e textos com cor apagada — ilegíveis a alguns metros de distância de uma TV. A proposta é aplicar o mesmo critério de legibilidade em todos os painéis, sem tocar em lógica, dados ou layout de grade.

## O que muda

**Agenda de Hoje (`TodayAgendaPanel`)** — hoje é o pior caso: horário em 9px, título do chamado em 11px, badge de status em 8px.
- Horário e responsável: 9-10px → 13-14px
- Título do chamado: 11px → 15px, com peso médio
- Badge de status: 8px → 11px, com mais respiro interno
- Rótulo da faixa de hora ("08h", "09h"...): maior e mais contrastado

**Timeline de Hoje (`TodayTimelinePanel`)**
- Horários e metadados: 10px → 13px
- Título do card: 12px → 15px
- Badge de status: 9px → 11px

**Metas do Mês (`MonthGoalsStrip`)**
- Rótulos das metas: 9-10px → 13px
- Valor da meta: `text-sm` → `text-2xl` (é um número, precisa saltar)
- Percentual/badge: 9px → 12px

**Funil Operacional (`OperationalFunnel`)**
- Rótulo de cada etapa: 10px → 13px
- Métricas secundárias abaixo do número: 10px → 12px

**Alertas Críticos (`CriticalAlertsPanel`)**
- Eyebrows "Crítico"/"Atenção": 10px → 13px
- Nome da categoria e contagem: `text-sm` → `text-lg`

**Cabeçalhos de painel (padrão comum)** — todos os cards repetem o mesmo par eyebrow 10px + subtítulo `text-sm`. Vira eyebrow 12px + subtítulo `text-lg`, aplicado de forma consistente em Agenda, Timeline, Funil e Metas.

**Contraste** — trocar usos de `tv-text-mute` por `tv-text-dim` em textos informativos (mantendo `mute` só em marcações decorativas tipo relógio/carimbo), para elevar o contraste sobre o fundo escuro.

## Fora de escopo

Nenhuma alteração em consultas, edge functions, cálculo de KPI, ordenação, filtros ou estrutura de grid. Só classes de tipografia e cor.

## Verificação

Captura do painel via navegador headless em 1920x1080 antes/depois para conferir que nada quebra linha nem estoura o card, seguida de `bun run build`.
