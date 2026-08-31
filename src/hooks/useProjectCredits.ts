import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ProjectCredit {
  id: string;
  project_id: string;
  user_id: string;
}

/** Créditos (membros que recebem o projeto como entrega) de um ou vários projetos. */
export function useProjectCredits(projectIds: string[]) {
  const ids = [...projectIds].sort();
  return useQuery({
    queryKey: ["project-credits", ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_credits")
        .select("id, project_id, user_id")
        .in("project_id", ids);
      if (error) throw error;
      return (data || []) as ProjectCredit[];
    },
  });
}

export function useProjectCreditMutations() {
  const qc = useQueryClient();
  const { profile } = useAuth();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["project-credits"] });
    qc.invalidateQueries({ queryKey: ["projects"] });
    qc.invalidateQueries({ queryKey: ["project"] });
    qc.invalidateQueries({ queryKey: ["metas-tecnicos"] });
  };

  const addCredit = useMutation({
    mutationFn: async ({ projectId, userId }: { projectId: string; userId: string }) => {
      const { error } = await supabase.from("project_credits").insert({
        project_id: projectId,
        user_id: userId,
        organization_id: profile?.organization_id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error("Erro ao creditar: " + e.message),
  });

  const removeCredit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_credits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error("Erro ao remover crédito: " + e.message),
  });

  return { addCredit, removeCredit };
}

/** Grava a lista completa de créditos de um projeto (usado ao concluir). */
export async function saveProjectCredits(
  projectId: string,
  userIds: string[],
  organizationId: string | null
) {
  await supabase.from("project_credits").delete().eq("project_id", projectId);
  if (userIds.length === 0) return;
  const { error } = await supabase.from("project_credits").insert(
    userIds.map((uid) => ({
      project_id: projectId,
      user_id: uid,
      organization_id: organizationId,
    }))
  );
  if (error) throw error;
}
