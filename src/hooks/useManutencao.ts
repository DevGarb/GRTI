import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Site {
  id: string;
  name: string;
  address: string | null;
  responsible: string | null;
  phone: string | null;
  is_active: boolean;
}

export interface MaintenanceOrder {
  id: string;
  om_number: number;
  site_id: string | null;
  category: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  responsible: string | null;
  deadline: string | null;
  opened_at: string;
  finished_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface MaintenancePhoto {
  id: string;
  maintenance_order_id: string;
  photo_url: string;
  photo_type: string;
  created_at: string;
}

export interface ChecklistTemplate {
  id: string;
  site_id: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface ChecklistItem {
  id: string;
  template_id: string;
  label: string;
  position: number;
}

export interface ChecklistExecution {
  id: string;
  template_id: string;
  site_id: string | null;
  executed_at: string;
  responses: Record<string, boolean>;
  notes: string | null;
  executed_by: string;
  created_at: string;
}

export const MAINT_CATEGORIES = ["Elétrica", "Hidráulica", "Civil", "Ar-condicionado", "Outros"];
export const MAINT_PRIORITIES = ["Baixa", "Média", "Alta", "Urgente"];
export const MAINT_STATUSES = ["Aberta", "Em execução", "Concluída", "Cancelada"];

export function useSites() {
  const { profile, user } = useAuth();
  const [items, setItems] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const { data } = await supabase.from("op_sites").select("*").eq("organization_id", profile.organization_id).order("name");
    setItems((data || []) as Site[]);
    setLoading(false);
  }, [profile?.organization_id]);
  useEffect(() => { fetch(); }, [fetch]);

  const add = async (input: Partial<Site>) => {
    if (!profile?.organization_id || !user) return;
    const { error } = await supabase.from("op_sites").insert({
      ...input, organization_id: profile.organization_id, created_by: user.id, name: input.name || ""
    });
    if (error) toast.error(error.message); else { toast.success("Sede cadastrada"); fetch(); }
  };
  const update = async (id: string, patch: Partial<Site>) => {
    const { error } = await supabase.from("op_sites").update(patch).eq("id", id);
    if (error) toast.error(error.message); else fetch();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("op_sites").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Removida"); fetch(); }
  };
  return { items, loading, add, update, remove, refetch: fetch };
}

export function useMaintenanceOrders() {
  const { profile, user } = useAuth();
  const [items, setItems] = useState<MaintenanceOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const { data } = await supabase.from("op_maintenance_orders").select("*")
      .eq("organization_id", profile.organization_id).order("created_at", { ascending: false });
    setItems((data || []) as MaintenanceOrder[]);
    setLoading(false);
  }, [profile?.organization_id]);
  useEffect(() => { fetch(); }, [fetch]);

  const add = async (input: Partial<MaintenanceOrder>) => {
    if (!profile?.organization_id || !user) return null;
    const { data, error } = await supabase.from("op_maintenance_orders").insert({
      ...input,
      organization_id: profile.organization_id,
      created_by: user.id,
      title: input.title || "",
    }).select().single();
    if (error) { toast.error(error.message); return null; }
    toast.success("OM criada"); fetch();
    return data;
  };
  const update = async (id: string, patch: Partial<MaintenanceOrder>) => {
    const { error } = await supabase.from("op_maintenance_orders").update(patch).eq("id", id);
    if (error) toast.error(error.message); else fetch();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("op_maintenance_orders").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Removida"); fetch(); }
  };

  const listPhotos = async (omId: string): Promise<MaintenancePhoto[]> => {
    const { data } = await supabase.from("op_maintenance_photos").select("*")
      .eq("maintenance_order_id", omId).order("created_at");
    return (data || []) as MaintenancePhoto[];
  };
  const uploadPhoto = async (omId: string, file: File, type: "antes" | "depois") => {
    if (!user) return;
    const path = `maint/${omId}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from("op-service-orders").upload(path, file);
    if (upErr) { toast.error(upErr.message); return; }
    const { data: pub } = supabase.storage.from("op-service-orders").getPublicUrl(path);
    const { error } = await supabase.from("op_maintenance_photos").insert({
      maintenance_order_id: omId, photo_url: pub.publicUrl, photo_type: type, uploaded_by: user.id,
    });
    if (error) toast.error(error.message); else toast.success("Foto enviada");
  };
  const removePhoto = async (id: string) => {
    const { error } = await supabase.from("op_maintenance_photos").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  return { items, loading, add, update, remove, refetch: fetch, listPhotos, uploadPhoto, removePhoto };
}

export function useChecklistTemplates() {
  const { profile, user } = useAuth();
  const [items, setItems] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const { data } = await supabase.from("op_checklist_templates").select("*")
      .eq("organization_id", profile.organization_id).order("name");
    setItems((data || []) as ChecklistTemplate[]);
    setLoading(false);
  }, [profile?.organization_id]);
  useEffect(() => { fetch(); }, [fetch]);

  const add = async (input: Partial<ChecklistTemplate>) => {
    if (!profile?.organization_id || !user) return null;
    const { data, error } = await supabase.from("op_checklist_templates").insert({
      ...input, organization_id: profile.organization_id, created_by: user.id, name: input.name || "",
    }).select().single();
    if (error) { toast.error(error.message); return null; }
    toast.success("Modelo criado"); fetch();
    return data;
  };
  const update = async (id: string, patch: Partial<ChecklistTemplate>) => {
    const { error } = await supabase.from("op_checklist_templates").update(patch).eq("id", id);
    if (error) toast.error(error.message); else fetch();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("op_checklist_templates").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Removido"); fetch(); }
  };

  const listItems = async (tplId: string): Promise<ChecklistItem[]> => {
    const { data } = await supabase.from("op_checklist_items").select("*")
      .eq("template_id", tplId).order("position");
    return (data || []) as ChecklistItem[];
  };
  const addItem = async (tplId: string, label: string, position: number) => {
    const { error } = await supabase.from("op_checklist_items").insert({ template_id: tplId, label, position });
    if (error) toast.error(error.message);
  };
  const removeItem = async (id: string) => {
    const { error } = await supabase.from("op_checklist_items").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  const saveExecution = async (input: { template_id: string; site_id: string | null; responses: Record<string, boolean>; notes?: string; executed_at?: string }) => {
    if (!profile?.organization_id || !user) return;
    const { error } = await supabase.from("op_checklist_executions").insert({
      organization_id: profile.organization_id,
      template_id: input.template_id,
      site_id: input.site_id,
      responses: input.responses,
      notes: input.notes || null,
      executed_at: input.executed_at || new Date().toISOString().slice(0, 10),
      executed_by: user.id,
    });
    if (error) toast.error(error.message); else toast.success("Execução salva");
  };
  const listExecutions = async (tplId?: string): Promise<ChecklistExecution[]> => {
    if (!profile?.organization_id) return [];
    let q = supabase.from("op_checklist_executions").select("*")
      .eq("organization_id", profile.organization_id).order("executed_at", { ascending: false });
    if (tplId) q = q.eq("template_id", tplId);
    const { data } = await q;
    return (data || []) as unknown as ChecklistExecution[];
  };

  return { items, loading, add, update, remove, refetch: fetch, listItems, addItem, removeItem, saveExecution, listExecutions };
}
