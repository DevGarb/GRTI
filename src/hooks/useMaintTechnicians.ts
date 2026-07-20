import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface MaintTechnician {
  id: string;
  organization_id: string;
  name: string;
  phone: string | null;
  specialty: string | null;
  user_id: string | null;
  pin: string | null;
  is_active: boolean;
  created_at: string;
}

export function useMaintTechnicians() {
  const { profile, user } = useAuth();
  const [items, setItems] = useState<MaintTechnician[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("op_maint_technicians")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .order("name");
    setItems((data || []) as MaintTechnician[]);
    setLoading(false);
  }, [profile?.organization_id]);

  useEffect(() => { fetch(); }, [fetch]);

  const add = async (input: Partial<MaintTechnician>) => {
    if (!profile?.organization_id || !user) return;
    const { error } = await (supabase as any).from("op_maint_technicians").insert({
      organization_id: profile.organization_id,
      created_by: user.id,
      name: input.name || "",
      phone: input.phone || null,
      specialty: input.specialty || null,
      user_id: input.user_id || null,
      pin: input.pin || null,
      is_active: input.is_active ?? true,
    });
    if (error) toast.error(error.message);
    else { toast.success("Técnico cadastrado"); fetch(); }
  };

  const update = async (id: string, patch: Partial<MaintTechnician>) => {
    const { error } = await (supabase as any).from("op_maint_technicians").update(patch).eq("id", id);
    if (error) toast.error(error.message); else fetch();
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("op_maint_technicians").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Removido"); fetch(); }
  };

  return { items, loading, add, update, remove, refetch: fetch };
}
