## Problema
A trilha **MVP → Projetos** calcula entregas a partir de `project_tasks` (tarefas individuais com `delivered_date` e `assignee_id`). Concluir o projeto pelo modal "Concluir projeto" só grava `status/size/value_brl/completed_at/completed_by` na tabela `projects` — não gera tarefas. Resultado: 0 entregas, 0 no ranking, R$ 0 aprovado.

## Solução proposta
Fazer a trilha Projetos do MVP contabilizar **projetos concluídos** (não apenas tarefas), preservando a lógica de tarefas para quem usa Kanban.

### 1. Atualizar `get_mvp_metrics(org, year, month)` (migration)
Unir duas fontes por usuário no mês:

- **Projetos concluídos**: `projects` onde `completed_at` está no mês e `completed_by` definido (fallback `owner_id`). Cada projeto = 1 entrega.
  - `on_time` = `completed_at::date <= planned_end_date` (quando houver); sem `planned_end_date`, conta como no prazo.
  - `value_brl` somado vira o `amount_brl` base da trilha projetos (substituindo o valor fixo 300/500 do nível prata/ouro **apenas se** o projeto tiver valor; caso contrário mantém regra atual).
  - `reworks` derivado de `SUM(project_tasks.rework_count)` por projeto (0 se não houver tarefas).
- **Tarefas concluídas** (lógica atual) somam às entregas de quem usa Kanban.

### 2. Ajustar `compute_mvp_awards` (mesma migration)
Na trilha projetos, se o usuário tiver projetos com `value_brl > 0` no mês, usar **soma de `value_brl` aprovado** como `amount_brl`, substituindo o 300/500. Manter o gating por nível (prata ≥ 90%, ouro ≥ 100%) — sem nível = R$ 0.

### 3. Ajustar texto do header em `ProjetosMVP.tsx`
A legenda atual ("Prata ≥ 90% (R$ 300) · Ouro = 100% (R$ 500)") precisa indicar que, em Projetos, o valor pago é a **soma dos valores dos projetos aprovados no mês** quando definido, com fallback 300/500.

### 4. Recalcular o mês corrente
Após a migration, rodar `compute_mvp_awards` para junho/2026 da organização afetada para popular as 4 entregas existentes.

## Fora do escopo
- Trilha Chamados (já funciona via `get_mvp_chamados_metrics`).
- Penalidades, aprovação manual, regras de qualidade de sprint.

## Pergunta antes de implementar
Quando o projeto não tem `planned_end_date`, conta como **no prazo** (proposta acima) ou **fora do prazo**? E o `amount_brl` deve ser a **soma dos `value_brl`** dos projetos concluídos no mês (substituindo 300/500), correto?
