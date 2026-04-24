
## Diagnóstico

Confirmei no banco a causa do tempo médio inflado. Existem **dois bugs** combinados:

### Bug 1 — Tickets sem `started_at` usam `created_at` como início
- 100 dos 312 chamados fechados em abril não têm `started_at` preenchido (chamados mais antigos).
- O cálculo cai no fallback `created_at`, somando todo o tempo de espera antes de o técnico assumir o ticket.

### Bug 2 — `updated_at` é tratado como "data de fechamento", mas sofre alterações depois da resolução
Este é o problema **mais grave**. Exemplo real:
- Ticket "Mouse ortopédico"
- Resolvido pelo técnico em **06/04** (status virou "Aguardando Aprovação")
- Aprovado pelo solicitante em **22/04**
- Marcado como "Fechado" em **23/04**
- Sistema calcula: `created_at (02/04) → updated_at (23/04) = 501 horas`
- Tempo real de atendimento: ~3 dias úteis

Ou seja: o tempo de espera por aprovação do solicitante e qualquer comentário/edição posterior está sendo somado ao "tempo de atendimento do técnico".

### Confirmação numérica (abril/2026)
- Média atual (`created_at → updated_at`): **151,5 horas**
- Média se trocar só por `started_at → updated_at`: **142,8 horas**
- Média correta (`started_at → momento da resolução`): vai cair drasticamente, como o exemplo de 501h → ~30h.

## O que precisa ser corrigido

### 1. `src/hooks/useDashboardMetrics.ts` (cards do Dashboard)
Trocar o cálculo:
- **Início**: `started_at` (e só usar `created_at` como fallback se realmente não houver `started_at`)
- **Fim**: momento em que o ticket foi resolvido pelo técnico — buscar em `ticket_history` o registro `status_change` cujo `new_value` foi "Aguardando Aprovação". Se não existir, usar a data do `status_change` para "Fechado". Como último recurso, usar `updated_at`.

Aplicar a mesma correção em:
- Card "Tempo Médio" do topo
- Gráfico "Evolução Tempo Médio (min)" dos últimos 6 meses

### 2. `src/pages/MetasTecnicos.tsx`
Mesma lógica de fim de atendimento (Aguardando Aprovação → Fechado → updated_at), tanto para a coluna "Tempo Médio" da tabela de técnicos quanto para o card global de "Tempo Médio".

### 3. `src/components/metas/MyGoalCard.tsx`
Mesma correção para o card de meta individual do técnico (Tempo Resolução).

### 4. `src/pages/Chamados.tsx` (coluna "Tempo" da lista de chamados fechados)
Usar a mesma fonte do "fim do atendimento" para chamados fechados, em vez de `updated_at`. Em chamados ainda abertos, mantém o comportamento atual (`now()`).

### 5. Padronização
Criar uma helper compartilhada em `src/lib/businessHours.ts` (ou novo arquivo `src/lib/ticketTiming.ts`) com a função `getTicketResolutionEnd(ticket, history)` para garantir que **todas** as telas usem exatamente a mesma regra e nunca mais haja divergência.

## Resultado esperado

- "Tempo Médio" do Dashboard cai de ~150h para um valor realista (provavelmente entre 8h e 30h úteis dependendo do mix de chamados).
- "Tempo Médio" da aba Metas dos Técnicos passa a refletir só o trabalho real do técnico, sem contar o tempo que o solicitante demora para aprovar.
- O número fica consistente entre Dashboard, Metas dos Técnicos, Meu Card de Metas e a coluna "Tempo" da lista de chamados.
- Tickets antigos sem `started_at` continuam sendo considerados (com fallback claro), mas o "fim" passa a ser o momento da resolução, eliminando o pior dos outliers.

## O que **não** será alterado

- A regra de horário comercial (08:00–18:00, seg–sex) continua igual.
- Os limites de SLA por prioridade continuam iguais.
- A pontuação dos técnicos não é afetada por esta mudança.
