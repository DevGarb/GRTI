# Divergência de pontuação: 274/271 (admin) x 278/280 (técnico)

## Diagnóstico (confirmado no banco)

Existem **duas contas de pontos diferentes** no sistema, e o número da tela do técnico vem de um cálculo antigo e paralelo.

- Fonte oficial (`get_metas_tecnicos`, usada na aba Metas): agosto/2026 → **Felipe 274**, **Izabele 271**.
- Cálculo local do card "Minhas Metas" (`src/components/metas/MyGoalCard.tsx`, exibido nas telas de Chamados / Chamados T.I): agosto/2026 → **Felipe 278**, **Izabele 280**.

Reproduzi as duas regras direto no banco e os quatro números batem exatamente. As diferenças do cálculo do card:

1. Considera apenas status `Fechado` e ignora `Aprovado`.
2. Usa `closed_at` como data de corte, em vez de `aguardando_aprovacao_at` (data em que o técnico entregou) com fallback para `closed_at`.
3. Não filtra por organização — soma chamados de qualquer org.
4. Ignora pontos de sprint/projeto (`story_points` de chamados do tipo Projeto).
5. Usa o mês no fuso do navegador, não em `America/Sao_Paulo`.

Não houve alteração de categorias nem de pontuação no período; o problema é só a duplicidade de regra.

## Correção proposta

Fazer o card "Minhas Metas" consumir exatamente a mesma fonte da aba Metas, eliminando o cálculo paralelo.

- Em `MyGoalCard.tsx`, trocar todo o bloco de queries manuais (tickets, categorias, avaliações, TMA, preventivas, retrabalho) por uma chamada à RPC `get_metas_tecnicos(_year, _month)`, filtrando a linha do próprio usuário.
- Manter as mesmas métricas exibidas hoje: chamados fechados, pontuação, nota média, TMA, preventivas, retrabalho %.
- "Projetos entregues" continua sendo contado como hoje (a RPC não devolve esse número), sem mudança de regra.
- Sem alteração de banco e sem alteração da regra oficial de pontuação — o número correto é o da aba Metas (274 / 271).

## Efeito para o usuário

Depois do ajuste, o técnico e o admin passam a ver o mesmo valor em qualquer tela e em qualquer mês. Os técnicos vão ver a pontuação de agosto cair de 278/280 para 274/271, que é o valor correto.

## Validação

- `bun run build`.
- Conferência: valores do card do técnico iguais aos da aba Metas para agosto/2026 e para o mês vigente.
