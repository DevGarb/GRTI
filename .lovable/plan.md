## Objetivo

Hoje o botão `ArrowRightCircle` em `SprintItems.tsx` chama `useConvertTaskToTicket`, que insere uma linha em `tickets`. Como a tarefa continua no projeto e o novo ticket também aparece vinculado à sprint (via `useProjectTickets`), o card acaba duplicado na tela.

A nova regra: o botão **não cria mais chamado**. Ele apenas marca a tarefa como "convertida" e passa a exibir as mesmas flags visuais que um ticket de projeto tem hoje (badges `Projeto` · `<Prioridade>` · `<Status>`), mantendo o card único dentro da sprint.

## Mudanças

### 1. Banco — `project_tasks`
Adicionar duas colunas opcionais para armazenar as flags que hoje só existiam em `tickets`:

- `converted_to_ticket boolean not null default false` — controla se a badge "Projeto" aparece.
- `priority text` — armazena prioridade escolhida no momento da conversão (default "Média" quando a flag é ligada).

Sem RLS nova (a tabela já tem policies). Sem migração de dados: registros antigos ficam `false`/`null`.

### 2. Hook `useConvertTaskToTicket` (`src/hooks/useProjectTasks.ts`)
Trocar a implementação: em vez de `insert` em `tickets`, faz `update` em `project_tasks` setando `converted_to_ticket = true` e `priority = 'Média'` (se ainda estiver nulo). Invalida `["project-tasks"]` e `["sprints"]`. Toast: "Flags aplicadas à tarefa".

Também expor a coluna nova em `ProjectTask` (interface TS) — `converted_to_ticket: boolean`, `priority: string | null`.

### 3. Renderização em `SprintItems.tsx`
No bloco `tasks.map(...)`:
- Quando `task.converted_to_ticket === true`, exibir ao lado do título as mesmas 3 badges usadas hoje para tickets:
  - `Projeto` (badge roxa)
  - `task.priority ?? "Média"` (badge outline)
  - `task.status` (badge — verde quando estiver em `Concluído`/`Fechado`/`Aprovado`/`Aguardando Aprovação`, seguindo a paleta atual dos tickets)
- Manter o ícone `ListTodo` (não virar `TicketIcon`) para deixar claro que ainda é tarefa.
- Botão `ArrowRightCircle`: mantém o mesmo lugar/estilo. Se `converted_to_ticket` já for `true`, esconde o botão (ou desabilita com tooltip "Flags já aplicadas") para não repetir a ação.
- Diálogo de confirmação: reaproveitar, mudar textos para "Aplicar flags de chamado à tarefa" / "As flags Projeto, Prioridade e Status passarão a aparecer neste card. Nenhum chamado será criado."

Nada muda no bloco `tickets.map` — chamados de verdade (vinculados via `useProjectTickets`) continuam sendo mostrados normalmente.

### 4. Sem efeitos colaterais
- Nenhuma alteração em `useProjectTickets`, RPCs de fechamento de sprint, cálculo de pontos ou métricas.
- Chamados criados por conversões antigas continuam existindo; se quiser limpar depois, é ação manual separada.

## Validação
- `bun run build`.
- Conferir visualmente: aplicar flag em uma tarefa mostra as 3 badges e não cria linha em `tickets`; segundo clique fica bloqueado.
