# Padronizar TMA em todo o sistema

**Regra única do TMA (wall clock):**
`TMA = 1ª transição para "Aguardando Aprovação" − started_at`
Fallback: se não houver "Aguardando Aprovação" no histórico, usa `closed_at` (tickets legados).
Sem descontar pausas, sem horário comercial, sem somar retrabalhos separadamente — é tempo corrido do relógio.

## Onde aplicar

### 1. Frontend (`src/lib/ticketTiming.ts`)
- Criar `fetchTicketTmaMinutes(tickets)`: retorna `Map<ticket_id, minutos>` usando a regra única.
- Manter `fetchTicketWorkMinutes` (ainda usado para métricas de "horas trabalhadas em horário comercial" — que é conceito diferente de TMA). Marcar no comentário que **não é TMA**.

### 2. Consumidores no frontend — trocar para `fetchTicketTmaMinutes`
- `src/hooks/useDashboardMetrics.ts` — `avgResolutionMinutes` (dashboard e comparativo mês anterior).
- `src/components/metas/MyGoalCard.tsx` — TMA do card "Minha Meta".

### 3. Backend — RPC `get_metas_tecnicos` (SQL)
Substituir o cálculo atual de `avg_handle_minutes` (que usa `business_minutes_between` com janelas em "Em Andamento") por:
```sql
avg_handle_minutes = AVG( EXTRACT(EPOCH FROM (finished_at − started_at)) / 60 )
```
onde `finished_at` = `MIN(ticket_history.created_at)` do 1º `status_change` para `"Aguardando Aprovação"`; fallback `closed_at`. Apenas tickets com `started_at NOT NULL`.

Isso corrige automaticamente:
- `TeamRanking.tsx` (usa `avg_handle_minutes` da RPC)
- `ExecutiveSummary` (idem)
- `supabase/functions/send-management-report/index.ts` (idem)
- `supabase/functions/generate-executive-summary/index.ts` (idem)

### 4. Edge function `tv-dashboard/index.ts`
Já está na regra correta (feita no turno anterior). Nada a fazer.

### 5. Anomalias de TMA (`detect_tma_anomalies`)
Fora do escopo — é detecção estatística de outliers, não medição de TMA médio. Não mexer.

## Fora do escopo
- Cálculos de "tempo trabalhado" em horário comercial (`fetchTicketWorkMinutes`, `MetasRevisaoTMA`) — são conceito diferente (produtividade em horas úteis), continuam iguais.
- SLA de primeira resposta (`first_response_min`) — continua em horário comercial.
- Detecção de anomalias de TMA.

## Arquivos alterados
- `src/lib/ticketTiming.ts` (novo helper)
- `src/hooks/useDashboardMetrics.ts`
- `src/components/metas/MyGoalCard.tsx`
- 1 nova migration SQL alterando `public.get_metas_tecnicos`

Após aprovação, deploy da RPC via migration e redeploy das edge functions consumidoras não é necessário (elas apenas leem o resultado da RPC).
