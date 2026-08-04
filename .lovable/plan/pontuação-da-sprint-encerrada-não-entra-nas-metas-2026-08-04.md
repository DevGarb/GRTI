# Pontuação da sprint encerrada não entra nas Metas

## O que foi verificado

Ao oficializar o encerramento, o sistema **está** criando o chamado de crédito da sprint corretamente:

- S4 – Qualidade e Homologação → chamado tipo "Projeto", Fechado, 8 pontos
- S3 – Desenvolvimento → chamado tipo "Projeto", Fechado, 23 pontos

O total é gravado no campo `story_points` do chamado, e o técnico responsável fica como responsável.

O problema é na contagem: **todas as telas de pontuação somam a pontuação da categoria do chamado**, não o `story_points`. Os chamados de sprint são criados sem categoria (categoria nula em 100% deles, inclusive nos de julho), então entram como **0 pontos** nas Metas e no MVP — aparecem só como "1 chamado fechado".

## Correção proposta

Fazer a pontuação considerar os pontos da sprint quando o chamado for do tipo "Projeto":

- `get_metas_tecnicos` — pontos por chamado passam a ser `pontuação da categoria`, e quando não houver categoria e o chamado for do tipo "Projeto", usar o `story_points` da sprint.
- `get_mvp_chamados_metrics` — mesma regra na soma de pontos por técnico (`category_points`).

Isso vale retroativamente: as sprints já encerradas (julho e agosto) passam a contabilizar seus pontos automaticamente, sem precisar reabrir/refechar nada.

Nenhuma mudança no fluxo de encerramento, no checklist de qualidade, nem na criação do chamado de crédito.

## Detalhes técnicos

Uma migration atualizando as duas funções:

```sql
-- em ambas as funções, trocar
COALESCE(cat.score, 0)
-- por
COALESCE(cat.score, CASE WHEN c.type = 'Projeto' THEN c.story_points ELSE 0 END, 0)
```

Requer incluir `t.type` e `t.story_points` na CTE `closed` de cada função. O restante do corpo das funções permanece idêntico.

## Verificação

Após a migration, conferir em Metas dos Técnicos (agosto/2026) que o técnico responsável pelas sprints S3 e S4 passa a somar 31 pontos vindos das sprints, além dos pontos dos chamados normais.
