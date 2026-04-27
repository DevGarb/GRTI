import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Sprint {
  id: string;
  project_id: string;
  organization_id: string | null;
  name: string;
  goal: string | null;
  status: "planejada" | "ativa" | "concluida" | "cancelada" | string;
  activated_at?: string | null;
  closed_at?: string | null;
  start_date: string | null;
  end_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SprintWithProgress extends Sprint {
  ticketCount: number;
  taskCount: number;
  completedTickets: number;
  completedTasks: number;
  donePct: number;
}

const RESOLVED_STATUSES = ["Resolvido", "Aprovado", "Aguardando Aprovação", "Fechado"];

export function useSprints(projectId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;
    const ch = supabase
      .channel(`sprints-${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sprints", filter: `project_id=eq.${projectId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["sprints", projectId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => {
        queryClient.invalidateQueries({ queryKey: ["sprints", projectId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "project_tasks" }, () => {
        queryClient.invalidateQueries({ queryKey: ["sprints", projectId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [projectId, queryClient]);

  return useQuery({
    queryKey: ["sprints", projectId],
    queryFn: async () => {
      if (!projectId) return [] as SprintWithProgress[];
      const { data, error } = await supabase
        .from("sprints")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const sprints = (data || []) as Sprint[];
      if (sprints.length === 0) return [] as SprintWithProgress[];

      const sprintIds = sprints.map((s) => s.id);
      const [{ data: tickets }, { data: tasks }] = await Promise.all([
        supabase.from("tickets").select("sprint_id, status").in("sprint_id", sprintIds),
        supabase.from("project_tasks").select("sprint_id, status").in("sprint_id", sprintIds),
      ]);

      return sprints.map<SprintWithProgress>((s) => {
        const sTickets = (tickets || []).filter((t: any) => t.sprint_id === s.id);
        const sTasks = (tasks || []).filter((t: any) => t.sprint_id === s.id);
        const completedTickets = sTickets.filter((t: any) => RESOLVED_STATUSES.includes(t.status)).length;
        const completedTasks = sTasks.filter((t: any) => t.status === "done").length;
        const total = sTickets.length + sTasks.length;
        const done = completedTickets + completedTasks;
        return {
          ...s,
          ticketCount: sTickets.length,
          taskCount: sTasks.length,
          completedTickets,
          completedTasks,
          donePct: total > 0 ? Math.round((done / total) * 100) : 0,
        };
      });
    },
    enabled: !!projectId,
  });
}

interface CreateSprintInput {
  project_id: string;
  name: string;
  goal?: string;
  start_date?: string | null;
  end_date?: string | null;
}

export function useCreateSprint() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  return useMutation({
    mutationFn: async (input: CreateSprintInput) => {
      const { data, error } = await supabase
        .from("sprints")
        .insert({
          ...input,
          created_by: user!.id,
          organization_id: profile?.organization_id ?? null,
          status: "planejada",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sprints", data.project_id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Sprint criada!");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useUpdateSprint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Sprint> & { id: string }) => {
      const { data, error } = await supabase.from("sprints").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sprints", data.project_id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Sprint atualizada!");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteSprint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      await supabase.from("tickets").update({ sprint_id: null }).eq("sprint_id", id);
      await supabase.from("project_tasks").update({ sprint_id: null }).eq("sprint_id", id);
      const { error } = await supabase.from("sprints").delete().eq("id", id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["sprints", projectId] });
      toast.success("Sprint excluída!");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useActivateSprint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; projectId: string }) => {
      const { data, error } = await supabase
        .from("sprints")
        .update({ status: "ativa", activated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sprints", data.project_id] });
      toast.success("Sprint ativada!");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}
