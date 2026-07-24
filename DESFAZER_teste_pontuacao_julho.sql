-- =====================================================================
-- DESFAZER teste de pontuação/fechamento automático — Julho/2026 (org T.I)
-- Reverte os 165 chamados fechados + remove as pontuações inseridas.
-- Identificados pelo marcador comment = '[AUTO-TESTE-JULHO-2026]'.
-- Rodar as DUAS instruções, NESTA ORDEM.
-- =====================================================================

-- 1) Reabrir os chamados (volta p/ 'Aprovado', limpa closed_at E a categoria que o teste setou)
UPDATE tickets
SET status = 'Aprovado', closed_at = NULL, category_id = NULL
WHERE id IN (
  SELECT ticket_id FROM evaluations
  WHERE type = 'meta' AND comment = '[AUTO-TESTE-JULHO-2026]'
);

-- 2) Remover as pontuações do teste
DELETE FROM evaluations
WHERE type = 'meta' AND comment = '[AUTO-TESTE-JULHO-2026]';

-- Conferência (opcional): deve voltar a 165 aprovados e 0 pontuações do teste
-- SELECT
--   (SELECT count(*) FROM tickets WHERE status='Aprovado' AND organization_id='a543a17b-0def-4ceb-acf5-91017f2b0ad3') AS aprovados,
--   (SELECT count(*) FROM evaluations WHERE type='meta' AND comment='[AUTO-TESTE-JULHO-2026]') AS pontuacoes_teste;
