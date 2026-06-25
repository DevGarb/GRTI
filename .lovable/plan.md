## Problema

As notas exibidas (1.9, 1.9, 3.1, 2.8) estão muito abaixo do real porque a função `get_metas_tecnicos` calcula a média assim:

- Faz `LEFT JOIN evaluations` e usa `COALESCE(e.score, 0)`.
- Resultado: todo chamado **sem avaliação** entra na média como **0**, puxando a nota para baixo.
- Além disso, `evaluations_count` está retornando o total de chamados fechados (`COUNT(pt.id)`) em vez do número real de avaliações.

Por isso o Felipe com poucos chamados realmente avaliados aparece com 1.9 em vez da nota verdadeira (~4.x).

## Correção

Migration ajustando `public.get_metas_tecnicos`:

1. No CTE `evals`, deixar `score` como `NULL` quando não houver avaliação (remover o `COALESCE(..,0)`).
2. No `per_ticket`, manter `score` podendo ser `NULL`.
3. Trocar o cálculo da média para considerar apenas chamados avaliados:
   ```sql
   ROUND(AVG(pt.score) FILTER (WHERE pt.score IS NOT NULL), 2)
   ```
   (ou `AVG(pt.score) WHERE pt.score > 0`).
4. Ajustar `evaluations_count` para refletir o real:
   ```sql
   COUNT(pt.score) FILTER (WHERE pt.score IS NOT NULL)::int
   ```
5. Para os `tickets` no JSON, manter `score` como veio (sem forçar 0), assim a UI consegue diferenciar "sem avaliação" de "nota 0".

Nada muda no frontend — só a RPC. As demais métricas (pontos, tempo, retrabalho, preventivas) ficam intactas.

## Validação

Após aplicar, conferir com:
```sql
SELECT user_id, full_name, total_closed, evaluations_count, avg_score
FROM get_metas_tecnicos(2026, 6);
```
e comparar contra `SELECT AVG(score) FROM evaluations WHERE type='meta' AND ticket_id IN (...)`.
