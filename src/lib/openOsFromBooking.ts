import { supabase } from "@/integrations/supabase/client";
import type { WorkshopBooking } from "@/hooks/useWorkshopBookings";
import type { ServiceOrder } from "@/hooks/useOficina";

const fmtDate = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("pt-BR");

/**
 * Abre uma OS a partir de um agendamento confirmado (moto chegou na oficina).
 * Cria a OS em "em_atendimento" e marca o agendamento como "concluido".
 * O checklist pontuado nasce via trigger a partir de `serviceTypeId`.
 */
export async function openOsFromBooking(
  booking: WorkshopBooking,
  opts: { userId?: string; mechanicId?: string | null; serviceTypeId?: string | null; moveToExecucao?: boolean } = {},
): Promise<ServiceOrder> {
  const { data: os, error } = await supabase
    .from("op_service_orders")
    .insert({
      organization_id: booking.organization_id,
      created_by: opts.userId,
      company_id: booking.company_id,
      vehicle_plate: booking.vehicle_plate,
      vehicle_model: booking.vehicle_model || null,
      customer_name: booking.requester_name || null,
      status: "Aberta",
      stage: opts.moveToExecucao ? "execucao" : "analise",
      opened_at: new Date().toISOString().slice(0, 10),
      description: booking.description || `Agendamento de ${fmtDate(booking.scheduled_date || booking.preferred_date)}`,
      diagnosis: null,
      mechanic_id: opts.mechanicId || null,
      service_type_id: opts.serviceTypeId || null,
    } as any)
    .select()
    .single();
  if (error) throw error;

  const { error: bErr } = await supabase
    .from("op_workshop_bookings")
    .update({ status: "concluido", service_order_id: (os as any).id } as any)
    .eq("id", booking.id);
  if (bErr) throw bErr;

  return os as ServiceOrder;
}
