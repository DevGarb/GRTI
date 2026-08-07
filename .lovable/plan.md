# Sprints e backlogs do projeto ALERTAS PROTRACK

Cadastrar, via migração de dados no banco, as 5 sprints do projeto ALERTAS PROTRACK (que hoje não tem nenhuma sprint nem tarefa) e criar os 22 itens de backlog já vinculados à sprint correta.

## Sprints a criar

| Sprint | Nome | Início | Fim | Backlogs |
|---|---|---|---|---|
| 1 | Validar e estabilizar a Fase 1 | 09/08/2026 | 09/08/2026 | 1–6 |
| 2 | Escalar para a frota completa | 10/08/2026 | 11/08/2026 | 7–11 |
| 3 | Regras de triagem (preparação da Fase 2) | 12/08/2026 | 15/08/2026 | 12–16 |
| 4 | Integração WhatsApp | 17/08/2026 | 19/08/2026 | 17–20 |
| 5 | Validação e Go-live | 20/08/2026 | 20/08/2026 | 21–22 |

Todas nascem com status "planejada" (nenhuma é ativada automaticamente).

## Backlogs

Os 22 itens são criados em `project_tasks` com o título e a descrição exatos enviados, status "Pendente", prioridade "Média", 1 story point cada, sem responsável, vinculados ao projeto e à sprint correspondente. A data planejada de cada item recebe a data final da sua sprint.

## Detalhes técnicos

- Insert em `public.sprints` (project_id `f08e68af-...`, organization_id do projeto, created_by = criador do projeto) e depois em `public.project_tasks` referenciando as sprints por nome.
- Nenhuma alteração de schema, RLS ou código de frontend; apenas dados.
- Após rodar, os itens aparecem no Backlog e nas Sprints do módulo Projetos.

## Pontos a confirmar

- Responsável (assignee) e story points ficam em branco/1 por padrão — se quiser atribuir alguém ou pontuar diferente, é só dizer.
