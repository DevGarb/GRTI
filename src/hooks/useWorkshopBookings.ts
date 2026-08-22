import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface WorkshopBooking {
  id: string;
  organization_id: string;
  company_id: string | null;
  requester_name: string | null;
  vehicle_plate: string;
  vehicle_model: string | null;
  service_type: string | null;
  service_type_id: string | null;
  description: string | null;
  preferred_date: string | null;
  preferred_period: string | null;
  status: string;
  scheduled_date: string | null;
  scheduled_period: string | null;
  mechanic_id: string | null;
  service_order_id: string | null;
  admin_notes: string | null;
  created_by: string | null;
  created_at: string;
}

export function useWorkshopBookings() {
  const { profile, user } = useAuth();
  const [items, setItems] = useState<WorkshopBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("op_workshop_bookings" as any)
      .select("*")
      .eq("organization_id", profile.organization_id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems(((data || []) as unknown) as WorkshopBooking[]);
    setLoading(false);
  }, [profile?.organization_id]);

  useEffect(() => { fetch(); }, [fetch]);

  const add = async (input: Partial<WorkshopBooking>) => {
    if (!profile?.organization_id || !user) return null;
    const { data, error } = await supabase
      .from("op_workshop_bookings" as any)
      .insert({
        organization_id: profile.organization_id,
        created_by: user.id,
        company_id: input.company_id || null,
        requester_name: input.requester_name || profile.full_name || null,
        vehicle_plate: (input.vehicle_plate || "").toUpperCase(),
        vehicle_model: input.vehicle_model || null,
        service_type: input.service_type || null,
        service_type_id: input.service_type_id || null,
        description: input.description || null,
        preferred_date: input.preferred_date || null,
        preferred_period: input.preferred_period || null,
        status: "pendente",
      } as any)
      .select()
      .single();
    if (error) { toast.error(error.message); return null; }
    toast.success("Solicitação de agendamento enviada");
    fetch();
    return data;
  };

  const update = async (id: string, patch: Partial<WorkshopBooking>) => {
    const { error } = await supabase.from("op_workshop_bookings" as any).update(patch as any).eq("id", id);
    if (error) { toast.error(error.message); return false; }
    fetch();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("op_workshop_bookings" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else fetch();
  };

  return { items, loading, add, update, remove, refetch: fetch };
}
