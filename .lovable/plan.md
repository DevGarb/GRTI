## Objetivo

Trazer de volta uma **Visão Geral rica** no detalhe do projeto, com cards de resumo e mini-dashboards visuais — mantendo a simplicidade já acordada (sem pontos/capacidade/eficiência/dashboards complexos).

---

## O que aparece hoje na Visão Geral

- Bloco da sprint ativa (com botão "Adicionar chamados").
- Bloco de descrição/datas (se preenchidos).
- Nada mais.

Faltam os **números do projeto** e a **comparação visual** entre sprints e backlog.

---

## O que vamos adicionar

### 1. Linha de KPIs (cards grandes, no topo)

Quatro cards lado a lado, lendo dados que já existem:

- **Chamados no projeto** — total + (concluídos)
- **Tarefas manuais** — total + (concluídas)
- **Sprints** — total + (ativas/planejadas/concluídas)
- **Progresso geral** — % concluído (chamados + tarefas) com barra

Sem pontos, sem velocidade, sem capacidade.

### 2. Sprint ativa (mantém, melhorada)

Cartão atual continua, com:
- Nome + meta + datas
- Barra de progresso
- Contagens (chamados/tarefas, concluídos)
- Botão "Adicionar chamados"
- **Novo:** linha "próxima sprint planejada" abaixo (se houver), com nome e contagem, link para abrir.

### 3. Mini-dashboards (2 cards lado a lado)

**a) Status dos chamados do projeto**
Lista compacta com contagem por status (Aberto, Em Andamento, Aguardando Aprovação, Resolvido, Fechado…), cada um com sua cor e barra proporcional. Reusa as cores já usadas no sistema.

**b) Distribuição por sprint**
Lista das sprints (mais recentes primeiro), cada linha com: nome, status (badge), barra de progresso e "X/Y concluídos". Permite bater o olho e ver onde o trabalho está concentrado.

### 4. Bloco "Sobre o projeto" (mantém)

Descrição + datas + responsável (`ownerName` já vem do hook). Só aparece se houver conteúdo.

---

## Layout proposto

```text
┌───────────────────────────────────────────────────────────┐
│ [Chamados] [Tarefas] [Sprints] [Progresso]   ← KPIs       │
├───────────────────────────────────────────────────────────┤
│ Sprint ativa  ............ [+ Adicionar chamados]         │
│ Próxima planejada: Sprint 4 (5 chamados)  →               │
├──────────────────────────────┬────────────────────────────┤
│ Status dos chamados          │ Distribuição por sprint    │
│ ▓▓▓▓ Em Andamento  12        │ Sprint 3 (ativa)  ▓▓▓ 60%  │
│ ▓▓ Aberto           5        │ Sprint 2 (concl)  ▓▓▓ 100% │
│ ▓ Resolvido         8        │ Sprint 1 (concl)  ▓▓▓ 100% │
├──────────────────────────────┴────────────────────────────┤
│ Sobre o projeto (descrição + datas + responsável)         │
└───────────────────────────────────────────────────────────┘
```

---

## Detalhes técnicos

**Arquivos**

- `src/pages/ProjetoDetalhe.tsx` — montar a nova Visão Geral usando dados que já vêm dos hooks.
- `src/components/projetos/ProjectOverview.tsx` *(novo)* — encapsular a aba para deixar o `ProjetoDetalhe` enxuto.

**Dados reutilizados (sem novas queries pesadas)**
- `useSprints(projectId)` → todas as sprints com `ticketCount`, `taskCount`, `completedTickets`, `completedTasks`, `donePct`, `status`.
- `useProjectTickets(projectId)` (sem filtro de sprint) → para o agrupamento por status.
- `useProjectTasks(projectId)` → contagem total/concluídas de tarefas manuais.
- `useProject(projectId)` → metadados + responsável (já carregado no agregado da listagem; aqui buscamos via `useProjects` `ownerName` ou expomos o nome via `useProject` se necessário — se for o caso, ajustamos `useProject` para trazer o nome do owner em uma query simples).

**Agregações (em memória, no componente)**
- KPIs: somatórios diretos das listas.
- Status dos chamados: `groupBy(status)` sobre `useProjectTickets`.
- Distribuição por sprint: já vem pronto do `useSprints`.

**UI**
- Reusa `card-elevated`, `Badge`, `Progress` já existentes.
- Cores de status: reutilizar o mapa já usado em `StatusBadge`/Kanban para manter consistência.
- Responsivo: KPIs em grid `grid-cols-2 md:grid-cols-4`; mini-dashboards em `grid-cols-1 md:grid-cols-2`.

**Sem mudanças no banco.** Nenhuma migration. Nenhum recálculo de pontos. Nenhum dashboard de eficiência/velocidade.

---

## O que continua FORA (conforme combinado)

- Capacidade da sprint / por técnico
- Story points / planejado vs entregue
- Velocidade / previsibilidade
- Histórico de planejamento
- Sugestão automática de chamados
