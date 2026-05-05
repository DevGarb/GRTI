## Objetivo

Garantir que técnicos (e admins) sempre enxerguem seus chamados ainda **pendentes** na página `Chamados`, mesmo quando o mês selecionado não é o mês de criação do chamado. Hoje, um chamado de Abril em "Em Andamento" some quando o usuário seleciona Maio — o que esconde trabalho ativo.

## Escopo

Apenas a página **Chamados** (`src/pages/Chamados.tsx`).

NÃO mexer em:
- Dashboard, Auditoria, Avaliações, Metas → continuam por `created_at` (integridade de métricas / safra do mês).
- `ChamadosAbertos.tsx` → já é fila pura, sem filtro de mês. Nada a fazer.

## Mudança

Em `src/pages/Chamados.tsx`, ajustar o filtro de listagem (linha ~221-232) para que chamados com **status pendente** ignorem o filtro de mês — exatamente como já é feito hoje para `Disponível`.

### Status considerados "pendentes" (sempre visíveis)

- `Aberto`
- `Em Andamento`
- `Aguardando Aprovação`
- `Disponível` (já tratado, mantém)

### Status que continuam respeitando o filtro de mês

- `Fechado`
- `Cancelado`
- (qualquer outro estado terminal)

Assim, ao selecionar Maio:
- Chamados de Abril ainda **Em Andamento** / **Aberto** / **Aguardando Aprovação** → aparecem.
- Chamados de Abril já **Fechados** → NÃO aparecem (esses são "histórico de Abril", correto não poluir Maio).
- Chamados de Maio → aparecem normalmente, em qualquer status.

## Detalhe técnico

Substituir, em `Chamados.tsx`:

```ts
const isDisponivel = t.status === "Disponível";
...
return matchSearch && matchStatus && (matchMonth || isDisponivel) && matchRework;
```

por:

```ts
const PENDING_STATUSES = ["Aberto", "Em Andamento", "Aguardando Aprovação", "Disponível"];
const isPending = PENDING_STATUSES.includes(t.status);
...
return matchSearch && matchStatus && (matchMonth || isPending) && matchRework;
```

A constante `PENDING_STATUSES` fica no topo do componente (ou logo antes do `filter`). Nenhuma outra lógica da página precisa mudar — a pontuação (`closedByMe`, `myScore`, `scoreMap`) já filtra explicitamente por `created_at` e `status === "Fechado"`, então continua intacta e correta.

## Resultado esperado

- Técnico em Maio com 3 chamados de Abril ainda em andamento → vê os 3 na lista de Maio, com badge de status normal.
- Quando ele fechar esses chamados em Maio, eles **somem** da view de Maio (porque foram criados em Abril e agora estão Fechados) e aparecem corretamente na view de Abril como Fechados.
- Métricas do Dashboard, Auditoria e pontuação de metas continuam idênticas — nenhuma delas usa esse filtro da página Chamados.

## Arquivos alterados

- `src/pages/Chamados.tsx` (1 trecho, ~3 linhas)
