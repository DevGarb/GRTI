## Objetivo

Agrupar a TODO List por usuário (autor), com dropdowns expansíveis — mesmo padrão visual usado na aba **Chamados** (admin view), onde cada técnico vira uma linha clicável que expande mostrando seus itens.

## Mudanças

### `src/pages/Todos.tsx` (refatorar layout)

Substituir as duas colunas atuais (Pendentes / Concluídos lado a lado) por uma **lista vertical de pessoas**, cada uma com dropdown:

```text
[v] GABRIEL PORTO          [Pendentes: 5] [Concluídos: 2]
    ├─ Pendentes
    │   ( ) Refatorar fluxo NPS
    │   ( ) Corrigir album do ADMIN
    └─ Concluídos
        (x) Tarefa antiga

[>] VICTOR HUGO            [Pendentes: 1]
```

Detalhes:
- Agrupar `todos` por `user_id` → usar `author_name` / `author_avatar` no header.
- Header clicável (mesmo estilo de `Chamados.tsx` linhas 448-475): chevron, avatar, nome em uppercase, contadores como badges (Pendentes em azul/âmbar, Concluídos em verde).
- Estado `expandedUser` (string | null) — apenas um aberto por vez, igual em Chamados.
- Dentro do expand, manter o split em duas mini-seções: **Pendentes** (acima) e **Concluídos** (abaixo, recolhível ou só listado), reutilizando o componente `TodoRow` já existente.
- Ordenar grupos: usuário logado primeiro, depois alfabético.
- Manter busca global (filtra antes de agrupar — esconde grupos vazios).
- Manter botão "Novo TODO" e modal de detalhes inalterados.

### Sem mudanças em

- `useTodos.ts` (RLS já garante visibilidade correta por papel)
- `TodoRow.tsx`, `NewTodoModal.tsx`, `TodoDetailModal.tsx`
- Banco / migrations

## Notas

- Para colaborador, normalmente só verá o próprio grupo (RLS), então o accordion fica natural.
- Avatar no header usa `Avatar` do shadcn com fallback nas iniciais (mesmo padrão de `TodoRow`).