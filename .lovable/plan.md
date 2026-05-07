## Objetivo
Transformar a tela de TODOs em uma visão diária, mantendo todo o histórico no banco. Por padrão mostra os pendentes (todos, independente da data) + concluídos de hoje. Um botão "Histórico" dá acesso ao restante.

## Comportamento

**Aba "Hoje" (padrão)**
- Pendentes: todos (não somem com o tempo, continuam visíveis até serem concluídos).
- Concluídos: apenas os concluídos hoje (filtrado por `completed_at` no dia atual).
- Mantém o agrupamento por usuário com accordion já existente.

**Aba "Histórico"**
- Mostra todos os concluídos (sem filtro de data) agrupados por usuário.
- Inclui um seletor opcional de período (data início / data fim) para filtrar.
- Pendentes não aparecem aqui (eles vivem na aba Hoje).

**Sem perda de dados**
- Nenhuma alteração de schema ou exclusão. `user_todos` já tem `completed_at`, `status` e `created_at` — apenas filtramos no front.

## Mudanças técnicas

**`src/pages/Todos.tsx`**
- Adicionar `Tabs` (shadcn) com "Hoje" e "Histórico".
- Filtrar `todos` antes de agrupar, conforme a aba ativa:
  - Hoje: `status !== 'concluido'` OR (`status === 'concluido'` AND `completed_at` no dia atual).
  - Histórico: `status === 'concluido'` (com filtro opcional de intervalo de datas).
- Ajustar os contadores nos badges do header de cada usuário para refletirem a aba atual.
- Export TXT respeita a aba ativa.

**`src/hooks/useTodos.ts`**
- Sem mudanças. Já retorna todos os registros do usuário/staff.

## Estrutura visual

```text
[ Hoje ] [ Histórico ]

(Hoje)
v USER             [Pendentes: 5] [Concluídos hoje: 2]
   Pendentes (5)   ...
   Concluídos hoje (2) ...

(Histórico)
[ Data início ] [ Data fim ]  (opcional)
v USER             [Concluídos: 47]
   ...
```

## Arquivos a editar
- `src/pages/Todos.tsx`
