# Corrigir alteração da pontuação dada pela IA (org T.I)

## Causa (confirmada no banco)

1. **A alteração não é gravada.** A tabela de pontuações (`evaluations`) só tem permissão para *criar* e *ler* — não existe permissão para *alterar*. Quando o admin muda a pontuação de um chamado já pontuado pela IA, o sistema tenta atualizar, o banco ignora em silêncio (0 linhas alteradas) e a tela mostra "sucesso", mas a pontuação da IA continua lá.
   - Exemplo real: chamado Nº 00966 — categoria já está em "Avulso Estrutural" (10 pts), mas a pontuação gravada continua **3 pts** (da IA).
2. **As Metas nem olham a pontuação atribuída.** O cálculo oficial (`get_metas_tecnicos`) soma a pontuação da *categoria* do chamado, não a pontuação atribuída. Então, mesmo quando a alteração for gravada, a pontuação ajustada manualmente não chega no painel de Metas.

## Correção

1. **Permitir alterar a pontuação**: adicionar permissão de alteração em `evaluations` para administradores (e para quem criou a pontuação), mantendo técnicos sem poder mexer na própria nota.
2. **Pontuação atribuída passa a valer nas Metas**: regra única de pontos por chamado =
   pontuação atribuída (tipo "meta") → se não houver, pontuação da categoria → se for Projeto, pontos da sprint.
   Aplicar em todos os cálculos que hoje usam a categoria: `get_metas_tecnicos`, `get_mvp_chamados_metrics`, `get_management_metrics(_admin)`, `get_tv_goals_summary`, e no front (`sprintScoring.ts` / Dashboard T.I / coluna de pontos da lista de chamados).
3. **Tela do chamado**: após salvar, confirmar que a linha foi realmente alterada (se não, mostrar erro em vez de "sucesso") e atualizar a lista, as Metas e o card "Minhas Metas".
4. **Dados**: nenhum valor é reescrito automaticamente; os chamados que o senhor já tentou corrigir precisarão ser salvos de novo (ou, se preferir, alinho a pontuação atribuída à categoria atual nos casos divergentes — me avise).

## Detalhes técnicos

- Migration: `CREATE POLICY ... FOR UPDATE ON evaluations USING (has_role(auth.uid(),'admin') OR evaluator_id = auth.uid())` + `GRANT UPDATE`.
- Nas RPCs, `LEFT JOIN evaluations em ON em.ticket_id = c.id AND em.type = 'meta'` e `COALESCE(em.score, cat.score, CASE WHEN c.type='Projeto' THEN c.story_points END, 0)`.
- Em `TicketDetailModal.tsx`, usar `.update(...).select()` e falhar se retornar vazio; invalidar `get_metas_tecnicos`, `my-month-points`, `tickets`.

## Verificação

Alterar a pontuação do Nº 00966 como admin, conferir que grava, que a lista mostra o novo valor e que Felipe Augusto tem a pontuação de setembro ajustada no painel de Metas.
