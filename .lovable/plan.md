

# Plano: SLA de 6h + Reatribuição Automática de Chamados

## Resumo

Adicionar controle de SLA de início (6 horas) nos chamados. Se o técnico não iniciar o atendimento no prazo, o chamado fica disponível para qualquer técnico assumir via botão "Pegar para mim". Um cron job verifica a cada minuto os chamados expirados.

---

## 1. Migração de Banco de Dados

Adicionar colunas na tabela `tickets`:

- `sla_deadline` (timestamptz) — calculado como `created_at + 6h`
- `started_at` (timestamptz) — quando o técnico iniciou
- `picked_at` (timestamptz) — quando outro técnico assumiu
- `original_assigned_to` (uuid) — técnico original antes da reatribuição

Mapear os status atuais para incluir os novos:
- **"Aberto"** → equivale ao `pending` (aguardando início)
- **"Disponível"** → novo status para SLA expirado (`unassigned_available`)
- **"Em Andamento"** → técnico iniciou ou assumiu

Atualizar política RLS de SELECT em `tickets` para que técnicos vejam chamados com status "Disponível".

---

## 2. Edge Function: `check-sla` (Cron Job)

Função agendada via `pg_cron` para rodar **a cada minuto**:

- Busca chamados com `status = 'Aberto'` e `sla_deadline < NOW()` e `assigned_to IS NOT NULL`
- Para cada um:
  - Salva `original_assigned_to = assigned_to`
  - Define `assigned_to = NULL`, `status = 'Disponível'`
  - Insere registro em `ticket_history` (ação: `sla_expired`)
  - Insere em `audit_logs`

---

## 3. Atualizar Criação de Chamado

No `useCreateTicket` e na inserção no banco:
- Setar `sla_deadline = NOW() + interval '6 hours'` automaticamente (via DEFAULT na coluna ou no insert)

---

## 4. Lógica "Pegar para mim"

Nova mutation `usePickTicket`:
- Atualiza `assigned_to` para o técnico atual
- Define `status = 'Em Andamento'`, `picked_at = now()`
- Registra em `ticket_history` (ação: `picked`)

---

## 5. Atualizar Início pelo Técnico Original

Quando o técnico muda status para "Em Andamento" dentro do SLA:
- Define `started_at = now()`
- O chamado não será afetado pelo cron

---

## 6. UI — Página de Chamados

### Para técnicos (não-admin):

Adicionar **3 seções** na página `Chamados.tsx`:

1. **"Disponíveis para assumir"** — chamados com status `Disponível`
   - Card com borda vermelha + badge "SLA Expirado"
   - Botão verde "Pegar para mim"
2. **"Chamados atribuídos a mim"** — mantém como está
3. **"Chamados que eu abri"** — mantém como está

### Para admin:

- Badge visual de "SLA Expirado" nos chamados com status "Disponível"
- Coluna/indicador de tempo restante de SLA nos chamados "Aberto"

### StatusBadge:

- Adicionar estilo para o novo status "Disponível" (vermelho/destaque)

---

## 7. Arquivos Modificados

| Arquivo | Alteração |
|---|---|
| Migração SQL | Adicionar colunas + default `sla_deadline` |
| `supabase/functions/check-sla/index.ts` | Nova edge function para cron |
| `src/hooks/useTickets.ts` | Adicionar `usePickTicket`, campos novos na interface |
| `src/pages/Chamados.tsx` | Seção "Disponíveis" com botão "Pegar para mim" |
| `src/components/StatusBadge.tsx` | Estilo para status "Disponível" |
| `src/components/TicketDetailModal.tsx` | Exibir info de SLA e botão "Pegar" |
| RLS policies | Técnicos verem chamados "Disponível" |
| `pg_cron` job | Agendar `check-sla` a cada minuto |

---

## Detalhes Técnicos

- O `sla_deadline` será calculado via `DEFAULT now() + interval '6 hours'` na coluna
- O cron usa `pg_cron` + `pg_net` para invocar a edge function
- A RLS de SELECT em tickets será ajustada: técnicos também veem chamados com `status = 'Disponível'`
- Webhook de notificação próximo ao vencimento (5h30) pode ser adicionado como melhoria futura

