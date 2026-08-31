# Projetos concluídos contando como meta

## Problema confirmado

Na aba **Metas**, o card "Projetos Entregues" mostra sempre 0. A consulta que alimenta esse card busca tarefas de projeto por uma coluna que não existe mais no banco (`assigned_to` — hoje as colunas são `assignee_id` e `credited_to`), então ela falha silenciosamente e o valor fica zerado. Além disso, a meta escolhida agora é contar **projetos concluídos**, e hoje um projeto concluído registra apenas quem clicou em "Concluir" (`completed_by`), sem permitir creditar vários membros da equipe.

Estado atual verificado: 8 projetos com status "Concluído" (todos com `completed_at` e `completed_by`) e nenhuma forma de atribuir crédito a mais de um membro.

## O que será feito

1. **Créditos de projeto (novo)** — cada projeto concluído pode ser creditado a um ou mais membros da equipe. Um projeto creditado a 2 pessoas conta 1 para cada uma no mês em que foi concluído.
2. **Atribuir na conclusão do projeto** — o modal "Concluir projeto" passa a ter um seletor de membros creditados (pré-preenchido com responsável e co-responsável do projeto). Na tela de detalhe/card do projeto concluído é possível editar os créditos depois.
3. **Painel de ajuste rápido na aba Metas** — uma seção "Projetos concluídos no mês" listando os projetos finalizados no período selecionado, com os membros creditados de cada um e edição inline (adicionar/remover pessoa). Serve para regularizar os projetos antigos que já estão fechados.
4. **Card "Projetos Entregues" passa a contar projetos** — a métrica `project_tasks_done` (rótulo já é "Projetos Entregues") passa a somar os projetos concluídos no mês creditados ao membro, em vez da contagem quebrada de tarefas. Vale para a visão do admin e para "Minhas Metas" do técnico.
5. **Fallback para projetos sem crédito** — enquanto ninguém for creditado, o projeto conta para `completed_by`, para nada ficar órfão.

## Detalhes técnicos

- Nova tabela `public.project_credits` (`project_id`, `user_id`, `organization_id`, `created_at`, único por projeto+usuário), com GRANTs para `authenticated`/`service_role`, RLS ativa e políticas escopadas pela organização (mesmo padrão de `projects`): leitura para membros da org, escrita para admin/desenvolvedor.
- Novo hook `useProjectCredits` (listar por período/projeto, adicionar, remover) com invalidação das queries `projects`, `project`, `metas-tecnicos`.
- `CompleteProjectModal.tsx`: seletor múltiplo de membros; grava os créditos junto com a conclusão.
- `MetasTecnicos.tsx`: substituir o bloco que consulta `project_tasks` por uma consulta de `projects` concluídos no mês + `project_credits`, montando `projectTasksDone` por usuário (com fallback em `completed_by`).
- Novo componente `ProjetosConcluidosCreditos.tsx` renderizado na aba Desempenho das Metas (visível só para admin), usando o mesmo ano/mês do filtro de período.
- Regenerar os tipos do banco após a migração.
