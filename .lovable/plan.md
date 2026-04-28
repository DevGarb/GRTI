# Confirmação Sim/Não nos botões críticos do chamado

## Diagnóstico do "anexo virou resolvido"

Investiguei o fluxo completo de anexos e o status do chamado:

- O componente de anexar arquivos (`TicketComments.tsx`) **apenas insere comentários**, nunca altera o status do chamado.
- Não existem **triggers no banco** que mudem status ao inserir comentário/anexo (verificado: só `validate_ticket_sprint_project` e `update_updated_at_column`).
- O único caminho para o chamado ir para **"Aguardando Aprovação"** é:
  1. Clique no botão **"Finalizar Atendimento"** (técnico), ou
  2. Arrastar o card no Kanban da coluna *Em Andamento* → *Aguardando Aprovação*.

**Causa mais provável**: clique acidental no botão *Finalizar Atendimento*, que fica logo acima da área de comentários/anexos e não pede nenhuma confirmação. Hoje só o botão *Excluir Chamado* tem `confirm()` nativo do navegador (feio e fácil de pular).

A solução pedida (alerts de confirmação) elimina exatamente esse risco.

## O que vai mudar

Vou substituir cliques diretos por um `AlertDialog` (shadcn) padronizado, com botões **"Sim, confirmar"** e **"Não, cancelar"**, em três ações destrutivas/irreversíveis:

| Botão | Quem vê | Texto da confirmação |
|---|---|---|
| **Finalizar Atendimento** | Técnico em chamado *Em Andamento* | "Tem certeza que deseja finalizar este atendimento? O chamado será enviado ao solicitante para aprovação." |
| **Excluir Chamado** | Admin (rodapé do modal) | "Tem certeza que deseja excluir este chamado? Esta ação não pode ser desfeita." |
| **Confirmar Reprovação (Retrabalho)** | Solicitante em *Aguardando Aprovação* | "Tem certeza que deseja reprovar e devolver para retrabalho? O técnico será notificado." |

Comportamento:
- Modal centralizado, escurece o fundo, fecha com ESC ou no botão "Não".
- Botão "Sim" usa cor destrutiva no caso de Excluir e Retrabalhar; cor primária em Finalizar.
- Nada acontece até o usuário confirmar — se clicar fora ou em "Não", a ação é descartada.

## Arquivos afetados

- **`src/components/TicketDetailModal.tsx`** (único arquivo)
  - Importar `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogTrigger` de `@/components/ui/alert-dialog` (já existe no projeto).
  - Envolver os 3 botões com `AlertDialogTrigger asChild` e renderizar o `AlertDialogContent` correspondente.
  - Remover o `confirm(...)` nativo do botão Excluir.
  - Não mudar nenhuma lógica de negócio, hooks, RLS, queries ou edge functions.

## Fora do escopo

- Não altero o KanbanBoard (drag-and-drop continua mudando status sem confirmação — se quiser, abro como melhoria separada).
- Não altero o componente de comentários/anexos (já confirmado que não muda status).
- Não mexo em status legados (`Disponível`) nem na lógica de SLA.

Posso prosseguir?