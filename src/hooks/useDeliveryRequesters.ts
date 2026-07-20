import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface DeliveryRequester {
  id: string;
  organization_id: string;
  name: string;
  phone: string | null;
  pin: string | null;
  is_active: boolean;
  created_at: string;
  user_id?: string | null;
}

export function useDeliveryRequesters() {
  const { profile, user } = useAuth();
  const [items, setItems] = useState<DeliveryRequester[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const { data } = await supabase
      .from("op_delivery_requesters")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .order("name");
    setItems((data || []) as DeliveryRequester[]);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [profile?.organization_id]);

  const add = async (input: Partial<DeliveryRequester>) => {
    if (!profile?.organization_id || !user) return;
    const { error } = await supabase.from("op_delivery_requesters").insert({
      organization_id: profile.organization_id,
      created_by: user.id,
      name: input.name || "",
      phone: input.phone || null,
      pin: input.pin || null,
      is_active: input.is_active ?? true,
      user_id: input.user_id || null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Solicitante cadastrado"); fetch(); }
  };

  const update = async (id: string, patch: Partial<DeliveryRequester>) => {
    const { error } = await supabase.from("op_delivery_requesters").update(patch).eq("id", id);
    if (error) toast.error(error.message); else fetch();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("op_delivery_requesters").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Removido"); fetch(); }
  };

  return { items, loading, add, update, remove, refetch: fetch };
}
