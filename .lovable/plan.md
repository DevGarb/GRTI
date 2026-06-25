## Problema

A função `get_mvp_metrics` atribui projetos concluídos a `COALESCE(completed_by, owner_id)`, então todos os 4 projetos foram para você (admin que clicou em "Concluir projeto"), em vez de irem para Danilo, Victor e Gabriel Caminha.

## Regra desejada

- **Responsável (owner_id)**: 1 entrega + 100% do `value_brl`
- **Co-responsável (co_owner_id)**: 1 entrega + 50% do `value_brl`
- **Quem clicou em "Concluir"** (completed_by): ignorado para fins de MVP

## Mudança

Migration única reescrevendo `public.get_mvp_metrics` para que o CTE `project_deliveries` gere até 2 linhas por projeto:

```text
project_deliveries:
  owner_id     → d_delivery=1, d_value = value_brl,          d_on_time = (completed_at <= planned_end_date)
  co_owner_id  → d_delivery=1, d_value = value_brl * 0.5,    d_on_time idem
```

Mantém o restante da lógica (task_deliveries, agregação, on_time_rate, quality, rework, final_score, níveis Ouro/Prata).

Após aprovar, clique em **Recalcular mês** na aba MVP Equipe → Projetos. Danilo, Victor e Gabriel Caminha passam a aparecer com suas entregas; co-responsáveis recebem metade do valor de cada projeto onde figuram.

## Sem mudanças de frontend

A legenda atual já cobre "soma dos valores dos projetos". Nenhum componente React precisa ser alterado.