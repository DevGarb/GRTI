
## Objetivo

Permitir cadastrar as 5 métricas (Chamados Fechados, Nota Média, Tempo Médio Resolução, Pontuação, Preventivas Realizadas) de um técnico/setor em um único formulário, e reformatar a listagem agrupando por pessoa/setor.

## Mudanças em `src/components/metas/GoalsManager.tsx`

### 1. Formulário "Nova Meta" → "Definir Metas"

Substituir o formulário atual (1 métrica por vez) por um formulário único:

- **Tipo**: Individual / Setor (mantém)
- **Alvo**: dropdown técnico ou input de setor (mantém)
- **Bloco de KPIs**: 5 campos numéricos em grade 2 colunas, um por métrica:
  - Chamados Fechados
  - Nota Média (/5, step 0.1)
  - Tempo Médio Resolução (h)
  - Pontuação (pts)
  - Preventivas Realizadas

Campos em branco/zero são ignorados. Ao salvar, dispara `createGoal.mutate` para cada métrica preenchida (em paralelo via `Promise.all`). Se já existir meta daquela métrica para o alvo no período, faz `update` em vez de `insert` (upsert manual).

Botão muda para "Salvar Metas" e mostra contador (`Salvando 3/5...`).

### 2. Listagem agrupada

Trocar a tabela "uma linha por métrica" por cards agrupados por alvo:

```text
┌─ Metas Individuais ───────────────────────────┐
│ ┌─ MARIA IZABELE LIMA ────────────[+ editar]─┐│
│ │ Chamados Fechados   50    [edit][del]      ││
│ │ Nota Média          4.95  [edit][del]      ││
│ │ TMR                 8h    [edit][del]      ││
│ │ Pontuação           170   [edit][del]      ││
│ │ Preventivas         10    [edit][del]      ││
│ └────────────────────────────────────────────┘│
│ ┌─ FELIPE AUGUSTO ──────...                    │
└───────────────────────────────────────────────┘
```

Cada card mostra nome do técnico/setor no header e grid 2-3 colunas com chip por métrica (ícone + label + valor + ações edit/delete inline). Botão "+ adicionar métrica" no header do card abre o form pré-preenchido com aquele alvo, listando só as métricas que ainda não existem.

Mesmo padrão para "Metas por Setor".

### 3. Pequenos ajustes

- Agrupar via `reduce` por `target_id` (ou `target_label` para setor).
- Mantém edição inline de valor e exclusão individual já existentes.
- Sem alterações em hooks (`useGoals`, mutations) nem na tabela `performance_goals`.

## Arquivos

- `src/components/metas/GoalsManager.tsx` — reescrita do form e da listagem.

Nenhuma migração ou mudança de backend.
