import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Project {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  goal: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  owner_id: string | null;
  organization_id: string | null;
  total_points_target: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectAggregate extends Project {
  ownerName?: string | null;
  totalLinkedTickets: number;
  completedPoints: number;
  totalPoints: number;
  activeSprints: number;
}

const RESOLVED_STATUSES = ["Resolvido", "Aprovado", "Aguardando Aprovação", "Fechado"];

export function useProjects() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  // realtime
  useEffect(() => {
    const ch = supabase
      .channel(`projects-realtime`)
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => {
        queryClient.invalidateQueries({ queryKey: ["projects"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "sprints" }, () => {
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        queryClient.invalidateQueries({ queryKey: ["sprints"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      let query = supabase.from("projects").select("*").order("created_at", { ascending: false });
      if (orgId) query = query.or(`organization_id.eq.${orgId},organization_id.is.null`);
      const { data, error } = await query;
      if (error) throw error;
      const projects = (data || []) as Project[];
      if (projects.length === 0) return [] as ProjectAggregate[];

      const projectIds = projects.map((p) => p.id);

      // tickets agregados
      const { data: tickets } = await supabase
        .from("tickets")
        .select("project_id, status, story_points")
        .in("project_id", projectIds);

      // tasks agregadas
      const { data: tasks } = await supabase
        .from("project_tasks")
        .select("project_id, status, story_points")
        .in("project_id", projectIds);

      // sprints
      const { data: sprints } = await supabase
        .from("sprints")
        .select("project_id, status")
        .in("project_id", projectIds);

      // owners
      const ownerIds = projects.map((p) => p.owner_id).filter(Boolean) as string[];
      const { data: owners } = ownerIds.length
        ? await supabase.from("profiles").select("user_id, full_name").in("user_id", ownerIds)
        : { data: [] as any[] };
      const ownerMap = new Map((owners || []).map((o: any) => [o.user_id, o.full_name]));

      return projects.map<ProjectAggregate>((p) => {
        const pTickets = (tickets || []).filter((t: any) => t.project_id === p.id);
        const pTasks = (tasks || []).filter((t: any) => t.project_id === p.id);
        const totalPoints =
          pTickets.reduce((s: number, t: any) => s + (t.story_points || 0), 0) +
          pTasks.reduce((s: number, t: any) => s + (t.story_points || 0), 0);
        const completedPoints =
          pTickets
            .filter((t: any) => RESOLVED_STATUSES.includes(t.status))
            .reduce((s: number, t: any) => s + (t.story_points || 0), 0) +
          pTasks
            .filter((t: any) => t.status === "done")
            .reduce((s: number, t: any) => s + (t.story_points || 0), 0);
        const activeSprints = (sprints || []).filter(
          (s: any) => s.project_id === p.id && s.status === "ativa"
        ).length;
        return {
          ...p,
          ownerName: p.owner_id ? ownerMap.get(p.owner_id) : null,
          totalLinkedTickets: pTickets.length,
          completedPoints,
          totalPoints,
          activeSprints,
        };
      });
    },
  });
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
      if (error) throw error;
      return data as Project;
    },
    enabled: !!projectId,
  });
}

interface CreateProjectInput {
  name: string;
  code?: string;
  description?: string;
  goal?: string;
  status?: string;
  start_date?: string | null;
  end_date?: string | null;
  total_points_target?: number;
  owner_id?: string | null;
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          ...input,
          status: input.status || "Planejamento",
          organization_id: profile?.organization_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto criado!");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      const { data, error } = await supabase.from("projects").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
      toast.success("Projeto atualizado!");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // limpa vínculos
      await supabase.from("tickets").update({ project_id: null, sprint_id: null }).eq("project_id", id);
      await supabase.from("project_tasks").delete().eq("project_id", id);
      await supabase.from("sprints").delete().eq("project_id", id);
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto excluído!");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}
