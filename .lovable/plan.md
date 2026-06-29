## Objetivo
Resolver as 3 divergências da aba Projetos: status oficial da sprint encerrada, KPI consistente entre as telas e edição/visualização de Responsável e Co-responsável.

## 1. Encerrar sprint — status oficial + histórico

A RPC `close_sprint_with_checklist` já marca `sprints.status = 'concluida'` e grava `closed_at`. O problema é que a tela do projeto (`ProjectOverview`) lê o status sem rastrear histórico e o botão simples "Concluir" no `SprintCard` muda o status direto, sem registro.

Ajustes:
- Criar tabela `sprint_history` (sprint_id, project_id, organization_id, action, from_status, to_status, score, notes, changed_by, created_at) com RLS por organização e GRANTs.
- Atualizar `close_sprint_with_checklist` para inserir 1 linha em `sprint_history` (action `close`, com score e evidências resumidas).
- Criar trigger `AFTER UPDATE` em `sprints` que registra mudanças manuais de status (ativar/concluir/reabrir/cancelar) feitas fora da RPC.
- No `SprintCard`, a ação "Concluir" passa a abrir o mesmo `CloseSprintDialog` (já existente em `ProjetosSprints.tsx`) em vez de só fazer `update status='concluida'`, garantindo checklist + histórico em todos os pontos.
- Expor um pequeno bloco "Histórico" no card da sprint (Collapsible) listando as últimas entradas de `sprint_history`.

## 2. KPI consistente: sprint 100% conta como concluída

Hoje só `ProjectOverview` aplica a regra "status concluida OU 100% do escopo". As demais telas continuam mostrando "ativa".

Ajustes:
- Centralizar a regra em `src/hooks/useSprints.ts`, expondo um campo derivado `effectiveStatus` em `SprintWithProgress` (`concluida` quando `status='concluida'` ou `donePct>=100` e há itens).
- Em `ProjetosSprints.tsx`: usar `effective_status` (calculado no `useMemo` a partir de `completed/total_tasks`) para:
  - colorir/rotular o `Badge` ("concluída (100%)" quando ainda não houver fechamento oficial);
  - esconder o botão "Encerrar" quando `status='concluida'`, mas mantê-lo destacado ("Oficializar encerramento") quando estiver 100% e ainda `ativa`.
- `ProjectOverview` passa a usar o mesmo helper centralizado para não divergir.

## 3. Responsável / Co-responsável — editar e visualizar

Sintomas: ao clicar em "Editar" no projeto, os selects vêm vazios; o cabeçalho do projeto não mostra os nomes; em projetos antigos o badge some.

Causas:
- `NewProjectModal` inicializa estados apenas no primeiro render (`useState(project?...)`); quando o modal é reaberto com outro projeto os valores não recarregam.
- `ProjectOverview` consulta `profiles` direto, então quando o RLS esconde o perfil (usuário de outra organização ou inativo) o nome some.
- O cabeçalho do `ProjetoDetalhe` (faixa azul com "Concluir projeto / Editar") não exibe badges de Responsável/Co-responsável.

Ajustes:
- Em `NewProjectModal`: `useEffect` que ressincroniza todos os campos (incluindo `ownerId` e `coOwnerId`) sempre que `project` ou `open` mudar; reset completo ao fechar.
- Em `ProjectOverview`: usar o mesmo fallback de `ProjectCard` (RPC `get_org_technicians`) para resolver `ownerName`/`coOwnerName` quando `profiles` retornar vazio.
- No cabeçalho de `ProjetoDetalhe.tsx`: adicionar dois badges (Responsável, Co-responsável) ao lado do código/nome, com fallback "—" quando não definido, e tornar clicáveis para abrir o modal de edição já no foco do Responsável.
- Tornar o campo Responsável obrigatório também no submit do modo Edit (hoje só bloqueia create), com mensagem clara.

## Detalhes técnicos

- Migration: criação de `public.sprint_history` + GRANTs + RLS (`SELECT` por `is_same_organization(organization_id)`, `INSERT` via security definer apenas) + trigger `sprints_status_history`.
- RPC alterada: `close_sprint_with_checklist` ganha `INSERT INTO sprint_history(...)` antes do `RETURN`.
- Helper: `isSprintEffectivelyDone(sprint)` em `src/hooks/useSprints.ts`, reutilizado por `ProjectOverview` e `ProjetosSprints`.
- Sem alteração na contagem de MVP/Métricas (continuam dependendo de `status='concluida'` oficial — daí a importância do passo 1).
