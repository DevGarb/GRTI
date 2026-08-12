# Pontuação da sprint na coluna PTS dos chamados

## O que foi verificado

Os chamados de crédito de sprint (S1, S2, S3...) estão corretos no banco: tipo "Projeto", status Fechado, com os pontos gravados em `story_points` (S1 = 3, S2 = 4, S3 = 9) e técnico responsável definido.

As funções de Metas e MVP (`get_metas_tecnicos` e `get_mvp_chamados_metrics`) **já** contabilizam esses pontos — elas usam a pontuação da categoria e, quando não há categoria e o chamado é do tipo "Projeto", caem para o `story_points`.

O que está faltando é só a tela de Chamados: a coluna **Pts** e o card "Minha pontuação" leem exclusivamente as avaliações de pontuação (tipo "meta") do chamado. Como o chamado de sprint é fechado automaticamente e nunca recebe essa avaliação, a coluna mostra "—", mesmo com o badge "Projeto · 3 pts" aparecendo no modal.

## Correção

Na tela de Chamados, usar a mesma regra das Metas para exibir os pontos:

- Coluna **Pts** da listagem: se o chamado não tiver avaliação de pontuação e for do tipo "Projeto", mostrar o `story_points` do chamado (com o mesmo selo de troféu).
- Card **Minha pontuação** do mês: somar também os `story_points` dos chamados de sprint fechados no período, além das avaliações.

Nenhuma mudança no banco, nas funções de Metas/MVP nem no fluxo de encerramento de sprint.

## Detalhes técnicos

Arquivo: `src/pages/ChamadosTI.tsx`

- `scoreMap`: após montar o mapa a partir de `evaluations`, preencher os chamados restantes com `type === "Projeto"` usando `story_points` (o campo já vem em `useTickets`).
- `myScore`: somar `story_points` dos chamados de `closedByMe` com `type === "Projeto"` que não tenham avaliação.
- Nenhum outro componente afetado; validar com `bun run build`.

## Verificação

Na lista de Chamados de agosto, as linhas "S1 – Planejamento e Levantamento", "S2 – Implementação Core" e "S3 – Integração de Canal" devem exibir 3, 4 e 9 pts, e a soma refletir no card de pontuação do técnico — batendo com o valor já mostrado em Metas.
