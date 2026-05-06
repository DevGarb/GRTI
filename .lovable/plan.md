## Simplificar TODO List

Transformar a lista atual (cards com prioridade/status/ações múltiplas) em uma lista enxuta, em cascata, dividida em duas colunas: **Pendentes** | **Concluídos**.

### Mudanças

**1. Criação de TODO (`NewTodoModal.tsx`)**
- Apenas o **título** continua obrigatório.
- **Descrição**, **prioridade** e **prazo** passam a ser opcionais (sem validação, sem default visual obrigatório).
- Manter o modal simples; campos opcionais ficam recolhidos ou claramente marcados como "(opcional)".

**2. Página `Todos.tsx`**
- Remover o agrupamento por autor em cards.
- Layout em **duas colunas** (grid 50/50, vira 1 coluna no mobile):
  - Esquerda: **Pendentes** (status `pendente` + `andamento` unificados como "não concluído").
  - Direita: **Concluídos** (status `concluido`).
- Cada coluna lista os TODOs em **cascata** (linhas empilhadas, não cards), separados por divisórias sutis.
- Cabeçalho de cada coluna mostra contagem.
- Para staff (admin/técnico/dev), mostrar pequeno avatar/nome do autor inline em cada linha (mantém visibilidade cruzada já existente).

**3. Substituir `TodoCard.tsx` por `TodoRow.tsx`**
- Linha enxuta com:
  - **Checkbox** à esquerda → marca/desmarca conclusão (toggle direto entre `pendente` ↔ `concluido`).
  - **Título** (riscado quando concluído).
  - Indicadores opcionais à direita só aparecem se preenchidos: data do prazo, badge de prioridade discreta.
  - Ícone de comentário (abre modal de detalhe existente).
  - Botão lixeira (apenas para o dono).
- Sem botões "Iniciar/Concluir/Reabrir" — o checkbox cobre tudo.
- Clique na linha (fora do checkbox/lixeira) abre o `TodoDetailModal` para comentários/histórico.

**4. Hook `useTodos.ts`**
- Adicionar helper `setCompleted(todo, boolean)` que define `status` para `concluido`/`pendente` e atualiza `completed_at`.
- Manter `toggleStatus` legado se necessário para compatibilidade ou remover.

**5. Sem mudanças em**
- Banco de dados (`user_todos`, comentários, histórico, RLS): inalterados.
- Permissões de menu, rota, visibilidade entre papéis: inalterados.
- Modal de detalhe (`TodoDetailModal`): inalterado.

### Resultado visual

```text
┌─────────────────────────────┬─────────────────────────────┐
│ Pendentes (4)               │ Concluídos (12)             │
├─────────────────────────────┼─────────────────────────────┤
│ ☐ Revisar contrato          │ ☑ Atualizar firewall        │
│ ☐ Trocar HD do servidor 🔴  │ ☑ Backup mensal             │
│ ☐ Ligar para fornecedor     │ ☑ Reset senha João          │
│ ☐ Documentar API   📅 10/05 │ ...                          │
└─────────────────────────────┴─────────────────────────────┘
```
