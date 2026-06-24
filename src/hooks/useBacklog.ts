import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface BacklogItem {
  id: string;
  project_id: string;
  sprint_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  story_points: number;
  assignee_id: string | null;
  co_assignee_id: string | null;
  planned_date: string | null;
  delivered_date: string | null;
  rework_count: number;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
  project_name?: string;
  assignee_name?: string;
}

export const TASK_STATUSES = [
  "Pendente",
  "Em Desenvolvimento",
  "Em Homologação",
  "Concluído",
  "Retrabalho",
];

export const TASK_PRIORITIES = ["Baixa", "Média", "Alta", "Crítica"];

export function useBacklog() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id ?? null;
  return useQuery({
    queryKey: ["backlog", orgId],
    queryFn: async () => {
      let q = supabase.from("project_tasks").select("*").order("created_at", { ascending: false });
      if (orgId) q = q.or(`organization_id.eq.${orgId},organization_id.is.null`);
      const { data, error } = await q;
      if (error) throw error;
      const items = (data || []) as any[];
      if (items.length === 0) return [] as BacklogItem[];
      const projectIds = [...new Set(items.map((i) => i.project_id))];
      const userIds = [...new Set(items.map((i) => i.assignee_id).filter(Boolean))] as string[];
      const [{ data: projs }, { data: profs }] = await Promise.all([
        supabase.from("projects").select("id, name").in("id", projectIds),
        userIds.length
          ? supabase.from("profiles").select("user_id, full_name").in("user_id", userIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const projMap = new Map((projs || []).map((p: any) => [p.id, p.name]));
      const userMap = new Map((profs || []).map((p: any) => [p.user_id, p.full_name]));
      return items.map((i) => ({
        ...i,
        project_name: projMap.get(i.project_id),
        assignee_name: i.assignee_id ? userMap.get(i.assignee_id) : null,
      })) as BacklogItem[];
    },
  });
}

export function useUpdateBacklogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BacklogItem> & { id: string }) => {
      const { data, error } = await supabase.from("project_tasks").update(updates).eq("id", id).select().maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backlog"] });
      qc.invalidateQueries({ queryKey: ["project-tasks"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["delivery-calendar"] });
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useRescheduleTask() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      taskId,
      oldDate,
      newDate,
      reason,
    }: {
      taskId: string;
      oldDate: string | null;
      newDate: string;
      reason: string;
    }) => {
      const { error: e1 } = await supabase
        .from("project_tasks")
        .update({ planned_date: newDate })
        .eq("id", taskId);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("delivery_reschedules").insert({
        task_id: taskId,
        old_date: oldDate,
        new_date: newDate,
        reason,
        user_id: user!.id,
      });
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backlog"] });
      qc.invalidateQueries({ queryKey: ["delivery-calendar"] });
      toast.success("Entrega reagendada");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}
