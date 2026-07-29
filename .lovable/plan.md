## Objetivo

Melhorar o prompt de análise da edge function `generate-executive-summary` para:
1. Adaptar linguagem e enquadramento ao **filtro ativo** (Hoje / Ontem / 7 dias / Mês) em vez de assumir sempre "dia".
2. Enriquecer o contexto com os mesmos indicadores exibidos no Painel de TV (abertos no período, fechados no período, TMA, top técnico, backlog atual, aguardando aprovação, retrabalho, CSAT).
3. Produzir insights mais específicos, comparativos e acionáveis — evitando frases genéricas.

Escopo: apenas o arquivo `supabase/functions/generate-executive-summary/index.ts`. Sem mudanças de UI, banco ou contrato de resposta.

## Mudanças

### 1. Detectar o preset de período a partir de `from`/`to`
Nova função `detectPeriodLabel(from, to)` que retorna:
- `"hoje"` — intervalo cobre exatamente o dia atual (America/Sao_Paulo)
- `"ontem"` — cobre o dia anterior
- `"últimos 7 dias"` — janela de ~7 dias terminando hoje
- `"mês (MM/AAAA)"` — cobre um mês corrente/fechado
- fallback: `"período DD/MM → DD/MM"` para custom

O label é passado para o prompt e para a mensagem de WhatsApp (substituindo o `dateLabel` fixo que hoje só mostra a data do `from`).

### 2. Ajustar `buildWhatsappMessage`
- Título passa a usar o label do período (ex.: `📊 RESUMO OPERACIONAL — T.I — Últimos 7 dias`).
- Linha de status final referencia o período em vez de "dia".

### 3. Reescrever `generateAiInsights` — novo prompt

Estrutura do novo prompt (em pt-BR, tom executivo e conciso):

- **Contexto explícito**: informar período analisado, organização, e que os números vieram do mesmo pipeline do Painel de TV.
- **Instruções de estilo**: 5 a 7 insights, cada um em 1–2 frases, sempre citando número + interpretação (não apenas repetir o número). Proibir clichês ("continue assim", "bom trabalho", "manter o ritmo").
- **Roteiro obrigatório adaptado ao período**:
  1. Volume e ritmo: comparar abertos vs fechados no período (saldo positivo/negativo do backlog).
  2. Qualidade: CSAT médio + nº de avaliações + retrabalho — cruzar as duas dimensões.
  3. Produtividade individual: destacar top 2 técnicos por fechamentos e qualquer técnico com risco (retrabalho alto, CSAT baixo com ≥2 avaliações, sobrecarga de pendentes).
  4. Composição da demanda: mix Hardware/Software/outros + top 2 categorias + média de story points (leve/pesado).
  5. Prioridades: distribuição de prioridade nos fechados (Alta/Crítica dominante?).
  6. Backlog e SLA: aguardando aprovação vs em andamento — se aguardando aprovação for >30% do backlog, sinalizar como gargalo de aprovação.
  7. Recomendação prática de próxima ação — específica ao período (para "hoje": ação até fim do expediente; para "mês": ação para o próximo ciclo).
- **Restrições**: não inventar dados; se um campo estiver zerado, dizer explicitamente (ex.: "sem avaliações CSAT no período").
- **Formato de saída**: manter JSON `{"insights": [...]}`.

### 4. Enriquecer os dados enviados ao modelo
Adicionar ao payload do prompt:
- `periodLabel` e range formatado `DD/MM/AAAA → DD/MM/AAAA`.
- `saldoBacklog = abertos_no_periodo - fechados_no_periodo` (calculado a partir de `periodTickets` e `closedPeriod` já buscados).
- Contagem total de abertos no período (`opened_in_period`) — hoje só há totais de fechados.
- Backlog atual e aguardando aprovação (já vêm de `overview`).
- Manter mix por tipo, prioridade, top categorias, story points e resumo por técnico.

### 5. Ajustes menores
- Cache continua chaveado por `(org, from, to)` — nada muda.
- Sem alteração no schema `daily_insights_cache`.
- Frontend não precisa de mudança: continua chamando `useDailyInsights` com o range ativo (o filtro Hoje/Ontem/7d/Mês já passa `from`/`to` corretos).

## Validação

- Rodar `bun run build` (frontend não muda, mas confirma que nada quebrou).
- Redeploy da edge function é automático.
- Teste manual na tela `/metricas-gerenciais`: clicar em cada preset (Hoje, Ontem, 7 dias, Mês) e usar "Gerar Resumo Executivo" / "Regenerar" — validar que o texto dos insights e da mensagem de WhatsApp referencia o período correto.
