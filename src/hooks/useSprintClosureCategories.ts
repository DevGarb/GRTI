import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SprintClosureCategory {
  id: string;
  organization_id: string | null;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function useSprintClosureCategories(orgId?: string | null, opts?: { activeOnly?: boolean }) {
  return useQuery({
    queryKey: ["sprint-closure-categories", orgId ?? null, opts?.activeOnly ?? false],
    queryFn: async () => {
      let q = (supabase as any).from("sprint_closure_categories").select("*").order("name");
      if (orgId) q = q.or(`organization_id.eq.${orgId},organization_id.is.null`);
      if (opts?.activeOnly) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as SprintClosureCategory[];
    },
  });
}

export function useCreateSprintClosureCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; organization_id?: string | null }) => {
      const { data, error } = await (supabase as any)
        .from("sprint_closure_categories")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sprint-closure-categories"] });
      toast.success("Categoria criada!");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useUpdateSprintClosureCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; active?: boolean }) => {
      const { error } = await (supabase as any).from("sprint_closure_categories").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sprint-closure-categories"] });
      toast.success("Categoria atualizada!");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteSprintClosureCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("sprint_closure_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sprint-closure-categories"] });
      toast.success("Categoria removida!");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}
