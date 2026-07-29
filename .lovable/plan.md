## Diagnóstico (confirmado no banco)

Para o Danilo, hoje:
- RPC `get_management_metrics` (usada em Métricas Gerenciais): **21**
- Painel de TV (`tv-dashboard`): **7**

A diferença **não é bug de fuso** — é definição diferente de "quando o chamado foi fechado":

| Fonte | Regra usada |
|---|---|
| RPC Métricas | `status = 'Fechado' AND closed_at ∈ [hoje]` |
| TV | `COALESCE(aguardando_aprovacao_at, closed_at) ∈ [hoje]` para tickets em `Fechado`/`Aprovado` |

O que aconteceu: 14 chamados que o Danilo finalizou em dias anteriores foram **aprovados hoje** em lote pelo administrador. Como o RPC olha só `closed_at`, esses 14 caem no "hoje" e inflam o número — mas a produtividade real do técnico hoje foram os 7 que o TV mostra (finalização efetiva pelo técnico = `aguardando_aprovacao_at`, com fallback em `closed_at` só quando o ticket pula "Aguardando Aprovação", ex.: fechamento de sprint).

Query de verificação retornou exatamente: RPC=21, efetivo=7 → bate com o TV.

## Correção proposta

Recriar `public.get_management_metrics` para usar **finalização efetiva do técnico** como conceito único, alinhando com o TV. Sem mudanças no frontend.

Alterações na função:
1. CTE `closed` passa a filtrar por:
   - `status IN ('Fechado','Aprovado')` (hoje só considera `Fechado`, ignorando aprovados)
   - `effective_finish := COALESCE(aguardando_aprovacao_at, closed_at)` dentro de `[_from, _to)` (em vez de só `closed_at`)
2. Nas CTEs derivadas (`meta_pts`, `csat`, `rework`, `handle`, `cnt_closed`), continuar usando esse mesmo conjunto — muda apenas a definição de "período".
3. `initial_min`/`rework_min` já derivam de `ticket_history`; permanecem como estão.
4. Manter assinatura, tipos de retorno, `SECURITY DEFINER`, `search_path` e GRANTs atuais (função só é substituída via `CREATE OR REPLACE`).

Não altera:
- Frontend (`MetricasGerenciais.tsx`, `useManagementMetrics.ts`) — mesmos campos.
- `get_management_metrics_admin` (fora do escopo; se quiser posso replicar em seguida).
- `get_executive_overview`, `tv-dashboard` — já corretos.

## Validação

Após a migration, rodar:
```sql
SELECT full_name, closed_in_period
FROM get_management_metrics(<início_hoje_SP>, <fim_hoje_SP>, '<org_ti>')
WHERE full_name ILIKE '%danilo%';
```
Esperado: **7**, igual ao TV.

## Detalhes técnicos

Uma única migration `CREATE OR REPLACE FUNCTION public.get_management_metrics(...)` reescrevendo o corpo. Sem DDL em tabelas, sem RLS, sem mudança de contrato.
