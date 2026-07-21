import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Delivery {
  id: string;
  organization_id: string;
  company_id: string | null;
  driver_id: string | null;
  vehicle_id: string | null;
  type: string;
  period: string;
  scheduled_date: string;
  address: string | null;
  associated_name: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  closure_summary?: string | null;
  closed_at?: string | null;
  closed_by?: string | null;
  category_id?: string | null;
  vehicle_required?: string | null;
  receiver_phone?: string | null;
  requester_name?: string | null;
  kanban_position?: number | null;
}

export function useDeliveries() {
  const { profile, user } = useAuth();
  const [items, setItems] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const { data } = await supabase
      .from("op_deliveries")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .order("scheduled_date", { ascending: false });
    setItems((data || []) as Delivery[]);
    setLoading(false);
  }, [profile?.organization_id]);

  useEffect(() => { fetch(); }, [fetch]);

  const add = async (input: Partial<Delivery>) => {
    if (!profile?.organization_id || !user) return { error: new Error("no org") };
    const { error } = await supabase.from("op_deliveries").insert({
      ...input,
      organization_id: profile.organization_id,
      created_by: user.id,
      scheduled_date: input.scheduled_date!,
    });
    if (error) { toast.error(error.message); return { error }; }
    toast.success("Entrega criada");
    fetch();
    return { error: null };
  };

  const update = async (id: string, patch: Partial<Delivery>) => {
    const { error } = await supabase.from("op_deliveries").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    fetch();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("op_deliveries").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Removido"); fetch(); }
  };

  return { items, loading, add, update, remove, refetch: fetch };
}
