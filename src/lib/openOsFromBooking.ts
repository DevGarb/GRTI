import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { WorkshopBooking } from "@/hooks/useWorkshopBookings";

/**
 * Abre a OS a partir de um agendamento confirmado.
 * Cria a ordem de serviço na coluna "Análise / Triagem" (solicitada)
 * e vincula o agendamento à OS criada.
 */
export async function openOsFromBooking(
  booking: WorkshopBooking,
  opts: { userId?: string | null; mechanicId?: string | null } = {},
) {
  const { data, error } = await supabase
    .from("op_service_orders")
    .insert({
      organization_id: booking.organization_id,
      created_by: opts.userId || booking.created_by || null,
      company_id: booking.company_id || null,
      mechanic_id: opts.mechanicId ?? booking.mechanic_id ?? null,
      customer_name: booking.requester_name || null,
      vehicle_plate: booking.vehicle_plate || null,
      vehicle_model: booking.vehicle_model || null,
      description: [booking.service_type, booking.description].filter(Boolean).join(" — ") || "Serviço agendado",
      status: "Aberta",
      stage: "analise",
      opened_at: new Date().toISOString().slice(0, 10),
      scheduled_date: booking.scheduled_date || null,
      scheduled_period: booking.scheduled_period || null,
    } as any)
    .select()
    .single();

  if (error) {
    toast.error(error.message);
    return null;
  }

  const { error: upErr } = await supabase
    .from("op_workshop_bookings" as any)
    .update({ service_order_id: (data as any).id, status: "em_atendimento" } as any)
    .eq("id", booking.id);
  if (upErr) toast.error(upErr.message);

  toast.success(`OS aberta para ${booking.vehicle_plate} em Análise / Triagem`);
  return data as any;
}
