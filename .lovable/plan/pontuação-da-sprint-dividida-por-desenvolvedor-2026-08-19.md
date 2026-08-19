# Pontuação da sprint dividida por desenvolvedor

Hoje, ao encerrar uma sprint, o sistema gera **1 único chamado-crédito** para o "técnico responsável pela entrega" com **todos** os pontos da sprint. Se Victor fez 4 itens e Danilo 2, o total vai inteiro para uma pessoa só.

A mudança: distribuir os pontos entre quem realmente entregou cada item.

## Como vai funcionar

No modal "Encerrar (checklist)" aparece uma nova seção **Divisão da pontuação**:

- Lista automática de cada participante com a soma dos pontos dos itens que ele entregou.
  Exemplo da Sprint 1 (6 itens, 12 pontos): Victor 8 pts (4 itens) · Danilo 4 pts (2 itens).
- Cada linha mostra quantidade de itens, pontos e um campo de pontos **editável**, caso o admin queira ajustar manualmente.
- Um totalizador avisa se a soma editada ficar diferente do total da sprint.
- Itens sem responsável definido ficam em "Sem responsável" e o admin escolhe para quem creditar antes de encerrar.

Ao confirmar o encerramento, o sistema cria **um chamado-crédito por desenvolvedor**, cada um com os seus pontos e a lista dos itens que ele entregou na descrição. Isso reflete automaticamente em Metas, MVP e nos indicadores do módulo T.I, que já leem os pontos desses chamados.

Ao **reabrir** a sprint, todos os chamados-crédito daquela sprint são removidos (hoje remove só um), evitando pontuação duplicada.

O campo "Técnico responsável pela entrega" continua existindo como responsável formal da sprint e recebe, por padrão, os itens sem autoria.

## Detalhes técnicos

- **Autoria do item**: `project_tasks.credited_to` quando preenchido, senão `assignee_id`; para chamados da sprint (`tickets` com `type <> 'Projeto'`), `assigned_to`.
- **Pontos por pessoa**: soma do `story_points` de cada item atribuído a ela (não é divisão igualitária — cada item vale o que já está cadastrado).
- **RPC `close_sprint_with_checklist`**: novo parâmetro opcional `_credits jsonb` (`[{user_id, points}]`). Quando enviado, valida que a soma bate com o total da sprint e cria um chamado-crédito por entrada. Quando ausente, mantém o comportamento atual (1 chamado para `_finished_by`) para não quebrar chamadas existentes. Assinatura antiga preservada via parâmetro com default.
- **RPC `reopen_sprint_and_clear_credit`**: passa a apagar todos os tickets `type = 'Projeto'` da sprint (filtro por `sprint_id`, sem depender do título igual ao nome da sprint).
- **UI**: nova seção no `SprintCloseDialog` em `src/pages/projetos/ProjetosSprints.tsx`, com query que carrega itens da sprint (tarefas + chamados) com autor e pontos, agrupando por pessoa.
- Sem alteração nas RPCs de metas/MVP — elas já somam os `story_points` dos chamados do tipo `Projeto`.
