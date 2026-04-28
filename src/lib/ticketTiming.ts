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
