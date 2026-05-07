import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Driver { id: string; name: string; phone: string | null; default_vehicle_type: string; is_active: boolean; user_id: string | null; }
export interface Company { id: string; name: string; contact_name: string | null; contact_phone: string | null; is_active: boolean; }
export interface Vehicle { id: string; plate: string; model: string | null; vehicle_type: string; is_active: boolean; }

export function useDrivers() {
  const { profile, user } = useAuth();
  const [items, setItems] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const { data } = await supabase.from("op_drivers").select("*").eq("organization_id", profile.organization_id).order("name");
    setItems((data || []) as Driver[]);
    setLoading(false);
  }, [profile?.organization_id]);
  useEffect(() => { fetch(); }, [fetch]);

  const add = async (input: Partial<Driver>) => {
    if (!profile?.organization_id || !user) return;
    const { error } = await supabase.from("op_drivers").insert({ ...input, organization_id: profile.organization_id, created_by: user.id, name: input.name || "" });
    if (error) toast.error(error.message); else { toast.success("Motorista cadastrado"); fetch(); }
  };
  const update = async (id: string, patch: Partial<Driver>) => {
    const { error } = await supabase.from("op_drivers").update(patch).eq("id", id);
    if (error) toast.error(error.message); else fetch();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("op_drivers").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Removido"); fetch(); }
  };
  return { items, loading, add, update, remove, refetch: fetch };
}

export function useCompanies() {
  const { profile, user } = useAuth();
  const [items, setItems] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const { data } = await supabase.from("op_companies").select("*").eq("organization_id", profile.organization_id).order("name");
    setItems((data || []) as Company[]);
    setLoading(false);
  }, [profile?.organization_id]);
  useEffect(() => { fetch(); }, [fetch]);

  const add = async (input: Partial<Company>) => {
    if (!profile?.organization_id || !user) return;
    const { error } = await supabase.from("op_companies").insert({ ...input, organization_id: profile.organization_id, created_by: user.id, name: input.name || "" });
    if (error) toast.error(error.message); else { toast.success("Empresa cadastrada"); fetch(); }
  };
  const update = async (id: string, patch: Partial<Company>) => {
    const { error } = await supabase.from("op_companies").update(patch).eq("id", id);
    if (error) toast.error(error.message); else fetch();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("op_companies").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Removido"); fetch(); }
  };
  return { items, loading, add, update, remove, refetch: fetch };
}

export function useVehicles() {
  const { profile, user } = useAuth();
  const [items, setItems] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const { data } = await supabase.from("op_vehicles").select("*").eq("organization_id", profile.organization_id).order("plate");
    setItems((data || []) as Vehicle[]);
    setLoading(false);
  }, [profile?.organization_id]);
  useEffect(() => { fetch(); }, [fetch]);

  const add = async (input: Partial<Vehicle>) => {
    if (!profile?.organization_id || !user) return;
    const { error } = await supabase.from("op_vehicles").insert({ ...input, organization_id: profile.organization_id, created_by: user.id, plate: input.plate || "" });
    if (error) toast.error(error.message); else { toast.success("Veículo cadastrado"); fetch(); }
  };
  const update = async (id: string, patch: Partial<Vehicle>) => {
    const { error } = await supabase.from("op_vehicles").update(patch).eq("id", id);
    if (error) toast.error(error.message); else fetch();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("op_vehicles").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Removido"); fetch(); }
  };
  return { items, loading, add, update, remove, refetch: fetch };
}
