## Adicionar Responsável e Co-responsável aos Projetos

Os campos `owner_id` e `co_owner_id` já existem na tabela `projects`, mas não estão expostos na UI. Vou conectá-los nos pontos de criação, edição e visualização.

### 1. `NewProjectModal.tsx`
- Adicionar dois selects no formulário de criação:
  - **Responsável** (obrigatório) — lista de usuários da organização (técnicos/desenvolvedores/admins).
  - **Co-responsável** (opcional) — mesma lista, excluindo o já selecionado como responsável.
- Enviar `owner_id` e `co_owner_id` no insert do projeto.

### 2. `useProjects.ts`
- Buscar `co_owner_id` no select e mapear `coOwnerName` junto com `ownerName` (uma única query a `profiles` para os dois conjuntos de IDs).
- Atualizar a interface `Project` / `ProjectInput` para incluir `co_owner_id`.

### 3. `ProjectCard.tsx` / `ProjectOverview.tsx`
- Mostrar avatar + nome do **Responsável** e badge secundária do **Co-responsável** no card e no cabeçalho do overview.

### 4. Edição
- Se houver modal/aba de edição de projeto (verificar em `ProjectOverview`), adicionar os mesmos dois selects para alterar responsáveis depois da criação. Caso não exista hoje, adicionar um pequeno popover "Editar responsáveis" no overview restrito a admin/owner atual.

### 5. Sem mudanças no banco
Schema já contempla os campos; nenhuma migração necessária.

### Observação
Quer que o **Responsável** seja obrigatório na criação ou opcional (assumindo o criador como padrão quando vazio)?