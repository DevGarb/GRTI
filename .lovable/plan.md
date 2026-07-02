## Problema

Ao editar manualmente o campo **Início Atend.** de um chamado já fechado, o tempo exibido cai para `0min`. No exemplo da imagem, o `started_at` foi movido de 01/07 11:24 para 01/07 13:24 — como o chamado já tinha sido fechado antes, a janela `started_at → closed_at` fica negativa/zero e o cálculo devolve 0.

## Causa

Em `src/lib/ticketTiming.ts` (`fetchTicketWorkMinutes`):

- Para tickets **legados sem histórico de status**, o total é `calcBusinessMinutes(started_at, closed_at ?? updated_at)`. Se `started_at > closed_at`, o `if (endRaw > start)` falha e retorna 0.
- Para tickets **com histórico**, quando o admin edita `started_at`, o código só usa esse valor para "abrir janela inicial" se o primeiro evento do histórico for uma saída de "Em Andamento". Caso contrário, a janela é aberta pelo timestamp do evento `status_change → Em Andamento` (que não é atualizado ao editar o campo), e a edição de `started_at` acaba **ignorada** — ou, na combinação errada, produz 0.

Além disso, ao salvar a edição em `TicketDetailModal.tsx` (`StartedAtEditor`), gravamos apenas em `tickets.started_at` e registramos um `started_at_change` no histórico — **não** ajustamos o evento `status_change → Em Andamento` correspondente em `ticket_history`, então as duas fontes ficam dessincronizadas.

## Plano de correção

### 1. `src/lib/ticketTiming.ts`
- No ramo "legado sem histórico": se `endRaw <= start`, tratar como janela mínima (retornar 0 mas com log) **ou** usar `max(started_at, ...)` invertido — na verdade, o correto é: se `started_at` foi editado para depois do fechamento, considerar que houve apenas um "toque" e devolver o mínimo relevante. Vamos assumir 0 é aceitável apenas se realmente for; para evitar sumiço, quando `start > endRaw` mas o chamado está fechado, usar `calcBusinessMinutes(endRaw, start)` invertido não faz sentido — o certo é **validar na UI antes de salvar**.
- No ramo com histórico: quando existir um `started_at` editado depois do último evento, tratar a janela mais recente de "Em Andamento" como iniciando em `started_at` em vez do timestamp do evento.

### 2. `src/components/TicketDetailModal.tsx` (`StartedAtEditor`)
- Validar antes de salvar: se o chamado já está fechado (`closed_at` existe) e o novo `started_at` for **posterior** a `closed_at`, bloquear com toast de erro explicando o motivo, sem gravar nem criar entrada no histórico.
- Ao salvar com sucesso, também atualizar o timestamp do primeiro (ou último) evento `status_change → Em Andamento` em `ticket_history` para manter as fontes sincronizadas — via RPC nova `sync_started_at(ticket_id, new_started_at)` que faz o UPDATE em `ticket_history` com privilégio adequado.

### 3. Migração (RPC)
Criar `public.sync_started_at(_ticket_id uuid, _new_started_at timestamptz)`:
- Atualiza `tickets.started_at`.
- Atualiza o evento `status_change → Em Andamento` mais recente (ou insere se não existir) para o novo timestamp.
- Registra uma linha `started_at_change` em `ticket_history` com autor = `auth.uid()`.
- `SECURITY DEFINER`, restrita a admins via `has_role`.

### 4. Invalidar caches de métricas
Após salvar, invalidar `daily_insights_cache` do técnico/período afetado, para o Dashboard e Metas reprocessarem sem exibir o `0min`.

## Resultado esperado

- Admin não consegue mais definir um `started_at` posterior ao fechamento (mensagem clara em vez de zerar o tempo).
- Quando a edição é válida, `ticket_history` e `tickets.started_at` ficam sincronizados, e o tempo listado reflete o novo início imediatamente.
- Métricas de TMA no Dashboard e em Metas atualizam sem exigir refresh manual.
