## Bugs a corrigir

### 1. Comentários internos visíveis para colaboradores
**Problema:** Em `src/components/ticket-detail/TicketComments.tsx` os comentários marcados como "Interno" (`is_public = false`) aparecem para qualquer usuário que abre o chamado, inclusive solicitantes/colaboradores. Hoje o RLS até deixa o autor ver o próprio comentário interno, mas o solicitante do chamado também enxerga internos de outros porque a policy `Users view comments scoped by org or ownership` permite quando o ticket é dele.

**Correção (frontend):**
- Já existe a flag `canSeePrivate = hasRole("admin") || hasRole("tecnico")`. Vou ampliar para incluir `desenvolvedor` e `super_admin` (consistente com o resto do app).
- Filtrar a lista renderizada: se `!canSeePrivate`, esconder qualquer comentário com `is_public === false` (independente de quem é o autor — o solicitante não precisa ver internos nem os próprios).

**Correção (backend / RLS):** ajustar a policy de SELECT em `ticket_comments` para que comentários internos só sejam visíveis para admin / tecnico / desenvolvedor / super_admin. Isso fecha o vazamento mesmo se alguém consultar a tabela direto pela API.

### 2. Notificações de chamados aparecendo para colaboradores que não são donos
**Problema:** O trigger `notify_ticket_insert` cria uma notificação `ticket_new` para todos os admin/técnico/desenvolvedor da organização, e `notify_ticket_comment` / `notify_ticket_update` notificam `created_by` e `assigned_to`. O colaborador (`solicitante`) só deveria ver notificações dos chamados que **ele criou** ou em que ele participa diretamente — não notificações genéricas da organização.

Investigação rápida mostrou que o RLS da tabela está correto (`user_id = auth.uid()`) e o hook `useNotifications` filtra por user. Então o problema real é que estão sendo **inseridas notificações para usuários errados** em algum cenário (provavelmente notificações antigas, ou um caminho que cria notificação `ticket_new`/`ticket_comment` para o solicitante mesmo quando o chamado não é dele).

**Correção (backend):**
- Revisar `notify_ticket_comment`: garantir que só notifica `created_by` (se diferente do autor do comentário) e `assigned_to` (idem). Já faz isso — manter, mas **não notificar comentário interno para o solicitante** (`is_public = false` → pular `created_by`).
- Limpar notificações órfãs já existentes na tabela onde o usuário destinatário não é `created_by` nem `assigned_to` nem participante do ticket (one-off cleanup).
- Adicionar índice/garantia: nenhuma notificação `ticket_*` deve ser criada para um usuário que não tenha relação com o ticket (created_by, assigned_to, comentou, ou tem role admin/tecnico/desenvolvedor para `ticket_new`).

**Correção (frontend - defesa em profundidade):** no `useNotifications`, além do filtro por `user_id`, ignorar notificações cujo `ticket_id` aponte para um ticket que o usuário não tem relação — opcional, deixo de fora pra não complicar; o RLS + correção do trigger já resolvem.

## Detalhes técnicos

**Arquivos alterados:**
- `src/components/ticket-detail/TicketComments.tsx` — filtrar internos no render; expandir `canSeePrivate` para `desenvolvedor` e `super_admin`.
- Nova migração SQL:
  - Recriar policy de SELECT em `ticket_comments`: internos só para staff (admin/tecnico/desenvolvedor/super_admin); públicos seguem regra atual (mesma org + relacionado ao ticket).
  - Atualizar função `notify_ticket_comment` para pular `created_by` quando `is_public = false`.
  - DELETE de notificações já criadas indevidamente para solicitantes (notificações de tickets onde o `user_id` da notificação não é nem `created_by` nem `assigned_to` do ticket e o usuário não tem role staff).

## Fora do escopo
- Não vou mexer no `notify_ticket_insert` (notificar todos os técnicos de novo chamado é comportamento esperado para a fila de "Chamados em Aberto").
- Não vou alterar o `useNewTicketNotifier` (já restrito a staff via `canUseAdminAlert`).
