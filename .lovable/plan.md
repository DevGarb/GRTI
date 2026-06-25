## Problema

A aba **Chamados em Aberto** (`src/pages/ChamadosAbertos.tsx`) lista todos com `status IN ('Aberto', 'Disponível')`. Como agora ao atribuir um chamado o status permanece "Aberto" (apenas o `assigned_to` é preenchido), os chamados já atribuídos continuam aparecendo na lista.

## Correção

Em `src/pages/ChamadosAbertos.tsx`, filtrar a query para excluir chamados que já tenham `assigned_to` definido:

- Adicionar `.is("assigned_to", null)` na query.

Assim, somente chamados realmente sem técnico aparecem em "Chamados em Aberto". Quando alguém clicar em "Atribuir para mim" ou for atribuído via modal, o chamado sai imediatamente da lista (continua visível na aba normal de Chamados, agrupado pelo técnico).

Nenhuma outra aba/lógica é alterada.