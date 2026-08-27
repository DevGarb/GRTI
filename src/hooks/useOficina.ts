import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Mechanic { id: string; name: string; phone: string | null; specialty: string | null; is_active: boolean; user_id?: string | null; pin?: string | null; role?: string; }
export interface Part { id: string; name: string; code: string | null; default_price: number; is_active: boolean; }

export interface ServiceOrder {
  id: string;
  os_number: number;
  organization_id: string;
  company_id: string | null;
  vehicle_id: string | null;
  mechanic_id: string | null;
  customer_name?: string | null;

  vehicle_plate: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  vehicle_year: string | null;
  description: string | null;
  diagnosis: string | null;
  status: string;
  stage: string;
  parts_arrived_at: string | null;
  kanban_position: number;
  opened_at: string;
  finished_at: string | null;
  deadline?: string | null;
  scheduled_date?: string | null;
  scheduled_period?: string | null;
  schedule_notes?: string | null;
  schedule_order?: number | null;
  total_cost: number;
  notes: string | null;
  closure_summary?: string | null;
  closed_by?: string | null;
  award_amount?: number | null;
  award_status?: string | null;
  award_notes?: string | null;
  award_validated_by?: string | null;
  award_validated_at?: string | null;
  award_sent_at?: string | null;
  with_customer?: boolean | null;
  with_customer_at?: string | null;
  service_type_id?: string | null;
  finish_km?: number | null;
  points_requested?: number | null;
  points_approved?: number | null;
  points_status?: string | null;
  points_audited_by?: string | null;
  points_audited_at?: string | null;
  supervisor_alert?: boolean | null;
  supervisor_alert_reason?: string | null;
  supervisor_alert_note?: string | null;
  supervisor_alert_at?: string | null;
  supervisor_alert_by?: string | null;
  supervisor_alert_resolved_at?: string | null;
  supervisor_action_plan?: string | null;
  supervisor_action_due?: string | null;
  supervisor_action_by?: string | null;
  supervisor_action_at?: string | null;
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
  part_status: string;
  notes: string | null;
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
  const [partsByOs, setPartsByOs] = useState<Record<string, ServiceOrderPart[]>>({});
  const [partsCountByOs, setPartsCountByOs] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const { data } = await supabase
      .from("op_service_orders")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .order("kanban_position", { ascending: true })
      .order("opened_at", { ascending: false });
    const list = (data || []) as ServiceOrder[];
    setItems(list);
    const ids = list.map(o => o.id);
    if (ids.length) {
      const { data: pData } = await supabase.from("op_service_order_parts").select("*").in("service_order_id", ids);
      const counts: Record<string, number> = {};
      const byOs: Record<string, ServiceOrderPart[]> = {};
      ((pData || []) as ServiceOrderPart[]).forEach((r) => {
        counts[r.service_order_id] = (counts[r.service_order_id] || 0) + 1;
        (byOs[r.service_order_id] ||= []).push(r);
      });
      setPartsCountByOs(counts);
      setPartsByOs(byOs);
    } else {
      setPartsCountByOs({});
      setPartsByOs({});
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
      customer_name: input.customer_name || null,

      vehicle_plate: input.vehicle_plate || null,
      vehicle_model: input.vehicle_model || null,
      vehicle_color: input.vehicle_color || null,
      vehicle_year: input.vehicle_year || null,
      description: input.description || null,
      diagnosis: input.diagnosis || null,
      status: input.status || "Aberta",
      stage: input.stage || "analise",
      deadline: input.deadline || null,
      opened_at: input.opened_at || new Date().toISOString().slice(0, 10),
      notes: input.notes || null,
      service_type_id: input.service_type_id || null,
    } as any).select().single();
    if (error) { toast.error(error.message); return null; }
    toast.success("OS criada");
    fetch();
    return data;
  };
  const addPart = async (serviceOrderId: string, input: { part_name: string; quantity: number; unit_price?: number; part_status?: string }) => {
    const { data, error } = await supabase.from("op_service_order_parts").insert({
      service_order_id: serviceOrderId,
      part_name: input.part_name,
      quantity: input.quantity || 1,
      unit_price: input.unit_price ?? 0,
      part_status: input.part_status || "solicitada",
    }).select().single();
    if (error) { toast.error(error.message); return null; }
    const row = data as ServiceOrderPart;
    setPartsByOs(prev => ({ ...prev, [serviceOrderId]: [...(prev[serviceOrderId] || []), row] }));
    setPartsCountByOs(prev => ({ ...prev, [serviceOrderId]: (prev[serviceOrderId] || 0) + 1 }));
    fetch();
    return row;
  };
  const setPartStatusForOs = async (serviceOrderId: string, part_status: string) => {
    const { error } = await supabase.from("op_service_order_parts").update({ part_status }).eq("service_order_id", serviceOrderId);
    if (error) toast.error(error.message); else fetch();
  };

  const setPartStatus = async (partId: string, part_status: string) => {
    const { error } = await supabase.from("op_service_order_parts").update({ part_status }).eq("id", partId);
    if (error) toast.error(error.message); else fetch();
  };
  const removePart = async (partId: string) => {
    const { error } = await supabase.from("op_service_order_parts").delete().eq("id", partId);
    if (error) toast.error(error.message); else fetch();
  };

  const setPartPrice = async (partId: string, unit_price: number) => {
    setPartsByOs(prev => {
      const next: Record<string, ServiceOrderPart[]> = {};
      Object.entries(prev).forEach(([k, list]) => {
        next[k] = list.map(p => (p.id === partId ? { ...p, unit_price } : p));
      });
      return next;
    });
    const { error } = await supabase.from("op_service_order_parts").update({ unit_price }).eq("id", partId);
    if (error) toast.error(error.message);
  };

  const movePriority = async (order: ServiceOrder, dir: -1 | 1) => {
    const queue = items
      .filter(o => o.stage === order.stage)
      .sort((a, b) => (a.kanban_position - b.kanban_position) || a.os_number - b.os_number);
    const i = queue.findIndex(o => o.id === order.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= queue.length) return;
    const a = queue[i], b = queue[j];
    const posA = a.kanban_position ?? 0, posB = b.kanban_position ?? 0;
    const newA = posA === posB ? posB + dir : posB;
    const newB = posA === posB ? posA : posA;
    await Promise.all([
      supabase.from("op_service_orders").update({ kanban_position: newA }).eq("id", a.id),
      supabase.from("op_service_orders").update({ kanban_position: newB }).eq("id", b.id),
    ]);
    fetch();
  };

  const update = async (id: string, patch: Partial<ServiceOrder>) => {
    const { error } = await supabase.from("op_service_orders").update(patch).eq("id", id);
    if (error) toast.error(error.message); else fetch();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("op_service_orders").delete().eq("id", id);
    if (error) toast.error(error.message); else fetch();
  };
  return { items, partsByOs, partsCountByOs, loading, add, update, remove, addPart, setPartStatus, setPartPrice, setPartStatusForOs, movePriority, refetch: fetch, removePart };

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
  const updatePart = async (id: string, patch: Partial<ServiceOrderPart>) => {
    const { error } = await supabase.from("op_service_order_parts").update(patch).eq("id", id);
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

  return { parts, photos, addPart, updatePart, removePart, uploadPhoto, removePhoto, refetch: fetch };
}

