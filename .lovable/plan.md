## Problema atual

O toast "Cannot coerce the result to a single JSON object" aparece ao tentar mover uma tarefa de "A fazer" para "Concluída" porque a política de UPDATE de `project_tasks` exige `admin`. Para qualquer outro usuário o UPDATE retorna 0 linhas e o `.single()` no hook quebra. Além disso, o usuário quer transformar a tarefa de backlog em um chamado real, mantendo o vínculo com o projeto e a sprint.

## O que vamos fazer

### 1. Banco (RLS de `project_tasks`)
- Substituir a policy de UPDATE para permitir que qualquer membro da organização do projeto altere os campos da tarefa (status, pontos, sprint). Admin/dev/super_admin continuam podendo tudo.
- Manter DELETE restrito a admin/desenvolvedor (como hoje).

### 2. Conversão "backlog → chamado" (admin)
- Adicionar um botão **"Converter em chamado"** na linha de cada tarefa em `SprintItems.tsx`, visível apenas para `admin`/`desenvolvedor`.
- Ao clicar:
  1. Cria um registro em `tickets` com:
     - `title` = título da tarefa
     - `description` = descrição da tarefa
     - `priority` = "Média", `type` = "Software", `status` = "Aberto"
     - `organization_id` = organização do projeto
     - `project_id` = id do projeto
     - `sprint_id` = sprint atual da tarefa (preserva o vínculo, inclusive backlog = null)
     - `story_points` = pontos da tarefa
     - `created_by` = usuário atual
  2. Exclui a tarefa de `project_tasks` (ela "vira" o chamado).
  3. Invalida queries de tickets/tasks/sprints/projects.

### 3. Badge "Projeto" no chamado
- Em `SprintItems.tsx` (linha do ticket) e onde for trivial reaproveitar, adicionar um badge roxo **"Projeto"** quando `project_id` estiver preenchido — deixa claro na lista da sprint que o item nasceu como tarefa do projeto.
- (Listagens do helpdesk fora deste escopo continuam como estão; o vínculo já é visível pelo `project_id`.)

### 4. Robustez do hook
- Em `useUpdateProjectTask`, trocar `.select().single()` por `.select().maybeSingle()` e tratar `null` como sucesso silencioso, evitando o erro de coerção mesmo em casos de borda.

## Arquivos afetados

- Migration nova: policy de UPDATE de `public.project_tasks`.
- `src/hooks/useProjectTasks.ts` — `maybeSingle` + novo hook `useConvertTaskToTicket`.
- `src/components/projetos/SprintItems.tsx` — botão "Converter em chamado" (admin) e badge "Projeto" na linha de ticket.

## Validação
- Usuário comum muda status da tarefa sem erro.
- Admin vê botão de conversão; ao clicar, a tarefa desaparece e surge um chamado na mesma sprint com badge "Projeto".
- Admin consegue abrir o chamado pelo botão de link já existente.
