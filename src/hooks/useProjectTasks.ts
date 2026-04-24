import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ProjectTask {
  id: string;
  project_id: string;
  sprint_id: string | null;
  organization_id: string | null;
  title: string;
  description: string | null;
  status: "todo" | "doing" | "done" | string;
  story_points: number;
  assignee_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useProjectTasks(projectId: string | undefined, sprintId?: string | null) {
  return useQuery({
    queryKey: ["project-tasks", projectId, sprintId ?? "all"],
    queryFn: async () => {
      if (!projectId) return [] as ProjectTask[];
      let q = supabase.from("project_tasks").select("*").eq("project_id", projectId);
      if (sprintId === null) q = q.is("sprint_id", null);
      else if (sprintId) q = q.eq("sprint_id", sprintId);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ProjectTask[];
    },
    enabled: !!projectId,
  });
}

export function useCreateProjectTask() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<ProjectTask> & { project_id: string; title: string }) => {
      const { data, error } = await supabase
        .from("project_tasks")
        .insert({
          ...input,
          status: input.status || "todo",
          story_points: input.story_points ?? 1,
          created_by: user!.id,
          organization_id: profile?.organization_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["sprints"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Tarefa criada!");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useUpdateProjectTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProjectTask> & { id: string }) => {
      const { data, error } = await supabase.from("project_tasks").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["sprints"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteProjectTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["sprints"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Tarefa excluída");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}
