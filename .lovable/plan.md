# Exclusão em massa de chamados (Admin)

Adicionar à aba **Chamados** uma forma do admin selecionar vários chamados via checkbox e excluí-los de uma só vez. O recurso fica **invisível para não-admins**.

## Comportamento (visão do usuário)

- Apenas usuários com papel **Admin** (ou Super Admin) veem:
  - Um botão "Selecionar" no topo da lista, que liga/desliga o modo de seleção.
  - Quando ativado: uma coluna de checkbox aparece em cada linha da tabela + um checkbox "selecionar todos" no cabeçalho de cada grupo de técnico.
  - Uma **barra de ação fixa** no rodapé/topo mostrando "X chamados selecionados" com botão **Excluir selecionados** (vermelho) e **Cancelar**.
- Ao clicar em "Excluir selecionados": modal de confirmação ("Excluir N chamados? Esta ação não pode ser desfeita.") com botão de confirmação destrutivo.
- Após exclusão: toast de sucesso, lista atualizada, modo de seleção é desligado.
- Disponível apenas no modo **Lista** (no Kanban não faz sentido marcar checkboxes — botão "Selecionar" fica oculto no modo Kanban).
- Clique em checkbox **não** abre o modal de detalhes do chamado (stopPropagation).

## Implementação técnica

**Arquivos a alterar:**

1. `src/hooks/useTickets.ts`
   - Novo hook `useBulkDeleteTickets()` — recebe `string[]` de IDs, executa `supabase.from("tickets").delete().in("id", ids)`, invalida `["tickets"]`, retorna contagem para o toast.

2. `src/pages/Chamados.tsx`
   - Novo estado: `selectionMode: boolean`, `selectedIds: Set<string>`.
   - Botão "Selecionar" no header (ao lado de Lista/Kanban), renderizado só se `isAdmin && viewMode === "list"`.
   - Passar para `TicketTable` props opcionais: `selectionMode`, `selectedIds`, `onToggleSelect(id)`, `onToggleSelectAll(ids)`.
   - `TicketTable`: quando `selectionMode`, renderiza `<th>` e `<td>` com `<Checkbox>` (de `@/components/ui/checkbox`); checkbox no `<th>` marca/desmarca todos os tickets daquele grupo (indeterminate quando parcial).
   - Linha não dispara `onSelect` se o clique veio do checkbox (`e.stopPropagation` no `onClick` da célula).
   - Barra de ação fixa (sticky bottom-4) quando `selectedIds.size > 0`: card com contador + botões Cancelar/Excluir.
   - Confirmação via `AlertDialog` (`@/components/ui/alert-dialog`) antes de chamar o hook.
   - Após sucesso: `setSelectedIds(new Set())` e `setSelectionMode(false)`.

**RLS:** as políticas atuais de `DELETE` em `tickets` já permitem admin da organização excluir — não há migration necessária. Caso a migration falte, será detectada no primeiro teste e tratada como follow-up.

**Segurança:** o botão é apenas escondido no front; o backend (RLS) é a fonte de verdade — não-admins recebem erro do Supabase se tentarem via console.

## Fora de escopo

- Exclusão em massa em outras telas (Chamados em Aberto, Histórico).
- Exclusão em massa no modo Kanban.
- Exportar antes de excluir / lixeira / undo.
