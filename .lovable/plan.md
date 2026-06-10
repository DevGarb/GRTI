## Problemas identificados

1. **Total atribuídos = 371** — a RPC `get_management_metrics` conta TODOS os chamados já atribuídos ao técnico, ignorando o filtro de período (hoje/ontem/mês).
2. **TMA Médio = 35h 42m** — usa `business_minutes_between(started_at, closed_at)` diretamente. Para chamados antigos reabertos/fechados hoje, isso infla o tempo. O Dashboard já usa "tempo de trabalho acumulado" (somente intervalos em "Em Andamento" via `ticket_history`); a página gerencial não.
3. **Análise da I.A.** vem genérica/desconexa: prompt não diferencia tipo (Hardware/Software), complexidade, nem faz leitura individual aprofundada por técnico do dia.

## Plano

### 1. Migração SQL — corrigir `get_management_metrics` e `get_management_metrics_admin`

- `total_assigned`: contar apenas tickets com `created_at` dentro de `[_from, _to)` (mesma janela do `closed_in_period`). Assim "diário" mostra atribuições do dia, "mensal" do mês.
- `awaiting_approval` e `in_progress_now`: permanecem como snapshot atual (são estados, fazem sentido instantâneos), mantendo o nome — sem mudança.
- `avg_handle_minutes`: substituir o cálculo direto por **soma de intervalos em "Em Andamento"** por ticket (mesmo padrão da função `get_team_evaluation_summary` já existente em `20260601172500`), depois `AVG` sobre os tickets fechados no período. Isso passa a refletir tempo de trabalho efetivo (não calendário).
- Aplicar a mudança nas duas RPCs (a `_admin` é chamada pela edge function).

### 2. Edge Function `generate-executive-summary` — prompt mais rico

- Adicionar ao payload enviado à I.A.:
  - **Mix de tipos**: % Hardware vs % Software vs Outros (calculado via nova query simples a `tickets` filtrada por período/org).
  - **Complexidade**: distribuição de `priority` (Baixa/Média/Alta/Crítica) e `story_points` (quando houver) dos chamados fechados.
  - **Categoria top 3** (campo `category` em tickets) dos chamados do período.
  - **Por técnico (até 10)**: linha já existente + ticket médio em min + retrabalho.
- Reescrever o prompt para pedir explicitamente:
  1. Análise individual de cada técnico ativo no dia (frase curta destacando produtividade/qualidade).
  2. Leitura do mix Hardware/Software e o que ele indica.
  3. Análise de complexidade (priority/pontos) — chamados estão pesados ou leves?
  4. Riscos operacionais concretos (backlog, retrabalho, CSAT baixo).
  5. 1 recomendação prática.
- Aumentar o limite de insights para 5–8 itens curtos. Manter formato JSON `{ "insights": [...] }`.
- Manter cache, mas invalidar quando `force=true` (já existe).

### 3. Sem mudanças de UI

Os componentes (`ExecutiveSummary`, `InsightsCard`, `TeamRanking`) já consomem os mesmos campos — apenas os valores ficam corretos.

## Detalhes técnicos

Trecho SQL para `avg_handle_minutes` (substitui `handle` CTE):

```sql
status_intervals AS (
  SELECT h.ticket_id,
         h.created_at AS open_at,
         LEAD(h.created_at) OVER (PARTITION BY h.ticket_id ORDER BY h.created_at) AS close_at
  FROM public.ticket_history h
  WHERE h.action = 'status_change'
    AND h.new_value = 'Em Andamento'
    AND h.ticket_id IN (SELECT id FROM closed)
),
per_ticket AS (
  SELECT ticket_id,
         SUM(public.business_minutes_between(open_at, COALESCE(close_at, now()))) AS work_mins
  FROM status_intervals GROUP BY ticket_id
),
handle AS (
  SELECT c.assigned_to, AVG(COALESCE(pt.work_mins, 0))::numeric AS mins
  FROM closed c LEFT JOIN per_ticket pt ON pt.ticket_id = c.id
  GROUP BY c.assigned_to
)
```

(O padrão completo já existe na migration `20260601172500` — vou replicar.)

## Arquivos afetados

- `supabase/migrations/<nova>.sql` — redefine ambas RPCs.
- `supabase/functions/generate-executive-summary/index.ts` — novas queries de mix/complexidade e prompt reescrito.
