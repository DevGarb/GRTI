import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ProjectTicket {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  type: string;
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  project_id: string | null;
  sprint_id: string | null;
  story_points: number | null;
  category_id: string | null;
  assignedName?: string | null;
  categoryScore?: number | null;
}

// Inclui chamados fechados — o usuário pode querer documentar/retroalimentar sprints
// com chamados já concluídos. Apenas excluímos os já vinculados a outro projeto.

/** Tickets vinculados a um projeto (com filtro opcional por sprint). */
export function useProjectTickets(projectId: string | undefined, sprintId?: string | null) {
  return useQuery({
    queryKey: ["project-tickets", projectId, sprintId ?? "all"],
    queryFn: async () => {
      if (!projectId) return [] as ProjectTicket[];
      let q = supabase.from("tickets").select("*").eq("project_id", projectId);
      if (sprintId === null) q = q.is("sprint_id", null);
      else if (sprintId) q = q.eq("sprint_id", sprintId);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      const tickets = (data || []) as any[];
      const userIds = [...new Set(tickets.map((t) => t.assigned_to).filter(Boolean))] as string[];
      const { data: profs } = userIds.length
        ? await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds)
        : { data: [] as any[] };
      const map = new Map((profs || []).map((p: any) => [p.user_id, p.full_name]));
      return tickets.map((t) => ({
        ...t,
        assignedName: t.assigned_to ? map.get(t.assigned_to) : null,
      })) as ProjectTicket[];
    },
    enabled: !!projectId,
  });
}

/** Tickets disponíveis (sem projeto vinculado) na organização do usuário. */
export function useAvailableTickets() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;
  return useQuery({
    queryKey: ["available-tickets", orgId],
    queryFn: async () => {
      let q = supabase
        .from("tickets")
        .select("*, categories(score)")
        .is("project_id", null)
        .in("status", OPEN_STATUSES);
      if (orgId) q = q.eq("organization_id", orgId);
      const { data, error } = await q.order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      const tickets = (data || []) as any[];
      const userIds = [...new Set(tickets.map((t) => t.assigned_to).filter(Boolean))] as string[];
      const { data: profs } = userIds.length
        ? await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds)
        : { data: [] as any[] };
      const map = new Map((profs || []).map((p: any) => [p.user_id, p.full_name]));
      return tickets.map((t) => ({
        ...t,
        assignedName: t.assigned_to ? map.get(t.assigned_to) : null,
        categoryScore: t.categories?.score ?? null,
      })) as ProjectTicket[];
    },
  });
}

export function useLinkTicketsToProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ticketIds,
      projectId,
      sprintId,
      pointsByTicket,
    }: {
      ticketIds: string[];
      projectId: string;
      sprintId: string | null;
      pointsByTicket: Record<string, number>;
    }) => {
      // batch paralelo; primeiro erro do trigger é propagado
      const results = await Promise.allSettled(
        ticketIds.map((id) =>
          supabase
            .from("tickets")
            .update({
              project_id: projectId,
              sprint_id: sprintId,
              story_points: pointsByTicket[id] ?? 1,
            })
            .eq("id", id)
            .then((r) => {
              if (r.error) throw r.error;
              return id;
            })
        )
      );
      const failures = results
        .filter((r) => r.status === "rejected")
        .map((r: any) => r.reason?.message || String(r.reason));
      if (failures.length) {
        throw new Error(failures[0]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["available-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["sprints"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Chamados vinculados!");
    },
    onError: (e: Error) => toast.error("Erro ao vincular: " + e.message),
  });
}

export function useUnlinkTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase
        .from("tickets")
        .update({ project_id: null, sprint_id: null })
        .eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["available-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["sprints"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Chamado removido do projeto");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useUpdateTicketSprint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, sprintId }: { ticketId: string; sprintId: string | null }) => {
      const { error } = await supabase.from("tickets").update({ sprint_id: sprintId }).eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["sprints"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useUpdateTicketPoints() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, points }: { ticketId: string; points: number }) => {
      const { error } = await supabase.from("tickets").update({ story_points: points }).eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["sprints"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}
