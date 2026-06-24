## Resposta direta

Não, essa solicitação **ainda não foi implementada**. Hoje o sistema continua mudando o status para **"Em Andamento"** quando o técnico se atribui (tanto em `usePickTicket` quanto no botão "Atribuir a mim" do `TicketDetailModal`), não existe campo de **data de entrega** definida pelo técnico, e a aba **Chamados** não tem um sub-menu de **Calendário**.

Abaixo, o plano para implementar exatamente o que você pediu.

---

## 1. Atribuição mantém o status "Aberto" + data de entrega obrigatória

**Banco**
- Adicionar coluna `tickets.due_date date` (data prometida pelo técnico para concluir o chamado).
- Adicionar `tickets.due_date_set_by uuid` e `due_date_set_at timestamptz` para auditoria.
- Trigger em `ticket_history` registrando alterações de `due_date`.

**Backend / hooks**
- Em `usePickTicket` (`src/hooks/useTickets.ts`): remover `status: "Em Andamento"` — o status permanece **"Aberto"**. Continuar gravando `assigned_to`, `picked_at` e `started_at`. Passar `due_date` recebida como parâmetro.
- Mesma regra no `TicketDetailModal.tsx` (linhas 582–593, botão "Atribuir a mim"): apenas atribuir, **não** mover para "Em Andamento".
- O status só muda para "Em Andamento" quando o técnico explicitamente começar o atendimento (botão "Iniciar atendimento" já existente / dropdown de status do admin).

**UI de atribuição**
- Novo modal `AssignTicketModal.tsx`: seleciona técnico (admin) ou auto-atribuição, e exige escolher uma **Data de entrega** (Calendar shadcn com `pointer-events-auto`). Sem data → botão desabilitado.
- O modal substitui o clique direto em "Atribuir a mim" e o select de técnico do `TicketDetailModal`.
- Exibir `due_date` no card/lista de chamados e dentro do modal, com badge vermelho se a data já passou.

---

## 2. Nova aba "Calendário" dentro de Chamados

Estrutura espelhada na de Projetos:

```text
/chamados                  ← layout com sub-tabs (NavLink)
  ├─ /chamados             → lista atual (Meus chamados)
  ├─ /chamados/abertos     → ChamadosAbertos (já existe)
  └─ /chamados/calendario  → NOVO: ChamadosCalendario
```

- Criar `src/pages/chamados/ChamadosLayout.tsx` com `<Outlet/>` e nav igual a `ProjetosLayout.tsx` (Lista, Em Aberto, Calendário).
- Mover as rotas atuais (`/chamados`, `/chamados-abertos`) para dentro desse layout em `App.tsx`. Manter `/chamados-abertos` redirecionando para `/chamados/abertos` para não quebrar links.
- Criar `src/pages/chamados/ChamadosCalendario.tsx`:
  - Filtra `tickets` onde `assigned_to = user.id` e `due_date is not null` (admin vê todos da org com filtro por técnico).
  - Renderiza calendário mensal (reusar `Calendar` do shadcn em `mode="multiple"` com badges por dia, ou componente `react-day-picker` customizado, igual ao `ProjetosCalendario`).
  - Ao clicar num dia: lista os chamados daquela data e abre o `TicketDetailModal` no clique de um item.
  - Cores por prioridade/status; destaque para vencidos.

---

## 3. Detalhes técnicos

- **Migration** (será gerada quando aprovar o plano):
  - `ALTER TABLE public.tickets ADD COLUMN due_date date, ADD COLUMN due_date_set_by uuid, ADD COLUMN due_date_set_at timestamptz;`
  - Sem alteração de RLS — herda as policies de `tickets`.
- **Tipos**: o `src/integrations/supabase/types.ts` é regenerado após migration.
- **Compatibilidade**: chamados antigos sem `due_date` continuam funcionando; o calendário só lista os que tiverem data.
- **Notificações**: opcional nesta etapa — posso incluir notificação "chamado vencendo hoje" se quiser (não incluí no escopo para manter o foco).

---

## Arquivos afetados

Novos:
- `src/components/AssignTicketModal.tsx`
- `src/pages/chamados/ChamadosLayout.tsx`
- `src/pages/chamados/ChamadosCalendario.tsx`
- Migration `supabase/migrations/…_tickets_due_date.sql`

Editados:
- `src/hooks/useTickets.ts` (usePickTicket, tipo Ticket)
- `src/components/TicketDetailModal.tsx` (fluxo de atribuição + exibir due_date)
- `src/App.tsx` (rotas aninhadas em /chamados)
- `src/pages/Chamados.tsx` / `ChamadosAbertos.tsx` (mostrar coluna "Entrega")

Posso seguir com a implementação?