export interface ServiceChecklistItem {
  id: string;
  organization_id: string;
  service_order_id: string;
  label: string;
  position: number;
  done: boolean;
  done_at: string | null;
  done_by: string | null;
}

/** Checklist de serviço das OS da organização, agrupado por OS. */
export function useServiceChecklists() {
  const { profile, user } = useAuth();
  const [byOs, setByOs] = useState<Record<string, ServiceChecklistItem[]>>({});

  const fetch = useCallback(async () => {
    if (!profile?.organization_id) return;
    const { data } = await supabase
      .from("op_service_order_checklist")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .order("position");
    const map: Record<string, ServiceChecklistItem[]> = {};
    ((data || []) as ServiceChecklistItem[]).forEach((r) => { (map[r.service_order_id] ||= []).push(r); });
    setByOs(map);
  }, [profile?.organization_id]);
  useEffect(() => { fetch(); }, [fetch]);

  const toggle = async (item: ServiceChecklistItem, done?: boolean) => {
    const next = done ?? !item.done;
    const { error } = await supabase.from("op_service_order_checklist").update({
      done: next,
      done_at: next ? new Date().toISOString() : null,
      done_by: next ? user?.id || null : null,
    }).eq("id", item.id);
    if (error) toast.error(error.message); else fetch();
  };

  /** Marca (por rótulo) um item de uma OS como concluído, se existir e ainda não estiver. */
  const markLabelDone = async (serviceOrderId: string, label: string) => {
    const item = (byOs[serviceOrderId] || []).find((i) => i.label === label);
    if (!item || item.done) return;
    await toggle(item, true);
  };

  const addItem = async (serviceOrderId: string, label: string) => {
    if (!profile?.organization_id || !label.trim()) return;
    const list = byOs[serviceOrderId] || [];
    const { error } = await supabase.from("op_service_order_checklist").insert({
      organization_id: profile.organization_id,
      service_order_id: serviceOrderId,
      label: label.trim(),
      position: (list[list.length - 1]?.position ?? 0) + 1,
    });
    if (error) toast.error(error.message); else fetch();
  };

  const removeItem = async (id: string) => {
    const { error } = await supabase.from("op_service_order_checklist").delete().eq("id", id);
    if (error) toast.error(error.message); else fetch();
  };

  return { byOs, toggle, markLabelDone, addItem, removeItem, refetch: fetch };
}
