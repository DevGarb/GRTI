# Identificar chamados já vinculados a sprints

## Problema confirmado

No modal **"Adicionar chamados"** (ex.: sprint destino *Automações CearaGPS*), aparecem chamados que **já estão vinculados a outras sprints ativas** do mesmo projeto MANYCHAT (*Automações CRX*, *Automação - Resolve*) — sem nenhuma indicação visual. O usuário corre o risco de mover/duplicar trabalho que já está alocado.

Verificação no banco confirma: vários chamados `[Manychat] - ...` listados como "disponíveis" no modal já têm `sprint_id` preenchido apontando para outra sprint do mesmo projeto.

A causa é o filtro em `AddTicketsToSprintModal.tsx` (linha 89): ele só esconde os chamados que já estão **na sprint selecionada** — qualquer outra sprint do projeto passa despercebida.

## Solução

Manter os chamados visíveis (o usuário pode querer movê-los entre sprints), mas **rotular claramente** quando já estão em outra sprint, e oferecer um filtro para esconder os já alocados.

### Mudanças em `src/components/projetos/AddTicketsToSprintModal.tsx`

1. **Buscar nomes das sprints do projeto** (já disponível via `useSprints(projectId)`) e montar um `Map<sprintId, sprintName>`.

2. **Badge de sprint atual** ao lado do título do chamado, quando `t.sprint_id` existir e for diferente da sprint destino selecionada:
   - Exibir `Badge` com texto `Sprint: <nome>` (cor âmbar/warning).
   - Exibir `Badge` com texto `Backlog` (cor neutra) quando `project_id` é igual ao atual mas `sprint_id` é `null` e o destino é uma sprint.

3. **Toggle de filtro "Ocultar já vinculados"** na barra de filtros:
   - Quando ativo, esconde chamados onde `sprint_id != null && sprint_id != sprintIdSelecionada`.
   - Padrão: **ligado** (comportamento mais seguro).

4. **Tooltip/aviso ao selecionar** um chamado já vinculado a outra sprint:
   - Texto sutil abaixo do título: *"será movido de <sprint atual>"*.

### ASCII de como ficará a linha

```text
[ ] [Manychat] - criar automação de live - crx     [Média]  DANILO
    Em Andamento · #438eecfa  [Sprint: Automações CRX]
```

## Detalhes técnicos

- Arquivo único: `src/components/projetos/AddTicketsToSprintModal.tsx`.
- Reutilizar `useSprints(projectId)` que já é importado.
- Construir `sprintNameById = new Map(sprints.map(s => [s.id, s.name]))`.
- Adicionar estado `hideLinked: boolean` (default `true`).
- Ajustar o `useMemo filtered` para aplicar o novo filtro.
- Nenhuma alteração de banco, RLS, hooks ou outros componentes.

## Fora do escopo

- Não alterar o fluxo de vinculação em si (continuará movendo de sprint quando o usuário confirmar).
- Não mexer em `SprintItems`, `ProjectOverview` ou nas demais telas de projeto.
