## Padrões de Permissão de Menu

Permitir que admins criem "padrões" reutilizáveis (conjunto de overrides liberar/bloquear por menu) e apliquem rapidamente no modal de permissões de cada usuário, sem ter que clicar item por item.

### 1. Banco de dados (migração)

Nova tabela `public.menu_permission_presets`:
- `organization_id` (FK organizations, escopo por organização — compartilhada entre admins da org)
- `name` (texto, único por organização)
- `description` (opcional)
- `overrides` (jsonb): `{ "<menu_key>": "grant" | "block", ... }` — itens omitidos = "Padrão (do sistema)"
- `created_by`, `created_at`, `updated_at`

GRANTs para `authenticated` e `service_role`. RLS:
- SELECT: membros da org (`is_member_of_org`)
- INSERT/UPDATE/DELETE: somente admin da org (`has_role_in_org('admin')`) ou super admin

Trigger `update_updated_at_column`.

### 2. Nova sub-aba em `/usuarios` — "Padrões de Permissão"

Reorganizar `src/pages/Usuarios.tsx` para usar abas no topo:
- **Usuários** (conteúdo atual)
- **Padrões de Permissão** (novo)

Aba nova mostra:
- Botão "Novo Padrão"
- Lista (cards/tabela) dos padrões da org: nome, descrição, contagem de itens liberados/bloqueados, ações Editar/Excluir
- Modal de criação/edição (`PermissionPresetModal`): nome, descrição, e a mesma matriz de menus do `UserPermissionsModal` com os três estados (Padrão/Liberar/Bloquear). Salva em `menu_permission_presets`.

### 3. Modal `UserPermissionsModal` — dropdown de padrões

No header do modal, ao lado de "Permissões de Menu":
- **Dropdown "Aplicar padrão ▾"** lista os padrões da org + opção "Padrão do sistema (resetar)".
- Selecionar um padrão → **substitui tudo**: zera os estados atuais e aplica os overrides do padrão (itens não definidos no padrão viram "Padrão"). Mostra toast "Padrão aplicado — clique em Salvar para confirmar".
- Os botões **Liberar** e **Bloquear** de cada linha continuam funcionando para personalização pontual após aplicar.
- O botão/coluna isolado "Padrão" (reset por linha) **é removido** desta versão; o reset agora é via dropdown ("Padrão do sistema").

Nenhuma alteração na tabela `user_menu_overrides` — o dropdown só preenche o `states` local antes do save existente.

### Detalhes técnicos

- Arquivos novos: `src/components/usuarios/PermissionPresetModal.tsx`, `src/components/usuarios/PermissionPresetsTab.tsx`, `src/hooks/usePermissionPresets.ts`.
- Editar: `src/pages/Usuarios.tsx` (envelopar com `<Tabs>` shadcn), `src/components/usuarios/UserPermissionsModal.tsx` (adicionar dropdown, remover botão "Padrão" por linha, manter Liberar/Bloquear).
- Tipos Supabase regeneram após migration aprovada.
- Sem mudanças em `useMenuAccess` nem na lógica de runtime — padrões são apenas atalhos para gravar overrides existentes.
