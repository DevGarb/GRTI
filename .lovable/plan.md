## Problema
O modal "Atribuir chamado" (`AssignTicketModal`) usa `z-[60]`, mas o `PopoverContent` do calendário usa o z-index padrão do Radix (`z-50`), fazendo o calendário aparecer atrás do modal.

## Correção
Em `src/components/AssignTicketModal.tsx`, adicionar `className="z-[70] w-auto p-0"` ao `<PopoverContent>` do seletor de data de entrega, para que o popover do calendário fique acima do modal de atribuição.

Nenhuma outra alteração necessária — apenas ajuste de empilhamento (z-index) na camada de apresentação.