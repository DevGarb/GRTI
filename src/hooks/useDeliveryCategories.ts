import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface DeliveryCategory {
  id: string;
  organization_id: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useDeliveryCategories() {
  const { profile, user } = useAuth();
  const [items, setItems] = useState<DeliveryCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const { data } = await supabase
      .from("op_delivery_categories")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    setItems((data || []) as DeliveryCategory[]);
    setLoading(false);
  }, [profile?.organization_id]);

  useEffect(() => { fetch(); }, [fetch]);

  const add = async (input: Partial<DeliveryCategory>) => {
    if (!profile?.organization_id || !user) return;
    const { error } = await supabase.from("op_delivery_categories").insert({
      organization_id: profile.organization_id,
      created_by: user.id,
      name: input.name || "",
      color: input.color || "#0d4a56",
      icon: input.icon || "Package",
      sort_order: input.sort_order ?? items.length,
      is_active: input.is_active ?? true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Categoria criada");
    fetch();
  };

  const update = async (id: string, patch: Partial<DeliveryCategory>) => {
    const { error } = await supabase.from("op_delivery_categories").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    fetch();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("op_delivery_categories").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Removida"); fetch(); }
  };

  const activeItems = items.filter(c => c.is_active);
  return { items, activeItems, loading, add, update, remove, refetch: fetch };
}
