## Objetivo

Adicionar classificação no estilo **Matriz de Eisenhower** ao módulo TODO List, com nova prioridade "sem prioridade" e uma visão de matriz (4 quadrantes) além da visão atual.

## O que muda

### 1. Novo campo de prioridade

- Valores: `alta`, `media`, `baixa`, `sem` (nova opção "sem prioridade")
- Aplicado no modal de criação e edição

### 2. Novo campo "Quadrante de Eisenhower"

Selecionável ao criar/editar TODO, com 4 opções:

- **I — Urgente e Importante** (Faça agora — Crises) — vermelho
- **II — Não Urgente e Importante** (Planeje/Agende — Foco) — laranja
- **III — Urgente e Não Importante** (Delegue — Interrupções) — verde
- **IV — Não Urgente e Não Importante** (Elimine — Distrações) — cinza

Campo é opcional (TODOs antigos ficam sem quadrante).

### 3. Nova aba "Matriz" na página de TODOs

Além de **Hoje** e **Histórico**, adicionar aba **Matriz** que renderiza um grid 2x2 com os 4 quadrantes, mostrando os TODOs do usuário logado em cada um (estilo da referência iOS enviada). Sem quadrante = exibido em uma seção separada abaixo.

### 4. Banco de dados

Migration na tabela `user_todos`:

- Permitir valor `sem` no enum/check de `priority` (ou mudar para texto livre validado)
- Adicionar coluna `eisenhower_quadrant` (smallint, nullable, valores 1–4)

### 5. UI/Componentes alterados

- `NewTodoModal.tsx` — adicionar opção "Sem prioridade" e selector de quadrante
- `TodoDetailModal.tsx` — exibir/editar quadrante e nova prioridade
- `TodoRow.tsx` — badge do quadrante (I/II/III/IV colorido)
- `useTodos.ts` — incluir `eisenhower_quadrant` no insert/update e tipo
- `Todos.tsx` — nova aba "Matriz" com grid 2x2

## Detalhes técnicos

```text
user_todos
├─ priority: text  (alta | media | baixa | sem)
└─ eisenhower_quadrant: smallint NULL  (1 | 2 | 3 | 4)
```

Visão Matriz (layout):

```text
┌──────────────────────┬──────────────────────┐
│ I  Urgente+Important │ II  Importante       │
│   (Faça agora)       │   (Planeje)          │
├──────────────────────┼──────────────────────┤
│ III Urgente          │ IV  Nem/Nem          │
│   (Delegue)          │   (Elimine)          │
└──────────────────────┴──────────────────────┘
```

## Validação após implementar

1. Criar TODOs com cada uma das 4 prioridades novas e cada quadrante.
2. Conferir aba Matriz: cards aparecem no quadrante correto.
3. Editar TODO existente e mover entre quadrantes.
4. TODOs antigos (sem quadrante) continuam visíveis em Hoje/Histórico.
5. Build sem erros de tipo.