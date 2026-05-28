## Objetivo

Aumentar a altura da lista de categorias (árvore) dentro do bloco "Pontuar Técnico" no modal de detalhes do chamado, para mostrar mais itens sem precisar rolar tanto.

## Alteração

Arquivo: `src/components/TicketDetailModal.tsx` (linha 108, dentro de `CategoryTreePicker`)

- Trocar `max-h-48` (192px) por `max-h-96` (384px), dobrando a área visível da árvore de categorias.
- Nenhuma outra mudança de estilo, comportamento ou lógica.

## Fora do escopo

- Mudanças em outros modais ou no fluxo de pontuação.
- Ajustes no tamanho do modal geral ou no textarea de comentário.
