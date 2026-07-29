## Problema

Na aba Sprints, o botão "Converter em chamado" hoje faz duas coisas:
1. Cria um chamado já vinculado ao projeto e à sprint (`project_id` + `sprint_id` preenchidos).
2. Apaga a tarefa original (`project_tasks.delete`).

Como o chamado criado herda a sprint, ele reaparece na lista da sprint como um novo card — parecendo "duplicação" — e a tarefa desaparece.

## Objetivo

Ao converter, manter o card da tarefa na sprint **intacto** e criar um chamado **normal** (não vinculado ao projeto/sprint), que vai para o helpdesk como qualquer outro chamado.

## Alteração

Arquivo: `src/hooks/useProjectTasks.ts` → `useConvertTaskToTicket`

- No `insert` em `tickets`, remover `project_id` e `sprint_id` (chamado nasce solto no helpdesk).
- Remover o `delete` em `project_tasks` (a tarefa continua viva na sprint).
- Ajustar toast: "Chamado criado a partir da tarefa".
- Manter invalidação de `tickets` / `project-tickets`; a de `project-tasks` deixa de ser necessária mas não atrapalha — mantida por segurança.

Opcional (UX): atualizar o `title` do botão em `SprintItems.tsx` de "Converter em chamado (vincula à mesma sprint)" para "Criar chamado a partir desta tarefa" e o texto do diálogo de confirmação, já que a semântica muda.

## Fora de escopo

- Não altera schema do banco.
- Não cria vínculo reverso task↔ticket.
- Não mexe em nenhum outro fluxo de Projetos.

## Validação

`bun run build` ao final.
