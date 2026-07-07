import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { isSprintEffectivelyDone } from "./useSprints";

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
  co_owner_id: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
  size?: string | null;
  value_brl?: number | null;
  completed_at?: string | null;
  completed_by?: string | null;
}

export interface ProjectAggregate extends Project {
  ownerName?: string | null;
  coOwnerName?: string | null;
  totalLinkedTickets: number;
  completedTickets: number;
  activeSprints: number;
  totalSprints: number;
  completedSprints: number;
  sprintProgressPct: number;
  totalTasks: number;
  completedTasks: number;
  backlogTasks: number;
}

const RESOLVED_STATUSES = ["Resolvido", "Aprovado", "Aguardando Aprovação", "Fechado"];

export function useProjects() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  useEffect(() => {
    const projectsFilter = orgId ? { event: "*" as const, schema: "public", table: "projects", filter: `organization_id=eq.${orgId}` } : { event: "*" as const, schema: "public", table: "projects" };
    const sprintsFilter = orgId ? { event: "*" as const, schema: "public", table: "sprints", filter: `organization_id=eq.${orgId}` } : { event: "*" as const, schema: "public", table: "sprints" };
    const ch = supabase
      .channel(`projects-realtime-${orgId ?? "all"}`)
      .on("postgres_changes", projectsFilter, () => {
        queryClient.invalidateQueries({ queryKey: ["projects"] });
      })
      .on("postgres_changes", sprintsFilter, () => {
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        queryClient.invalidateQueries({ queryKey: ["sprints"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [queryClient, orgId]);

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

      const { data: tickets } = await supabase
        .from("tickets")
        .select("project_id, sprint_id, status")
        .in("project_id", projectIds);


      const { data: sprints } = await supabase
        .from("sprints")
        .select("id, project_id, status")
        .in("project_id", projectIds);


      const { data: tasks } = await supabase
        .from("project_tasks")
        .select("project_id, sprint_id, status")
        .in("project_id", projectIds);


      const ownerIds = Array.from(
        new Set(
          projects
            .flatMap((p) => [p.owner_id, p.co_owner_id])
            .filter(Boolean) as string[]
        )
      );
      const ownerMap = new Map<string, string>();
      if (ownerIds.length) {
        const { data: owners } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", ownerIds);
        (owners || []).forEach((o: any) => ownerMap.set(o.user_id, o.full_name));
        // Fallback via SECURITY DEFINER RPC for any owner not visible via RLS
        const missing = ownerIds.filter((id) => !ownerMap.has(id));
        if (missing.length) {
          const { data: techs } = await supabase.rpc("get_org_technicians");
          (techs || []).forEach((t: any) => {
            if (missing.includes(t.user_id)) ownerMap.set(t.user_id, t.full_name);
          });
        }
      }

      return projects.map<ProjectAggregate>((p) => {
        const pTickets = (tickets || []).filter((t: any) => t.project_id === p.id);
        const completedTickets = pTickets.filter((t: any) => RESOLVED_STATUSES.includes(t.status)).length;
        const pSprints = (sprints || []).filter((s: any) => s.project_id === p.id);
        const activeSprints = pSprints.filter((s: any) => s.status === "ativa").length;
        const pTasks = (tasks || []).filter((t: any) => t.project_id === p.id);
        const completedTasks = pTasks.filter((t: any) => t.status === "Concluído" || t.status === "done").length;
        const backlogTasks = pTasks.filter((t: any) => !t.sprint_id).length;

        const completedSprints = pSprints.filter((s: any) => {
          const sTickets = (tickets || []).filter((t: any) => (t as any).sprint_id === s.id);
          const sTasks = pTasks.filter((t: any) => t.sprint_id === s.id);
          const totalItems = sTickets.length + sTasks.length;
          const doneItems =
            sTickets.filter((t: any) => RESOLVED_STATUSES.includes(t.status)).length +
            sTasks.filter((t: any) => t.status === "Concluído" || t.status === "done").length;
          const donePct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
          return isSprintEffectivelyDone(s.status, totalItems, donePct);
        }).length;
        const sprintProgressPct =
          pSprints.length > 0 ? Math.round((completedSprints / pSprints.length) * 100) : 0;

        return {
          ...p,
          ownerName: p.owner_id ? ownerMap.get(p.owner_id) : null,
          coOwnerName: p.co_owner_id ? ownerMap.get(p.co_owner_id) : null,
          totalLinkedTickets: pTickets.length,
          completedTickets,
          activeSprints,
          totalSprints: pSprints.length,
          completedSprints,
          sprintProgressPct,
          totalTasks: pTasks.length,
          completedTasks,
          backlogTasks,
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
  owner_id?: string | null;
  co_owner_id?: string | null;
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
