import { supabase } from "@/integrations/supabase/client";
import { calcBusinessMinutes } from "@/lib/businessHours";

const WORKING_STATUS = "Em Andamento";
// Status que pausam a contagem de SLA (técnico não está trabalhando):
const PAUSE_STATUSES = new Set([
  "Aguardando Aprovação",
  "Aprovado",
  "Fechado",
  "Disponível", // legado
  "Aberto",
]);

/**
 * Returns a Map<ticket_id, resolution_end_date> for the given tickets.
 *
 * "Resolution end" is the moment the technician finished the work, i.e. the
 * earliest of these events (in priority order):
 *   1. status_change to "Aguardando Aprovação"
 *   2. status_change to "Aprovado"
 *   3. status_change to "Fechado"
 *
 * If none of those exist in ticket_history (legacy tickets), falls back to
 * the ticket's updated_at — which is what the caller should pass as fallback.
 *
 * This avoids inflating the average resolution time with the period the
 * ticket spent waiting for the requester's approval, comments, scoring, etc.
 */
export async function fetchTicketResolutionEnds(
  ticketIds: string[]
): Promise<Map<string, Date>> {
  const result = new Map<string, Date>();
  if (ticketIds.length === 0) return result;

  const { data } = await supabase
    .from("ticket_history")
    .select("ticket_id, action, new_value, created_at")
    .in("ticket_id", ticketIds)
    .eq("action", "status_change")
    .in("new_value", ["Aguardando Aprovação", "Aprovado", "Fechado"])
    .order("created_at", { ascending: true });

  // Priority: Aguardando Aprovação > Aprovado > Fechado
  // Take the earliest of the highest-priority status that exists per ticket.
  const priority: Record<string, number> = {
    "Aguardando Aprovação": 1,
    Aprovado: 2,
    Fechado: 3,
  };
  const best = new Map<string, { p: number; date: Date }>();

  (data || []).forEach((h: any) => {
    const p = priority[h.new_value];
    if (!p) return;
    const current = best.get(h.ticket_id);
    if (!current || p < current.p) {
      best.set(h.ticket_id, { p, date: new Date(h.created_at) });
    }
  });

  best.forEach((v, k) => result.set(k, v.date));
  return result;
}

/**
 * Resolves the start of the technician's work on a ticket.
 * Prefers started_at; falls back to created_at for legacy tickets.
 */
export function getTicketWorkStart(ticket: {
  started_at?: string | null;
  created_at: string;
}): Date {
  return ticket.started_at ? new Date(ticket.started_at) : new Date(ticket.created_at);
}

/**
 * Calcula o tempo acumulado (em minutos úteis) que cada ticket passou em
 * "Em Andamento", somando todas as janelas (atendimento inicial + retrabalhos).
 *
 * Regras:
 *  - O cronômetro liga quando o status entra em "Em Andamento".
 *  - O cronômetro desliga quando o status sai de "Em Andamento" (ex.: vai para
 *    "Aguardando Aprovação", "Aprovado", "Fechado").
 *  - Se houver retrabalho (volta para "Em Andamento"), retoma a contagem
 *    de onde parou — ou seja, soma à janela anterior.
 *  - Se o ticket está atualmente em "Em Andamento", a janela aberta é
 *    fechada em `now` (ou no `nowOverride` informado, útil para testes).
 *  - Para tickets legados sem histórico, usamos `started_at` como única
 *    abertura de janela e o `currentStatus` para decidir se está aberta.
 */
export async function fetchTicketWorkMinutes(
  tickets: Array<{
    id: string;
    started_at?: string | null;
    created_at: string;
    status: string;
    updated_at: string;
  }>,
  nowOverride?: Date
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (tickets.length === 0) return result;

  const now = nowOverride ?? new Date();
  const ids = tickets.map((t) => t.id);

  const { data: history } = await supabase
    .from("ticket_history")
    .select("ticket_id, action, old_value, new_value, created_at")
    .in("ticket_id", ids)
    .eq("action", "status_change")
    .order("created_at", { ascending: true });

  // Agrupa eventos por ticket
  const byTicket = new Map<string, Array<{ old: string | null; nw: string; at: Date }>>();
  (history || []).forEach((h: any) => {
    const arr = byTicket.get(h.ticket_id) ?? [];
    arr.push({ old: h.old_value, nw: h.new_value, at: new Date(h.created_at) });
    byTicket.set(h.ticket_id, arr);
  });

  for (const t of tickets) {
    const events = byTicket.get(t.id) ?? [];
    let total = 0;
    let openSince: Date | null = null;

    if (events.length === 0) {
      // Ticket legado sem histórico: aproxima pela janela started_at → updated_at,
      // contando apenas se ainda está em "Em Andamento" (caso contrário,
      // assumimos que parou em updated_at).
      const start = t.started_at ? new Date(t.started_at) : null;
      if (start) {
        const end = t.status === WORKING_STATUS ? now : new Date(t.updated_at);
        if (end > start) total = calcBusinessMinutes(start, end);
      }
      result.set(t.id, total);
      continue;
    }

    // Se o primeiro evento já reflete uma transição de "Em Andamento" para
    // outro status, precisamos abrir a janela inicial em started_at.
    if (events[0].old === WORKING_STATUS && t.started_at) {
      openSince = new Date(t.started_at);
    }

    for (const ev of events) {
      if (ev.nw === WORKING_STATUS) {
        // Entrou em atendimento: abre janela (se não houver outra aberta)
        if (!openSince) openSince = ev.at;
      } else if (PAUSE_STATUSES.has(ev.nw) && openSince) {
        // Saiu de atendimento: fecha janela
        if (ev.at > openSince) {
          total += calcBusinessMinutes(openSince, ev.at);
        }
        openSince = null;
      }
    }

    // Janela ainda aberta? Só conta se o status atual ainda é "Em Andamento".
    if (openSince && t.status === WORKING_STATUS) {
      total += calcBusinessMinutes(openSince, now);
    }

    result.set(t.id, total);
  }

  return result;
}
