import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ChkFrequency = "unica" | "diaria" | "semanal" | "mensal";
export type ChkExecStatus = "pendente" | "em_andamento" | "concluida" | "atrasada";

// ============ SECTORS ============
export function useChkSectors() {
  const { profile } = useAuth();
  const org = profile?.organization_id;
  return useQuery({
    queryKey: ["chk_sectors", org],
    enabled: !!org,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chk_sectors" as any)
        .select("*")
        .eq("organization_id", org!)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useSaveChkSector() {
  const qc = useQueryClient();
  const { profile, user } = useAuth();
  return useMutation({
    mutationFn: async (input: { id?: string; name: string; description?: string }) => {
      if (input.id) {
        const { error } = await supabase.from("chk_sectors" as any).update({ name: input.name, description: input.description }).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("chk_sectors" as any).insert({
          name: input.name, description: input.description,
          organization_id: profile!.organization_id, created_by: user!.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["chk_sectors"] }); toast.success("Setor salvo"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteChkSector() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chk_sectors" as any).update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["chk_sectors"] }); toast.success("Setor removido"); },
  });
}

// ============ COMPANIES ============
export function useChkCompanies() {
  const { profile } = useAuth();
  const org = profile?.organization_id;
  return useQuery({
    queryKey: ["chk_companies", org],
    enabled: !!org,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chk_companies" as any)
        .select("*, chk_sectors(id,name)")
        .eq("organization_id", org!)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useSaveChkCompany() {
  const qc = useQueryClient();
  const { profile, user } = useAuth();
  return useMutation({
    mutationFn: async (input: { id?: string; name: string; sector_id?: string | null; document?: string; contact?: string }) => {
      if (input.id) {
        const { error } = await supabase.from("chk_companies" as any).update({
          name: input.name, sector_id: input.sector_id || null, document: input.document, contact: input.contact,
        }).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("chk_companies" as any).insert({
          name: input.name, sector_id: input.sector_id || null, document: input.document, contact: input.contact,
          organization_id: profile!.organization_id, created_by: user!.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["chk_companies"] }); toast.success("Empresa salva"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteChkCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chk_companies" as any).update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["chk_companies"] }); toast.success("Empresa removida"); },
  });
}

// ============ TEMPLATES ============
export function useChkTemplates() {
  const { profile } = useAuth();
  const org = profile?.organization_id;
  return useQuery({
    queryKey: ["chk_templates", org],
    enabled: !!org,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chk_templates" as any)
        .select("*, chk_sectors(id,name), chk_template_items(id)")
        .eq("organization_id", org!)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useChkTemplate(id?: string) {
  return useQuery({
    queryKey: ["chk_template", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chk_templates" as any)
        .select("*, chk_template_items(*)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
    },
  });
}

export function useSaveChkTemplate() {
  const qc = useQueryClient();
  const { profile, user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      id?: string; title: string; description?: string; sector_id?: string | null; frequency: ChkFrequency;
      items: Array<{ id?: string; title: string; observation?: string; weight: 1 | 2 | 3; requires_photo: boolean; sort_order: number }>;
    }) => {
      let templateId = input.id;
      const org = profile!.organization_id;
      if (templateId) {
        const { error } = await supabase.from("chk_templates" as any).update({
          title: input.title, description: input.description, sector_id: input.sector_id || null, frequency: input.frequency,
        }).eq("id", templateId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("chk_templates" as any).insert({
          title: input.title, description: input.description, sector_id: input.sector_id || null, frequency: input.frequency,
          organization_id: org, created_by: user!.id,
        }).select("id").single();
        if (error) throw error;
        templateId = (data as any).id;
      }
      // Upsert real: preserva IDs de itens existentes (evita cascade DELETE em chk_execution_items).
      const existingIds = input.items.filter((it) => it.id).map((it) => it.id as string);
      // 1) Deleta apenas os itens que o usuário removeu no editor.
      let delQ = supabase.from("chk_template_items" as any).delete().eq("template_id", templateId!);
      if (existingIds.length > 0) delQ = delQ.not("id", "in", `(${existingIds.join(",")})`);
      const { error: delErr } = await delQ;
      if (delErr) throw delErr;
      // 2) Update dos existentes / Insert dos novos, preservando sort_order pelo índice.
      for (let idx = 0; idx < input.items.length; idx++) {
        const it = input.items[idx];
        if (it.id) {
          const { error } = await supabase.from("chk_template_items" as any).update({
            title: it.title, observation: it.observation,
            weight: it.weight, requires_photo: it.requires_photo, sort_order: idx,
          }).eq("id", it.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("chk_template_items" as any).insert({
            template_id: templateId, organization_id: org,
            title: it.title, observation: it.observation,
            weight: it.weight, requires_photo: it.requires_photo, sort_order: idx,
          });
          if (error) throw error;
        }
      }
      return templateId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chk_templates"] });
      qc.invalidateQueries({ queryKey: ["chk_template"] });
      toast.success("Modelo salvo");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteChkTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chk_templates" as any).update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["chk_templates"] }); toast.success("Modelo removido"); },
  });
}

// ============ ASSIGNMENTS ============
export function useChkAssignments() {
  const { profile } = useAuth();
  const org = profile?.organization_id;
  return useQuery({
    queryKey: ["chk_assignments", org],
    enabled: !!org,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chk_assignments" as any)
        .select("*, chk_templates(id,title), chk_companies(id,name)")
        .eq("organization_id", org!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data || []) as any[];
      const userIds = Array.from(new Set(rows.map((r) => r.assigned_user_id).filter(Boolean)));
      if (userIds.length === 0) return rows;
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const map = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return rows.map((r) => ({ ...r, profiles: map.get(r.assigned_user_id) || null }));
    },
  });
}

export function useSaveChkAssignment() {
  const qc = useQueryClient();
  const { profile, user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      template_id: string; company_id: string; assigned_user_id: string;
      frequency: ChkFrequency; start_date: string; end_date?: string | null; notes?: string;
    }) => {
      if (input.id) {
        const { id, ...patch } = input;
        const { error } = await supabase.from("chk_assignments" as any).update(patch).eq("id", id);
        if (error) throw error;
        return { id };
      }
      const { data, error } = await supabase.from("chk_assignments" as any).insert({
        template_id: input.template_id, company_id: input.company_id, assigned_user_id: input.assigned_user_id,
        frequency: input.frequency, start_date: input.start_date, end_date: input.end_date, notes: input.notes,
        organization_id: profile!.organization_id, created_by: user!.id,
      }).select("id").single();
      if (error) throw error;
      // Também dispara geração da primeira execução
      await supabase.rpc("generate_recurring_executions" as any);
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["chk_assignments"] });
      qc.invalidateQueries({ queryKey: ["chk_executions"] });
      toast.success(vars.id ? "Atribuição atualizada" : "Atribuição criada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useToggleChkAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("chk_assignments" as any).update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chk_assignments"] }),
  });
}

export function useDeleteChkAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chk_assignments" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chk_assignments"] });
      qc.invalidateQueries({ queryKey: ["chk_executions"] });
      toast.success("Atribuição excluída");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ============ EXECUTIONS ============
export function useChkExecutions(filters?: { status?: ChkExecStatus | "all"; mine?: boolean; from?: string; to?: string }) {
  const { profile, user } = useAuth();
  const org = profile?.organization_id;
  return useQuery({
    queryKey: ["chk_executions", org, filters?.status, filters?.mine, filters?.from, filters?.to, user?.id],
    enabled: !!org,
    queryFn: async () => {
      let q = supabase
        .from("chk_executions" as any)
        .select("*, chk_templates(id,title), chk_companies(id,name)")
        .eq("organization_id", org!)
        .order("target_date", { ascending: false });
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters?.mine) q = q.eq("assigned_user_id", user!.id);
      if (filters?.from) q = q.gte("target_date", filters.from);
      if (filters?.to) q = q.lte("target_date", filters.to);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data || []) as any[];
      const userIds = Array.from(new Set(rows.map((r) => r.assigned_user_id).filter(Boolean)));
      if (userIds.length === 0) return rows;
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const map = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return rows.map((r) => ({ ...r, profiles: map.get(r.assigned_user_id) || null }));
    },
  });
}

export function useChkExecution(id?: string) {
  return useQuery({
    queryKey: ["chk_execution", id],
    enabled: !!id,
    queryFn: async () => {
      const { data: exec, error: e1 } = await supabase
        .from("chk_executions" as any)
        .select("*, chk_templates(id,title,description), chk_companies(id,name)")
        .eq("id", id!)
        .single();
      if (e1) throw e1;
      const { data: items, error: e2 } = await supabase
        .from("chk_execution_items" as any)
        .select("*, chk_template_items(*)")
        .eq("execution_id", id!);
      if (e2) throw e2;
      const sorted = (items as any[]).sort((a, b) => (a.chk_template_items?.sort_order ?? 0) - (b.chk_template_items?.sort_order ?? 0));
      return { ...(exec as any), items: sorted };
    },
  });
}

export function useSaveChkExecutionItem() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { id: string; done?: boolean; observation?: string; photo_path?: string | null }) => {
      const patch: any = { answered_at: new Date().toISOString(), answered_by: user!.id };
      if (input.done !== undefined) patch.done = input.done;
      if (input.observation !== undefined) patch.observation = input.observation;
      if (input.photo_path !== undefined) patch.photo_path = input.photo_path;
      const { error } = await supabase.from("chk_execution_items" as any).update(patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["chk_execution"] });
      qc.invalidateQueries({ queryKey: ["chk_executions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCompleteChkExecution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chk_executions" as any).update({
        status: "concluida", completed_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chk_executions"] });
      qc.invalidateQueries({ queryKey: ["chk_execution"] });
      toast.success("Checklist concluído");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ============ REPORT ============
export function useChkReport(from: string, to: string) {
  const { profile } = useAuth();
  const org = profile?.organization_id;
  return useQuery({
    queryKey: ["chk_report", org, from, to],
    enabled: !!org,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_checklists_report" as any, {
        _organization_id: org!, _from: from, _to: to,
      });
      if (error) throw error;
      return data as any;
    },
  });
}

// ============ PHOTO UPLOAD ============
export async function uploadChkPhoto(orgId: string, executionId: string, itemId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${orgId}/${executionId}/${itemId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("checklist-photos").upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return path;
}

export async function getChkPhotoUrl(path: string): Promise<string> {
  const { data } = await supabase.storage.from("checklist-photos").createSignedUrl(path, 3600);
  return data?.signedUrl || "";
}

// ============ ORG USERS (para dropdown de atribuição) ============
export function useChkOrgUsers() {
  const { profile } = useAuth();
  const org = profile?.organization_id;
  return useQuery({
    queryKey: ["chk_org_users", org],
    enabled: !!org,
    queryFn: async () => {
      const { data: links } = await supabase
        .from("user_organizations")
        .select("user_id")
        .eq("organization_id", org!);
      const ids = (links || []).map((l: any) => l.user_id);
      if (ids.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", ids)
        .order("full_name");
      return (data || []) as any[];
    },
  });
}
