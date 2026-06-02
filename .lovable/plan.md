# Pulse no badge + ícone de comentário não lido

## 1. Pulse no badge "Aguardando Aprovação"

Em `src/components/StatusBadge.tsx`, adicionar uma classe `animate-pulse` (Tailwind já disponível) somente quando `status === "Aguardando Aprovação"`, mantendo as cores roxas atuais. Aplica em todos os lugares que usam o `StatusBadge` (lista de Chamados, Kanban, modal, etc.) sem nenhuma outra alteração visual.

## 2. Ícone de chat para comentário não visualizado pelo solicitante

### Regra
Mostrar um ícone `MessageSquare` (lucide) ao lado do título do chamado na linha da tabela em `src/pages/Chamados.tsx` quando:
- o usuário logado é o **solicitante** (criou o chamado), e
- existe pelo menos um comentário **público** (`is_public = true`) feito por **outra pessoa** (técnico/admin) com `created_at` maior que o último momento em que o solicitante abriu o chamado.

O ícone fica em cor de destaque (`text-primary`) com um pequeno `animate-pulse` para chamar atenção. Ao abrir o `TicketDetailModal`, o timestamp de "última visualização" é atualizado e o ícone some.

### Implementação técnica

**Migração SQL (nova coluna em `tickets`)**
- Adicionar `last_seen_by_requester_at timestamptz` (nullable) em `public.tickets`.
- Sem alteração em GRANT/RLS (a policy de UPDATE existente já permite o criador atualizar o próprio chamado; verificar e, se necessário, garantir uma policy para o `created_by` atualizar apenas esse campo). Caso a policy de UPDATE atual não permita ao solicitante, criar policy específica permitindo `UPDATE` apenas com `created_by = auth.uid()` restrita a esta coluna via trigger ou simplesmente policy de update geral para o created_by — manter mínimo necessário.

**`src/pages/Chamados.tsx`**
- Query adicional (única, agregada) carregando, para os tickets visíveis onde o usuário é o `created_by`, o `max(created_at)` de `ticket_comments` filtrando `is_public = true AND user_id <> created_by`. Pode ser feito client-side: buscar comentários públicos dos tickets do usuário e calcular o "tem não lido" comparando com `ticket.last_seen_by_requester_at`.
- Renderizar `<MessageSquare className="h-4 w-4 text-primary animate-pulse" />` ao lado do título quando houver não lido.

**`src/components/TicketDetailModal.tsx`**
- Ao abrir o modal, se o usuário logado for o `created_by` do ticket, fazer `update tickets set last_seen_by_requester_at = now() where id = :id` e invalidar a query de tickets/comments para o ícone sumir.

### Escopo
Apenas UI + a coluna de tracking. Sem mudanças em métricas, SLA, status, webhooks ou outras regras.
