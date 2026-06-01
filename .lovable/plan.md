## Objetivo

Mudar a lógica de agrupamento mensal para o modelo **híbrido**:

- **Chamados em aberto** (qualquer status ≠ Fechado) → continuam contando no mês de **criação** (`created_at`).
- **Chamados fechados** → passam a contar no mês do **fechamento** (não mais pelo `created_at`).

Resultado prático: um chamado criado em Maio/2026 e fechado em Junho/2026 sai das métricas de Maio (de fechados) e aparece em Junho.

## Como saber "quando foi fechado"

Hoje não existe coluna `closed_at` na tabela `tickets`. O `updated_at` muda em qualquer edição, então não serve. Solução:

1. Adicionar coluna `tickets.closed_at timestamptz` (nullable).
2. Criar trigger `BEFORE UPDATE` que define `NEW.closed_at = now()` quando `status` muda **para** "Fechado", e `NEW.closed_at = NULL` se reabrir (sair de Fechado).
3. **Backfill** dos chamados já fechados: pegar o último `ticket_history.created_at` com `action='status_change'` e `new_value='Fechado'`; quando não houver histórico, usar `updated_at` como fallback.

Isso garante que chamados fechados em Junho — mesmo criados em Maio — tenham `closed_at` em Junho.

## Mudanças

### 1. Migration (DB)
- `ALTER TABLE public.tickets ADD COLUMN closed_at timestamptz`.
- Função + trigger `set_ticket_closed_at()` (BEFORE UPDATE).
- Backfill via ticket_history (uma vez).
- Índice `idx_tickets_closed_at` para acelerar filtros mensais.

### 2. `get_metas_tecnicos` (RPC)
Trocar o filtro do CTE `closed`:
```sql
-- antes
WHERE t.status = 'Fechado'
  AND t.created_at >= _start AND t.created_at < _end
-- depois
WHERE t.status = 'Fechado'
  AND t.closed_at >= _start AND t.closed_at < _end
```

### 3. `src/hooks/useDashboardMetrics.ts`
- `closedTickets`: filtrar por `closed_at` em vez de `created_at`.
- `allTickets` (criados no período, usado para "total" e categorias): **manter** filtro por `created_at` — esses representam chamados abertos no mês.
- Incluir `closed_at` no SELECT da query de tickets.

### 4. `src/pages/Auditoria.tsx`
A tela mostra "chamados do mês". Como é uma visão única, dividir em duas faixas mentais:
- Abertos no período → `created_at` entre `monthFrom` e `monthTo` E status ≠ Fechado.
- Fechados no período → `closed_at` entre `monthFrom` e `monthTo` E status = Fechado.

Implementação: duas queries (`created_at` para não-fechados, `closed_at` para fechados) unidas no client. Mantém o CSV export como está.

### 5. `src/pages/Historico.tsx`
Tela mostra `audit_logs` (eventos), não chamados — **não precisa mudar**.

## Fora do escopo
- Metas/Dashboard de outros módulos (Operacional, Oficina, Entregas) — só helpdesk.
- UI das telas (apenas a fonte do filtro muda).
- `ChamadosAbertos`, `Chamados`, `MetasTecnicos` (página) já consomem dos hooks/RPC acima — herdam a mudança sem edição extra.

## Riscos
- Métricas históricas vão se **mover retroativamente** conforme chamados antigos forem fechados. É o comportamento desejado.
- Backfill é one-shot; chamados sem histórico de fechamento ficam com `closed_at = updated_at` (aproximação aceitável).
