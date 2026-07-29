## Contexto

Você confirmou a regra: **produtividade do técnico = quando ele inicia e finaliza o chamado**, não quando o aprovador aprova. Aprovação/reprovação vira retrabalho, mas não deve contar como "fechamento do técnico" na data da aprovação.

Na última migration já ajustei `get_management_metrics` para usar `COALESCE(aguardando_aprovacao_at, closed_at)` como "momento efetivo de finalização" (bate com o painel de TV). Falta fechar as pontas soltas para essa regra valer em **todas** as visões gerenciais.

## O que ainda está inconsistente

1. **`get_management_metrics_admin`** (usada quando super_admin filtra por outra org): continua com a lógica antiga baseada em `closed_at`. Mesma discrepância do Danilo vai aparecer aqui.
2. **`get_metas_tecnicos`** (tela Metas dos Técnicos): usa `closed_at` para `total_closed`, `total_points`, `preventivas_done` e a lista `tickets`. Precisa da mesma regra.
3. **`get_mvp_chamados_metrics`** (MVP): idem — `total_closed`, `on_time`, CSAT e retrabalho hoje são amarrados a `closed_at`.
4. **Definição de "on-time" / SLA de finalização**: hoje compara `closed_at` com `due_date`. Deve comparar `COALESCE(aguardando_aprovacao_at, closed_at)` com `due_date` (o técnico não deve ser penalizado se o aprovador demorou).

## Correções propostas (só banco, sem tocar frontend)

Uma única migration com `CREATE OR REPLACE` nas 3 funções, aplicando a mesma regra da `get_management_metrics`:

- **CTE base** em cada função:
  - `status IN ('Fechado','Aprovado')`
  - `effective_finish := COALESCE(aguardando_aprovacao_at, closed_at)`
  - Filtro de período usa `effective_finish` no lugar de `closed_at`
  - Comparações de "on-time" usam `effective_finish <= due_date`
- Retrabalho, CSAT e pontos continuam derivados desse mesmo conjunto de chamados — só muda o critério de "quando entrou no período".
- Assinaturas, tipos de retorno, `SECURITY DEFINER`, `search_path` e GRANTs preservados.

## Fora do escopo

- Frontend (Métricas Gerenciais, Metas, MVP) — mesmos campos, mesmos nomes.
- Painel de TV — já está correto.
- Regras de premiação / valores em R$ — inalteradas.

## Validação após aplicar

```sql
-- Danilo hoje deve bater em todas as fontes
SELECT 'metrics' src, closed_in_period FROM get_management_metrics(<hoje_ini>, <hoje_fim>, '<org_ti>') WHERE full_name ILIKE '%danilo%'
UNION ALL SELECT 'admin', closed_in_period FROM get_management_metrics_admin(<hoje_ini>, <hoje_fim>, '<org_ti>') WHERE full_name ILIKE '%danilo%'
UNION ALL SELECT 'metas', total_closed FROM get_metas_tecnicos(2026, 7) WHERE full_name ILIKE '%danilo%'
UNION ALL SELECT 'mvp', total_closed FROM get_mvp_chamados_metrics('<org_ti>', 2026, 7) WHERE full_name ILIKE '%danilo%';
```

Todos devem refletir a data em que o técnico clicou em "Finalizar", não a data em que o admin aprovou.

## Detalhes técnicos

Uma migration única, três `CREATE OR REPLACE FUNCTION`. Sem DDL de tabela, sem RLS, sem mudança de contrato — o frontend não precisa de deploy.
