# Plano — Evitar chamados abertos na organização errada

Três melhorias combinadas no fluxo de chamados, mantendo o solicitante restrito à organização ativa.

## 1. Destacar a organização ativa no modal "Novo Chamado"

Em `src/components/NewTicketModal.tsx`, adicionar um banner no topo do corpo do modal (logo acima do campo Título) mostrando claramente em qual organização o chamado será aberto.

- Buscar o nome da organização ativa via `profile.organization_id` (consulta a `organizations`, com cache via React Query).
- Banner em destaque (cor de aviso suave, ex.: `bg-primary/5 border-primary/20`), com ícone `Building2` e texto:
  `Este chamado será aberto em: <NOME DA ORGANIZAÇÃO>`
- Se o usuário pertencer a mais de uma organização (consulta a `user_organizations`), mostrar abaixo um link sutil:
  `Não é a organização correta? Trocar de organização` → fecha o modal e abre o switcher de organização existente.
- Se pertencer a apenas uma organização, esconder o link.

## 2. Confirmação antes de salvar

No mesmo modal, ao clicar em "Criar Chamado":

- Em vez de submeter direto, abrir um `AlertDialog` (shadcn) com:
  - Título: `Confirmar abertura do chamado`
  - Corpo: `Você está abrindo este chamado em <NOME DA ORG>. Deseja continuar?`
  - Botões: `Voltar e revisar` / `Sim, abrir chamado`
- Só executa `handleSubmit` real após confirmação.
- Adicionar checkbox opcional `Não pedir confirmação novamente` (persistido em `localStorage`, chave `ticket-confirm-skip`). Útil para usuários que abrem muitos chamados.

## 3. Permitir admin mover chamado entre organizações

Permite corrigir chamados criados na org errada sem precisar recriar.

### Backend (migração)
Adicionar função SQL `move_ticket_to_organization(_ticket_id uuid, _target_org uuid)`:
- `SECURITY DEFINER`, valida que `auth.uid()` é admin da org de origem **e** da org de destino (ou super_admin).
- Atualiza `tickets.organization_id`.
- Registra entrada em `audit_logs` (action: `ticket_moved_org`, details com origem/destino).

### Frontend
Em `src/components/TicketDetailModal.tsx`:
- Para usuários admin/super_admin, adicionar item no menu de ações: `Mover para outra organização`.
- Abre dialog com select das organizações disponíveis (apenas aquelas em que o admin atua) e confirmação.
- Após sucesso, invalidar cache de tickets e fechar modal.

## Detalhes técnicos

- **Hook novo** `useUserOrganizations()` — retorna lista de organizações do usuário logado (via `user_organizations` join `organizations`). Reutilizado no banner e no dialog de mover.
- **Hook novo** `useCurrentOrganization()` — retorna `{ id, name }` da org ativa do `profile`.
- **Sem mudanças no schema de tickets** — apenas a função `move_ticket_to_organization` e RLS já existente cuidam do resto.
- **Audit log**: usar a tabela `audit_logs` existente (já tem `organization_id`, `action`, `details`).
- **i18n**: textos em PT-BR, mantendo padrão atual.

## Arquivos afetados

- `src/components/NewTicketModal.tsx` — banner + confirmação
- `src/components/TicketDetailModal.tsx` — ação "Mover organização" para admin
- `src/hooks/useCurrentOrganization.ts` — novo
- `src/hooks/useUserOrganizations.ts` — novo
- `src/hooks/useMoveTicketOrg.ts` — novo (mutation)
- `supabase/migrations/<timestamp>_move_ticket_org.sql` — função `move_ticket_to_organization`

## Fora do escopo

- Mudar regra de visibilidade/escopo para solicitantes (continua restrito à org ativa).
- Sugestão automática de organização baseada em categoria.
