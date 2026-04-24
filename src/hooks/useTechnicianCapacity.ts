import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface TechCapacity {
  id: string;
  user_id: string;
  project_id: string | null;
  organization_id: string;
  points_per_sprint: number;
  fullName?: string | null;
}

export function useTechnicianCapacity(projectId: string | undefined) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: ["tech-capacity", projectId, orgId],
    queryFn: async () => {
      if (!orgId) return [] as TechCapacity[];

      // Lista todos os técnicos da org
      const { data: techs, error: te } = await supabase.rpc("get_org_technicians");
      if (te) throw te;

      // Capacidade existente (project-specific OU default null)
      const { data: caps } = await supabase
        .from("technician_capacity")
        .select("*")
        .eq("organization_id", orgId)
        .or(`project_id.eq.${projectId},project_id.is.null`);

      const capMap = new Map<string, any>();
      // Prioriza específica do projeto sobre default null
      for (const c of (caps as any[]) || []) {
        const existing = capMap.get(c.user_id);
        if (!existing || (existing.project_id == null && c.project_id != null)) {
          capMap.set(c.user_id, c);
        }
      }

      return (techs || []).map((t: any) => {
        const c = capMap.get(t.user_id);
        return {
          id: c?.id ?? `virtual-${t.user_id}`,
          user_id: t.user_id,
          project_id: c?.project_id ?? null,
          organization_id: orgId,
          points_per_sprint: c?.points_per_sprint ?? 8,
          fullName: t.full_name,
        } as TechCapacity;
      });
    },
    enabled: !!orgId,
  });
}

export function useUpsertTechnicianCapacity() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async ({
      userId,
      projectId,
      points,
    }: { userId: string; projectId: string | null; points: number }) => {
      const orgId = profile?.organization_id;
      if (!orgId) throw new Error("Organização não definida");

      // tenta upsert manual (unique index não funciona direto com COALESCE)
      const query = supabase
        .from("technician_capacity")
        .select("id")
        .eq("user_id", userId)
        .eq("organization_id", orgId);
      const { data: exist } = projectId
        ? await query.eq("project_id", projectId)
        : await query.is("project_id", null);

      if (exist && exist.length > 0) {
        const { error } = await supabase
          .from("technician_capacity")
          .update({ points_per_sprint: points })
          .eq("id", exist[0].id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("technician_capacity")
          .insert({
            user_id: userId,
            project_id: projectId,
            organization_id: orgId,
            points_per_sprint: points,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tech-capacity"] });
      toast.success("Capacidade atualizada");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

/** Carga atual (pts) por técnico em uma sprint específica. */
export function useTechnicianLoadInSprint(sprintId: string | null | undefined) {
  return useQuery({
    queryKey: ["tech-load", sprintId],
    queryFn: async () => {
      if (!sprintId) return {} as Record<string, number>;
      const [{ data: tickets }, { data: tasks }] = await Promise.all([
        supabase.from("tickets").select("assigned_to, story_points").eq("sprint_id", sprintId),
        supabase.from("project_tasks").select("assignee_id, story_points").eq("sprint_id", sprintId),
      ]);
      const map: Record<string, number> = {};
      for (const t of (tickets as any[]) || []) {
        if (!t.assigned_to) continue;
        map[t.assigned_to] = (map[t.assigned_to] || 0) + (t.story_points || 0);
      }
      for (const t of (tasks as any[]) || []) {
        if (!t.assignee_id) continue;
        map[t.assignee_id] = (map[t.assignee_id] || 0) + (t.story_points || 0);
      }
      return map;
    },
    enabled: !!sprintId,
  });
}
