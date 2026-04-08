

# Plano: Visualizacao Kanban na tela de Chamados

## Resumo
Adicionar um botao de alternancia (lista/kanban) na tela de Chamados. No modo kanban, os chamados aparecem em colunas por status com drag-and-drop para mudar o status.

## Mudancas

### 1. Instalar dependencia de drag-and-drop
- Instalar `@hello-pangea/dnd` (fork mantido do react-beautiful-dnd, compativel com React 18)

### 2. Criar componente `src/components/KanbanBoard.tsx`
- Colunas baseadas nos status: Aberto, Em Andamento, Aguardando Aprovacao, Aprovado, Fechado, Disponivel
- Cada coluna mostra cards com titulo, prioridade, solicitante e badge de status
- Cada card e clicavel (abre o detalhe do ticket)
- Ao arrastar um card para outra coluna, chama `useUpdateTicket` para atualizar o status
- Registra historico no `ticket_history` via insert
- Cores do header de cada coluna usando `statusBadgeColors` ja existente

### 3. Editar `src/pages/Chamados.tsx`
- Adicionar estado `viewMode: "list" | "kanban"` (default "list")
- Adicionar botao toggle ao lado do botao "Novo Chamado" com icones de lista e kanban (LayoutGrid / List)
- Quando `viewMode === "kanban"`, renderizar `<KanbanBoard>` no lugar das tabelas/grupos
- Passar `filtered` tickets e `onSelect` para o KanbanBoard
- O kanban recebe tambem a mutacao de update para mudar status ao soltar

### Detalhes tecnicos
- `@hello-pangea/dnd` fornece `DragDropContext`, `Droppable`, `Draggable`
- No `onDragEnd`, extrair `destination.droppableId` (novo status) e chamar update
- Cards mostram: titulo (truncado), badge de prioridade, nome do solicitante, data
- Colunas com scroll vertical e contador de chamados no header

