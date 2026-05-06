# Modularização de Menus por Usuário

Implementar controle híbrido de acesso aos menus: as regras atuais por papel (admin, técnico, super_admin etc.) continuam como **padrão**, mas o admin poderá **liberar** ou **bloquear** menus específicos por usuário através de um modal.

## 1. Banco de dados

Nova tabela `user_menu_overrides`:

| coluna | tipo | descrição |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | usuário alvo |
| `menu_key` | text | identificador estável do menu (ex: `dashboard`, `chamados`, `patrimonio`) |
| `granted` | boolean | `true` = libera mesmo sem ter o papel; `false` = bloqueia mesmo tendo o papel |
| `organization_id` | uuid | tenant |
| `created_by`, `created_at` | | auditoria |

Constraint UNIQUE (`user_id`, `menu_key`).

**RLS**:
- SELECT: próprio usuário (para o frontend filtrar) + admins da mesma organização + super_admin.
- INSERT/UPDATE/DELETE: somente admins da mesma organização ou super_admin.

## 2. Frontend — fonte única de menus

Extrair `navItems` de `src/components/AppLayout.tsx` para `src/config/menuItems.ts`, adicionando um campo `key` estável em cada item (ex: `dashboard`, `chamados`, `chamados-abertos`, `usuarios`, `avaliacoes`, `metas`, `historico`, `auditoria`, `categorias`, `setores`, `webhook-logs`, `preventivas`, `patrimonio`, `projetos`, `super-admin`, `planos`, `migracao`, `white-label`, `integracoes`, `documentacao`, `configuracoes`).

## 3. Hook de permissões

Novo `src/hooks/useMenuAccess.ts`:
- Carrega overrides do usuário logado via `supabase.from("user_menu_overrides").select().eq("user_id", user.id)`.
- Expõe `canAccess(menuKey)` que aplica:
  1. Se existe override `granted=false` → bloqueia.
  2. Se existe override `granted=true` → libera.
  3. Caso contrário, aplica regra padrão atual (`adminOnly`, `techAllowed`, `superAdminOnly`, `auditorOnly`).
- Super admin sempre vê tudo.

`AppLayout.tsx` passa a usar esse hook para filtrar `visibleNavItems`.

## 4. Proteção de rotas

`AdminRoute` e a futura proteção de cada rota também consultarão `canAccess(key)` para evitar acesso direto via URL quando o menu estiver bloqueado. Para manter o escopo enxuto, criar um wrapper único `MenuGuard` reaproveitado em `App.tsx`.

## 5. UI de gestão — Modal em Usuários

Em `src/pages/Usuarios.tsx`, adicionar botão **"Permissões"** em cada linha que abre um novo `UserPermissionsModal`:
- Lista todos os menus (de `menuItems.ts`) com indicação do estado padrão para o papel daquele usuário (Liberado/Bloqueado por padrão).
- Para cada menu, um Select com 3 estados: **Padrão**, **Liberar**, **Bloquear**.
- Salvar faz upsert/delete na tabela `user_menu_overrides`.
- Itens marcados como `superAdminOnly` ficam desabilitados (não overrideáveis por admin comum).

## 6. Detalhes técnicos

- Cache: invalidar overrides ao logar/trocar de organização.
- O hook `useMenuAccess` retorna `loading`; durante o loading, o sidebar pode usar apenas as regras padrão para evitar flicker.
- Documentar as `menu keys` em `mem://features/user-management`.

## Arquivos a criar / editar

**Criar**
- `src/config/menuItems.ts`
- `src/hooks/useMenuAccess.ts`
- `src/components/usuarios/UserPermissionsModal.tsx`

**Editar**
- `src/components/AppLayout.tsx` — usa novo config e hook
- `src/App.tsx` — `MenuGuard` por rota (opcional, mas recomendado)
- `src/pages/Usuarios.tsx` — botão e modal de permissões

**Migration**
- Tabela `user_menu_overrides` + RLS

## Fora de escopo
- Permissões granulares dentro de páginas (ex: esconder botões). Apenas visibilidade/acesso aos menus/rotas.
