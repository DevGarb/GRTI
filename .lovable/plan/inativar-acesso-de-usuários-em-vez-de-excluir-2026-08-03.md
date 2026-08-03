# Inativar acesso de usuários (em vez de excluir)

Em vez de apagar o usuário (que falha por causa de vínculos históricos: chamados, checklists, projetos), passa a existir uma **inativação de acesso**: o usuário continua no histórico, mas não consegue mais entrar no sistema.

## Como vai funcionar

- Na lista de Usuários, o ícone de lixeira vermelho vira um botão **Inativar acesso** (e **Reativar** quando já estiver inativo).
- Ao inativar: confirmação, o usuário passa a aparecer com selo cinza **Inativo**, e a sessão dele é encerrada.
- Usuário inativo que tentar logar recebe a mensagem "Acesso inativado. Fale com o administrador." e é deslogado na hora.
- Super admin continua protegido (não pode ser inativado).
- Filtro simples no topo da lista: Todos / Ativos / Inativos.

## Detalhes técnicos

1. **Banco**: migration adicionando em `public.profiles` as colunas `is_active boolean not null default true`, `deactivated_at timestamptz`, `deactivated_by uuid`. Sem mudança de RLS (admins da org já atualizam profiles).
2. **Edge function `set-user-active`** (nova): valida o chamador como `admin`/`super_admin` (mesmo padrão de `update-user`), recusa alvo `super_admin`, atualiza `profiles.is_active` e usa o admin client para banir/desbanir no auth (`updateUserById` com `ban_duration: "876000h"` ou `"none"`), garantindo bloqueio real de login.
3. **Frontend `src/pages/Usuarios.tsx`**: substitui a mutation `deleteUser` por `setUserActive`, troca o ícone/ação na linha, adiciona selo "Inativo", inclui `is_active` na query `admin-users`, no filtro e no export CSV.
4. **`src/contexts/AuthContext.tsx`**: após carregar o profile, se `is_active === false`, faz `signOut()` e a tela de login mostra o aviso de acesso inativado.
5. Rodar `bun run build` no final.

Nada de exclusão real é removido do banco — o histórico do usuário permanece intacto.
