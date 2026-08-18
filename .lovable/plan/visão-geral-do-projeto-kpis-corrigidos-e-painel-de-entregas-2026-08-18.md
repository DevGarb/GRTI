# Visão geral do projeto: KPIs corrigidos e painel de entregas por dev

## O problema

- "Progresso por sprints" mostra 0% porque conta apenas sprints inteiras concluídas (0 de 5), ignorando que 11 dos 22 itens já foram entregues.
- O card "Chamados" não serve neste contexto (projetos sem chamados vinculados).
- "Tarefas" e "Sprints" são informações que cabem em um card só.
- O card isolado "Conclusão do projeto" vira redundante depois dessa correção.
- "Entregas por desenvolvedor" está raso: só nome, itens, pontos e %.

## Nova faixa de KPIs (4 cards)

1. **Progresso do projeto** — percentual por itens concluídos (11/22 = 50%), com barra e a leitura por pontos logo abaixo (ex.: "50% por pontos · 11/22 pts").
2. **Backlog** — total de itens, com quebra: concluídos · em desenvolvimento · pendentes.
3. **Sprints** — total, com quebra: ativas · planejadas · concluídas, e o percentual de sprints fechadas como texto de apoio (não mais como "progresso do projeto").
4. **Pontos entregues** — pontos concluídos / total, com barra.

O card "Chamados" sai da faixa. O bloco "Status dos chamados" mais abaixo passa a aparecer só quando o projeto tiver chamados vinculados.
O card isolado "Conclusão do projeto" é removido (absorvido pelo KPI 1).

## Painel "Entregas por desenvolvedor" reformulado

Ocupa a largura inteira, em formato de tabela/linhas com estes indicadores por pessoa:

- Avatar com inicial + nome
- **Entregues**: itens concluídos e pontos
- **Participação**: % dos itens concluídos do projeto (barra) e % dos pontos
- **Em andamento**: quantos itens estão em "Em Desenvolvimento" com crédito/atribuição dessa pessoa
- **Última entrega**: data da última conclusão (formato BR)
- **Tempo médio de entrega**: média de dias entre a entrada em "Em Desenvolvimento" e a conclusão, quando o histórico permitir

Rodapé do painel com os totais do time (itens, pontos, devs ativos). Quando não houver nada concluído, mantém a mensagem vazia atual.

## Detalhes técnicos

- `src/hooks/useProjectDelivery.ts`: além do agregado atual, calcular por usuário `inProgress`, `lastDeliveryAt` e `avgLeadDays`, lendo `task_status_history` (transições para "Em Desenvolvimento" e "Concluído") já buscada hoje; e expor contagens globais por status (`pendentes`, `emDev`).
- `src/components/projetos/ProjectOverview.tsx`: refazer a grade de KPIs (remover `Chamados`, unir tarefas/sprints, trocar o cálculo de progresso), remover o card "Conclusão do projeto", e reescrever o painel de entregas por dev em largura total. Condicionar o bloco "Status dos chamados" a `tickets.length > 0`.
- Regra de crédito permanece: `credited_to` > quem moveu para "Concluído" > responsável.
- Sem mudanças de schema. `bun run build` ao final.
