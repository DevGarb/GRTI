## Menu TODO List por usuário

Criar uma nova área "TODO List" onde cada usuário gerencia suas próprias tarefas pessoais, com visibilidade segmentada por papel.

### Regras de visibilidade

- **Admin / Técnico / Desenvolvedor**: veem os TODOs de todos os técnicos, desenvolvedores e admins da mesma organização (e os seus próprios).
- **Colaborador (solicitante)**: vê apenas os próprios TODOs. Não enxerga TODOs de técnicos nem admins.
- **Super admin**: vê tudo (padrão do sistema).
- Cada usuário só pode criar/editar/excluir os próprios itens.

### Estrutura da página `/todos`

- Cabeçalho com botão "Novo TODO" e filtro por técnico (apenas para quem tem visão ampla).
- Agrupamento visual por responsável (cards/colunas), com contador de pendentes.
- Cada item exibe: título, descrição curta, prioridade (Baixa/Média/Alta), status (Pendente/Em andamento/Concluído), data limite opcional, autor.
- Ações inline: marcar como concluído, editar, excluir (somente dono).
- Filtros: status, prioridade, "somente meus".

### Banco de dados

Nova tabela `user_todos`:

```text
id, user_id, organization_id, title, description,
priority ('baixa'|'media'|'alta'), status ('pendente'|'andamento'|'concluido'),
due_date (nullable), created_at, updated_at, completed_at
```

RLS:
- **SELECT**: dono OU (mesma org E (admin/tecnico/desenvolvedor solicitando E dono é admin/tecnico/desenvolvedor)) OU super admin.
- **INSERT**: `user_id = auth.uid()` e organization_id da org do usuário.
- **UPDATE/DELETE**: somente dono (ou super admin).

A regra de "colaborador não vê dos técnicos" é garantida no SELECT: colaborador só passa pelo ramo "dono = auth.uid()".

### Integração com sistema de menus

- Adicionar entrada `todos` em `src/config/menuItems.ts` (ícone CheckSquare, path `/todos`, sem `adminOnly`/`techAllowed` — visível a todos por padrão, pois colaboradores também acessam, com filtragem feita no servidor).
- Registrar rota em `src/App.tsx` com `MenuGuard`.
- Permissões granulares já podem ser ajustadas pelo modal de overrides existente.

### Arquivos

Novos:
- `src/pages/Todos.tsx`
- `src/components/todos/TodoCard.tsx`
- `src/components/todos/NewTodoModal.tsx`
- `src/hooks/useTodos.ts`

Editados:
- `src/config/menuItems.ts` (adicionar item)
- `src/App.tsx` (rota)

Migração SQL: criar tabela `user_todos` + RLS + trigger `update_updated_at_column`.
