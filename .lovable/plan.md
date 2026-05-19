## Problema

A página **Metas dos Técnicos** dispara 6 consultas client-side em cascata ao trocar de mês:

1. `tickets` (status=Fechado + mês)
2. `evaluations` satisfaction `IN (...446 ids)`
3. `evaluations` meta `IN (...446 ids)`
4. `categories` `IN (...)`
5. `preventive_maintenance` (mês)
6. `ticket_history` `IN (...446 ids)` — usada DUAS vezes: rework + `fetchTicketWorkMinutes`
7. `profiles` `IN (...techIds)`

Em Abril temos **446 chamados fechados** e a tabela `ticket_history` (5k linhas) **não tem índice em `ticket_id`** — cada `IN` com 446 ids vira full-scan, multiplicado pelas RLS. Por isso travou.

## Solução

Duas frentes complementares:

### 1. Índices (ganho imediato, baixo risco)

```sql
CREATE INDEX idx_ticket_history_ticket_id      ON ticket_history(ticket_id);
CREATE INDEX idx_ticket_history_ticket_action  ON ticket_history(ticket_id, action);
CREATE INDEX idx_tickets_status_created        ON tickets(organization_id, status, created_at);
CREATE INDEX idx_preventive_org_created        ON preventive_maintenance(organization_id, created_at);
CREATE INDEX idx_preventive_created_by         ON preventive_maintenance(created_by);
```

Só isso já deve derrubar o tempo de "trava" para algo abaixo de 1s na maioria dos casos.

### 2. RPC server-side `get_metas_tecnicos(_year, _month)`

Função SECURITY DEFINER que recebe ano/mês, filtra pela `organization_id` do usuário autenticado e retorna **uma única linha por técnico** já com:

- `user_id`, `full_name`
- `total_closed`, `total_points` (soma de avaliações `meta`)
- `avg_score` (CSAT)
- `evaluations_count`
- `preventivas_done`
- `rework_count`
- `total_work_minutes` (soma das janelas "Em Andamento" calculada em SQL — recursive CTE sobre `ticket_history`)
- `tickets` (jsonb array com `title`, `score`, `resolution_hours`, `closed_at`, `category_name`, `points`)

Com isso, o front faz **uma única chamada** em vez de 6, e o cálculo dos minutos úteis sai de JS para SQL.

> Observação: a regra de "minutos úteis" (08:00-18:00 seg-sex) será portada para SQL como helper `business_minutes_between(ts, ts)` — já existe lógica equivalente em `src/lib/businessHours.ts`.

### 3. Frontend

- `useGoals.ts` ganha um novo hook `useMetasTecnicos(year, month)` que chama a RPC.
- `MetasTecnicos.tsx` substitui o `useQuery` inline atual por esse hook.
- `fetchTicketWorkMinutes` continua disponível para outros usos (Auditoria, etc.) — não removemos.

## Detalhes técnicos

- A RPC reaproveita `is_same_organization`/`is_member_of_org` para escopar — não vaza dados entre orgs.
- `business_minutes_between` em SQL: itera dia a dia entre `start` e `end`, soma a interseção com `[08:00, 18:00]` em dias úteis. Função `IMMUTABLE` para permitir índice futuro se necessário.
- A RPC retorna `setof` tipado; tipos do Supabase serão regerados automaticamente.

## Ordem de execução

1. Migration: criar índices + função `business_minutes_between` + RPC `get_metas_tecnicos`.
2. Criar hook `useMetasTecnicos` em `src/hooks/`.
3. Refatorar `MetasTecnicos.tsx` para consumir a RPC (mantém UI igual).
4. Testar Abril/2026 e mês corrente; comparar números com versão antiga.
