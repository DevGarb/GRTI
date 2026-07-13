## Objetivo

1. Garantir que na organização **GRCHECK** todos os usuários (admin ou colaborador) vejam apenas os menus de checklist (`chk-*`) e não consigam acessar outras rotas nem por URL direta.
2. Tornar configurável, por organização, quais menus/módulos aparecem — para poder controlar GRCHECK e futuras organizações sem editar código.

---

## Parte 1 — Validar isolamento do GRCHECK

**Frontend (menu):** `AppLayout.tsx` já filtra: se `orgSlug === "grcheck"` só mostra itens com key `chk-*`. OK visualmente.

**Gap atual:** não há bloqueio de rota. Um usuário pode digitar `/chamados` na URL e a página carrega mesmo estando em GRCHECK.

**Correção:**
- Criar um guard `<OrgMenuGuard>` em `src/App.tsx` que, para cada rota, consulta `useMenuAccess().canAccessPath(path)`. Se o path atual não está permitido pela org corrente, redireciona para o primeiro menu visível (ex.: `/checklists` no GRCHECK).
- Integrar a mesma lógica de restrição por org (hoje só em `AppLayout`) dentro de `useMenuAccess.canAccess`, para que o guard e o menu compartilhem a mesma verdade.

---

## Parte 2 — Menus permitidos por organização (configurável)

**Novo modelo de dados:** tabela `organization_menu_config`

| Campo | Descrição |
|---|---|
| organization_id | FK organizations |
| menu_key | key do item em `menuItems` (ex.: `chk-dashboard`, `chamados`) |
| enabled | boolean |

Regra de resolução (nova, em `useMenuAccess`):
1. Se a org tem qualquer linha em `organization_menu_config`, ela está em "modo whitelist": só menus com `enabled=true` aparecem.
2. Se não tem nenhuma linha, comportamento atual (todos os menus conforme role/overrides).
3. `user_menu_overrides` continua funcionando, mas só pode restringir dentro do que a org permite (nunca abrir menu que a org bloqueou).

**Seeds:** popular `organization_menu_config` para GRCHECK apenas com os `chk-*` — substitui o hard-code atual do `AppLayout` (`orgSlug === "grcheck"` / `"cgps-operacional"`).

**UI de administração:** nova aba **"Menus da Organização"** em `Configurações` (visível para admin/super_admin):
- Lista todos os itens de `menuItems` agrupados (Geral, Operacional, Checklists, Super Admin).
- Toggle on/off por item, salva em `organization_menu_config`.
- Botão "Restaurar padrão" (apaga linhas da org → volta a mostrar tudo pelo role).
- Preset rápido: "Somente Checklists", "Somente Operacional", "Tudo".

**Guard de rota:** o `OrgMenuGuard` da Parte 1 passa a usar essa mesma tabela, então rotas bloqueadas pela config da org também redirecionam.

---

## Detalhes técnicos

- Migração cria `public.organization_menu_config` com PK composta (org_id, menu_key), GRANTs para `authenticated` e `service_role`, RLS: SELECT por membros da org; INSERT/UPDATE/DELETE só para admin ou super_admin da org (via `has_role`).
- Seed: `INSERT` para GRCHECK habilitando as 8 keys `chk-*`; para `cgps-operacional` habilitando `op-*` + universais atuais (`configuracoes`, `todos`, `usuarios`, `white-label`, `integracoes`, `documentacao`, `super-admin`, `planos`, `migracao`).
- Remover o hard-code `orgSlug === "grcheck"` / `"cgps-operacional"` de `AppLayout.tsx` — passa a vir do banco.
- `useMenuAccess`: buscar config da org junto com os overrides do usuário. Cache por `organization_id`.
- Novo componente `src/components/configuracoes/OrgMenusTab.tsx` e nova rota/aba em `Configuracoes.tsx`.
- Guard: componente em `src/components/OrgMenuGuard.tsx`, envolvendo `<Routes>` autenticadas em `App.tsx`.

---

## Arquivos afetados

- **novo** `supabase/migrations/<timestamp>_organization_menu_config.sql`
- **novo** `src/components/OrgMenuGuard.tsx`
- **novo** `src/components/configuracoes/OrgMenusTab.tsx`
- **editar** `src/hooks/useMenuAccess.ts` (ler config da org, aplicar whitelist)
- **editar** `src/components/AppLayout.tsx` (remover hard-code de slug)
- **editar** `src/pages/Configuracoes.tsx` (nova aba)
- **editar** `src/App.tsx` (envolver rotas com guard)

---

## Fora de escopo

- Reorganizar rotas ou renomear menus existentes.
- Alterar RLS das tabelas de negócio (o guard é UX; a segurança dos dados continua nas RLS existentes por org).
