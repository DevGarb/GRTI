## Objetivo
Garantir que chamados abertos em maio e fechados/pontuados em junho contem em junho nas métricas.

## O que vou ajustar
1. Corrigir as telas que ainda usam mês de criação para métricas de fechamento
   - `src/pages/dashboard/DashboardPadrao.tsx`
   - `src/components/metas/MyGoalCard.tsx`
   - trocar a contagem de chamados fechados/pontos para usar `closed_at` no mês selecionado
   - manter chamados ainda abertos no critério por `created_at`

2. Alinhar a UI com a regra híbrida já aplicada no restante do sistema
   - abertos: contam pelo mês de abertura
   - fechados e pontuação: contam pelo mês de fechamento
   - evitar que cards e resumos locais da tela contradigam a regra já usada em Auditoria e na função de metas

3. Validar com os dados reais de junho/2026
   - conferir os tickets fechados em junho para Danilo e Iza
   - confirmar que a tela passa a refletir os fechamentos de junho mesmo quando o chamado nasceu em maio

## Achado do diagnóstico
- Existe pelo menos um chamado da Iza criado em maio e fechado em junho no banco, então ele deveria aparecer em junho.
- A inconsistência encontrada está na interface: ainda há trechos usando `created_at` para calcular métricas de fechados.
- Para Danilo, na consulta que fiz agora não apareceu chamado de maio com `closed_at` em junho; então depois da correção a tela vai refletir exatamente o que está salvo no banco.

## Detalhes técnicos
- `MyGoalCard` hoje busca chamados fechados do usuário com filtro por `created_at`; isso precisa mudar para `closed_at`.
- `DashboardPadrao` monta os cards/resumos com `periodTickets` filtrado por `created_at`; os indicadores de fechados precisam usar a base híbrida, não só a lista do mês de abertura.
- Vou manter a lógica já existente em `useDashboardMetrics` e só remover os pontos em que a UI ainda diverge dela.