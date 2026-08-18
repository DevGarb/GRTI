# Devs em demanda de projeto no "Equipe Agora"

Hoje o painel de TV só olha para chamados: quem não tem chamado "Em Andamento" aparece como **Ocioso**. Desenvolvedores que estão tocando tarefas de sprint ficam sempre vermelhos.

## O que muda

- Uma tarefa de sprint em status **Em Desenvolvimento** passa a contar como demanda ativa da pessoa que fez essa mudança de status.
- No card da pessoa, além de "Fechados" e "Em andamento", aparece **Projetos: N** (tarefas em dev).
- O selo **Ocioso** só aparece quando a pessoa não tem chamado em andamento **e** não tem tarefa em dev.
- O tooltip (hover) do card ganha uma seção "Em desenvolvimento" listando os títulos das tarefas (até 12), junto das listas já existentes.

## Como identificar o dev responsável

As tarefas de projeto hoje não têm responsável preenchido (`assignee_id` está vazio em todas). A atribuição vem do histórico de status: cada mudança grava quem alterou. Regra: para cada tarefa que está atualmente em "Em Desenvolvimento", pega-se o autor da mudança mais recente para esse status. Se não houver registro de autor, a tarefa não é atribuída a ninguém (não some do sistema, apenas não conta no card).

## Detalhes técnicos

Edge function `supabase/functions/tv-dashboard/index.ts`:
- Buscar `project_tasks` da organização com `status = 'Em Desenvolvimento'` (id, title, assignee_id).
- Buscar em `task_status_history` os registros `new_status = 'Em Desenvolvimento'` desses `task_id`, ordenados por `changed_at`; usar o `changed_by` mais recente por tarefa. `assignee_id` tem prioridade quando existir.
- Agregar por usuário em `team_status`: novos campos `projects_in_dev` (número) e `project_titles` (até 12 títulos).
- `idle` passa a ser `in_progress === 0 && projects_in_dev === 0`.
- Ordenação da lista mantém não-ociosos primeiro.

Frontend `src/components/tv/TeamStatusPanel.tsx`:
- Novo contador "Projetos" no card (mesmo estilo dos existentes, cor distinta).
- Nova seção no HoverCard com os títulos das tarefas em dev.
- Tipagem do `team_status` atualizada em `src/pages/TvDashboard.tsx`.

Depois: deploy da edge function e `bun run build`.
