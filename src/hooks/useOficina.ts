import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Mechanic { id: string; name: string; phone: string | null; specialty: string | null; is_active: boolean; user_id?: string | null; }
export interface Part { id: string; name: string; code: string | null; default_price: number; is_active: boolean; }

export interface ServiceOrder {
  id: string;
  os_number: number;
  organization_id: string;
  company_id: string | null;
  vehicle_id: string | null;
  mechanic_id: string | null;
  vehicle_plate: string | null;
  vehicle_model: string | null;
  description: string | null;
  diagnosis: string | null;
  status: string;
  opened_at: string;
  finished_at: string | null;
  deadline?: string | null;
  total_cost: number;
  notes: string | null;
  closure_summary?: string | null;
  closed_by?: string | null;
  created_by: string;
  created_at: string;
}

export interface ServiceOrderPart {
  id: string;
  service_order_id: string;
  part_id: string | null;
  part_name: string;
  quantity: number;
  unit_price: number;
}

export interface ServiceOrderPhoto {
  id: string;
  service_order_id: string;
  photo_url: string;
  photo_type: string;
  created_at: string;
}

export function useMechanics() {
  const { profile, user } = useAuth();
  const [items, setItems] = useState<Mechanic[]>([]);
  const fetch = useCallback(async () => {
    if (!profile?.organization_id) return;
    const { data } = await supabase.from("op_mechanics").select("*").eq("organization_id", profile.organization_id).order("name");
    setItems((data || []) as Mechanic[]);
  }, [profile?.organization_id]);
  useEffect(() => { fetch(); }, [fetch]);
  const add = async (input: Partial<Mechanic>) => {
    if (!profile?.organization_id || !user) return;
    const { error } = await supabase.from("op_mechanics").insert({ ...input, organization_id: profile.organization_id, created_by: user.id, name: input.name || "" });
    if (error) toast.error(error.message); else { toast.success("Mecânico cadastrado"); fetch(); }
  };
  const update = async (id: string, patch: Partial<Mechanic>) => {
    const { error } = await supabase.from("op_mechanics").update(patch).eq("id", id);
    if (error) toast.error(error.message); else fetch();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("op_mechanics").delete().eq("id", id);
    if (error) toast.error(error.message); else fetch();
  };
  return { items, add, update, remove, refetch: fetch };
}

export function useParts() {
  const { profile, user } = useAuth();
  const [items, setItems] = useState<Part[]>([]);
  const fetch = useCallback(async () => {
    if (!profile?.organization_id) return;
    const { data } = await supabase.from("op_parts").select("*").eq("organization_id", profile.organization_id).order("name");
    setItems((data || []) as Part[]);
  }, [profile?.organization_id]);
  useEffect(() => { fetch(); }, [fetch]);
  const add = async (input: Partial<Part>) => {
    if (!profile?.organization_id || !user) return;
    const { error } = await supabase.from("op_parts").insert({ ...input, organization_id: profile.organization_id, created_by: user.id, name: input.name || "" });
    if (error) toast.error(error.message); else { toast.success("Peça cadastrada"); fetch(); }
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("op_parts").delete().eq("id", id);
    if (error) toast.error(error.message); else fetch();
  };
  return { items, add, remove, refetch: fetch };
}

