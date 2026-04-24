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
  status: "planejada" | "ativa" | "concluida" | "fechada" | "cancelada" | string;
  closed_at?: string | null;
  activated_at?: string | null;
  start_date: string | null;
  end_date: string | null;
  capacity_points: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SprintWithProgress extends Sprint {
  totalPoints: number;
  completedPoints: number;
  ticketCount: number;
  taskCount: number;
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
        supabase.from("tickets").select("sprint_id, status, story_points").in("sprint_id", sprintIds),
        supabase.from("project_tasks").select("sprint_id, status, story_points").in("sprint_id", sprintIds),
      ]);

      return sprints.map<SprintWithProgress>((s) => {
        const sTickets = (tickets || []).filter((t: any) => t.sprint_id === s.id);
        const sTasks = (tasks || []).filter((t: any) => t.sprint_id === s.id);
        const totalPoints =
          sTickets.reduce((sum: number, t: any) => sum + (t.story_points || 0), 0) +
          sTasks.reduce((sum: number, t: any) => sum + (t.story_points || 0), 0);
        const completedPoints =
          sTickets
            .filter((t: any) => RESOLVED_STATUSES.includes(t.status))
            .reduce((sum: number, t: any) => sum + (t.story_points || 0), 0) +
          sTasks
            .filter((t: any) => t.status === "done")
            .reduce((sum: number, t: any) => sum + (t.story_points || 0), 0);
        return {
          ...s,
          totalPoints,
          completedPoints,
          ticketCount: sTickets.length,
          taskCount: sTasks.length,
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
  capacity_points?: number;
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
          capacity_points: input.capacity_points ?? 0,
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
      // libera chamados e tarefas
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
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      // só uma sprint ativa por vez por projeto
      await supabase.from("sprints").update({ status: "planejada" }).eq("project_id", projectId).eq("status", "ativa");
      const { data, error } = await supabase.from("sprints").update({ status: "ativa" }).eq("id", id).select().single();
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
