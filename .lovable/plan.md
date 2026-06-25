## Plano para corrigir as notas erradas

### Diagnóstico
- A tela **Metas & Desempenho** está exibindo **Nota Média** usando avaliações do tipo `meta`.
- Hoje `meta` representa a **pontuação da categoria** do chamado, geralmente 1, 2, 3 etc., então a nota fica artificialmente baixa.
- A nota correta do usuário deve vir da avaliação de satisfação (`satisfaction`), que é a nota de 1 a 5 dada no fechamento/aprovação.
- A **Pontuação Total** deve continuar vindo da categoria/subcategoria do chamado, não da nota de satisfação.

### Correções propostas
1. **Corrigir a função de metas dos técnicos**
   - Atualizar `get_metas_tecnicos` para:
     - `avg_score` = média das avaliações `satisfaction`.
     - `evaluations_count` = quantidade real de avaliações `satisfaction`.
     - `total_points` = soma da pontuação da categoria/subcategoria do chamado.
     - Lista de chamados mostrar:
       - `Pontos` = pontos da categoria.
       - `Nota` = satisfação do solicitante, ou “Sem avaliação”.

2. **Corrigir duplicidade/ambiguidade de avaliação**
   - Separar explicitamente no SQL:
     - `satisfaction_score` para nota do usuário.
     - `category_points` para pontuação da meta.
   - Evitar que a pontuação da categoria seja tratada como nota média.

3. **Ajustar MVP de Chamados para manter coerência**
   - Conferir `get_mvp_chamados_metrics`, que já usa `satisfaction` para CSAT.
   - Ajustar a contagem de retrabalho para ignorar retrabalhos invalidados, se ainda houver algum ponto contando errado.
   - Manter as trilhas independentes: Chamados e Projetos.

4. **Corrigir progresso visual das metas, se necessário**
   - Garantir que a meta `Nota Média` compare contra nota real de satisfação, ex.: 4.5/5.
   - Garantir que a meta `Pontuação` compare contra soma de pontos das categorias.
   - Manter `Retrabalho Máximo (%)` como métrica inversa.

5. **Validação final**
   - Comparar os valores retornados pelo banco com uma consulta manual por técnico no mês atual.
   - Confirmar que Felipe, Izabele, Danilo e Victor passam a mostrar notas próximas da média de satisfação real, e não a média da pontuação das categorias.
   - Rodar o linter do backend após a migração e corrigir apenas alertas relacionados a essa alteração.