export function useServiceOrders() {
  const { profile, user } = useAuth();
  const [items, setItems] = useState<ServiceOrder[]>([]);
  const [partsCountByOs, setPartsCountByOs] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const { data } = await supabase.from("op_service_orders").select("*").eq("organization_id", profile.organization_id).order("opened_at", { ascending: false });
    const list = (data || []) as ServiceOrder[];
    setItems(list);
    const ids = list.map(o => o.id);
    if (ids.length) {
      const { data: pData } = await supabase.from("op_service_order_parts").select("service_order_id").in("service_order_id", ids);
      const counts: Record<string, number> = {};
      (pData || []).forEach((r: any) => { counts[r.service_order_id] = (counts[r.service_order_id] || 0) + 1; });
      setPartsCountByOs(counts);
    } else {
      setPartsCountByOs({});
    }
    setLoading(false);
  }, [profile?.organization_id]);
  useEffect(() => { fetch(); }, [fetch]);

  const add = async (input: Partial<ServiceOrder>) => {
    if (!profile?.organization_id || !user) return null;
    const { data, error } = await supabase.from("op_service_orders").insert({
      organization_id: profile.organization_id,
      created_by: user.id,
      company_id: input.company_id || null,
      vehicle_id: input.vehicle_id || null,
      mechanic_id: input.mechanic_id || null,
      vehicle_plate: input.vehicle_plate || null,
      vehicle_model: input.vehicle_model || null,
      description: input.description || null,
      diagnosis: input.diagnosis || null,
      status: input.status || "Aberta",
      opened_at: input.opened_at || new Date().toISOString().slice(0, 10),
      notes: input.notes || null,
    }).select().single();
    if (error) { toast.error(error.message); return null; }
    toast.success("OS criada");
    fetch();
    return data;
  };
  const update = async (id: string, patch: Partial<ServiceOrder>) => {
    const { error } = await supabase.from("op_service_orders").update(patch).eq("id", id);
    if (error) toast.error(error.message); else fetch();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("op_service_orders").delete().eq("id", id);
    if (error) toast.error(error.message); else fetch();
  };
  return { items, partsCountByOs, loading, add, update, remove, refetch: fetch };
}

export function useServiceOrderDetails(serviceOrderId: string | null) {
  const { user } = useAuth();
  const [parts, setParts] = useState<ServiceOrderPart[]>([]);
  const [photos, setPhotos] = useState<ServiceOrderPhoto[]>([]);

  const fetch = useCallback(async () => {
    if (!serviceOrderId) { setParts([]); setPhotos([]); return; }
    const [{ data: pData }, { data: phData }] = await Promise.all([
      supabase.from("op_service_order_parts").select("*").eq("service_order_id", serviceOrderId),
      supabase.from("op_service_order_photos").select("*").eq("service_order_id", serviceOrderId).order("created_at"),
    ]);
    setParts((pData || []) as ServiceOrderPart[]);
    setPhotos((phData || []) as ServiceOrderPhoto[]);
  }, [serviceOrderId]);
  useEffect(() => { fetch(); }, [fetch]);

  const recalcTotal = async () => {
    if (!serviceOrderId) return;
    const { data } = await supabase.from("op_service_order_parts").select("quantity, unit_price").eq("service_order_id", serviceOrderId);
    const total = (data || []).reduce((s: number, r: any) => s + Number(r.quantity) * Number(r.unit_price), 0);
    await supabase.from("op_service_orders").update({ total_cost: total }).eq("id", serviceOrderId);
  };

  const addPart = async (input: { part_id?: string | null; part_name: string; quantity: number; unit_price: number }) => {
    if (!serviceOrderId) return;
    const { error } = await supabase.from("op_service_order_parts").insert({ ...input, service_order_id: serviceOrderId });
    if (error) { toast.error(error.message); return; }
    await recalcTotal(); fetch();
  };
  const removePart = async (id: string) => {
    const { error } = await supabase.from("op_service_order_parts").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await recalcTotal(); fetch();
  };

  const uploadPhoto = async (file: File, photo_type: "antes" | "depois") => {
    if (!serviceOrderId || !user) return;
    const path = `${serviceOrderId}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("op-service-orders").upload(path, file);
    if (upErr) { toast.error(upErr.message); return; }
    const { data: { publicUrl } } = supabase.storage.from("op-service-orders").getPublicUrl(path);
    const { error } = await supabase.from("op_service_order_photos").insert({ service_order_id: serviceOrderId, photo_url: publicUrl, photo_type, uploaded_by: user.id });
    if (error) toast.error(error.message); else fetch();
  };
  const removePhoto = async (id: string) => {
    const { error } = await supabase.from("op_service_order_photos").delete().eq("id", id);
    if (error) toast.error(error.message); else fetch();
  };

  return { parts, photos, addPart, removePart, uploadPhoto, removePhoto, refetch: fetch };
}
