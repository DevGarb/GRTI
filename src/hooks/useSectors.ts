import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Sector {
  id: string;
  name: string;
  organization_id: string | null;
  is_active: boolean;
  created_at: string;
}

export function useSectors(organizationId?: string | null) {
  return useQuery({
    queryKey: ["sectors", organizationId],
    queryFn: async () => {
      let query = supabase
        .from("sectors")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Sector[];
    },
  });
}

export function useCreateSector() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; organization_id?: string | null }) => {
      const { data, error } = await supabase
        .from("sectors")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sectors"] });
      toast.success("Setor criado com sucesso!");
    },
    onError: (err: Error) => toast.error("Erro ao criar setor: " + err.message),
  });
}

export function useUpdateSector() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; is_active?: boolean }) => {
      const { error } = await supabase.from("sectors").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sectors"] });
      toast.success("Setor atualizado!");
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });
}

export function useDeleteSector() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sectors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sectors"] });
      toast.success("Setor removido!");
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });
}
