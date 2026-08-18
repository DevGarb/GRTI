# Progresso do projeto e produtividade por desenvolvedor

Objetivo: mostrar, na Visão geral do projeto, quanto do projeto já foi entregue (%) e quanto cada desenvolvedor entregou, somando backlogs concluídos em todas as sprints do projeto.

## O que será entregue

### 1. Percentual de conclusão do projeto
Novo card "Conclusão do projeto" na Visão geral, com duas leituras lado a lado:
- **Por itens**: backlogs concluídos / total de backlogs do projeto.
- **Por pontos**: story points concluídos / total de story points.

Barra de progresso usando a leitura por itens, com o valor em pontos como detalhe abaixo.
Escopo: apenas tarefas de backlog (`project_tasks`) do projeto — chamados vinculados continuam nos cards atuais e não entram nesse cálculo.
Concluído = status "Concluído".

### 2. Quantitativo por desenvolvedor
Novo painel "Entregas por desenvolvedor" na Visão geral, listando cada pessoa com:
- nome e inicial em avatar;
- nº de backlogs concluídos e soma de story points;
- % da entrega total do projeto (participação), com mini-barra.

Ordenado do maior para o menor. Exemplo do cenário citado: 2 devs com 5 backlogs cada aparecem com 5 itens e 50% cada.

### 3. Regra de crédito (quem entregou)
Prioridade, na ordem:
1. **Crédito manual** — se alguém foi atribuído explicitamente como responsável pela entrega daquele backlog.
2. **Quem concluiu** — último usuário que moveu a tarefa para "Concluído" (histórico de status).
3. **Responsável da tarefa** (assignee), se nenhum dos anteriores existir.
4. Sem nenhum: agrupado como "Não atribuído".

### 4. Atribuir crédito manualmente
No item da sprint e no card do backlog, um menu permite "Atribuir entrega a…", escolhendo entre os técnicos/desenvolvedores da organização, ou limpar para voltar ao automático. O painel de entregas por dev atualiza na hora.

## Detalhes técnicos

- **Banco**: nova coluna `credited_to uuid` em `project_tasks` (nullable, sem FK dura para auth). Sem mudança de RLS — as policies atuais de `project_tasks` já cobrem update pela equipe da organização.
- **Hook novo** `useProjectDelivery(projectId)`: junta `project_tasks` do projeto + `task_status_history` (últimas transições para "Concluído") + nomes de `profiles` (fallback `get_org_technicians`), e devolve `{ totalTasks, doneTasks, totalPoints, donePoints, pctItems, pctPoints, byDev[] }`.
- **UI**: `ProjectOverview.tsx` ganha o card de conclusão e o painel por desenvolvedor; `SprintItems.tsx` e `BacklogKanban.tsx` ganham a ação de atribuir crédito, reaproveitando o padrão do `TaskAuthorBadge`.
- **Cache**: mutations de tarefa invalidam a nova query `["project-delivery", projectId]` junto com `project-tasks`/`backlog`.
- Nenhuma alteração nas regras de pontuação de sprint, metas ou MVP.
