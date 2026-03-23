import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PatrimonioItem {
  id: string;
  asset_tag: string;
  equipment_type: string;
  brand: string;
  model: string;
  serial_number: string;
  sector: string;
  responsible: string;
  location: string;
  notes: string | null;
  status: string;
  photo_url: string | null;
  organization_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function usePatrimonio() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: ["patrimonio", orgId],
    queryFn: async () => {
      let query = supabase
        .from("patrimonio")
        .select("*")
        .order("asset_tag");
      if (orgId) query = query.eq("organization_id", orgId);
      const { data, error } = await query;
      if (error) throw error;
      return data as PatrimonioItem[];
    },
  });
}

export interface CreatePatrimonioInput {
  asset_tag: string;
  equipment_type: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  sector?: string;
  responsible?: string;
  location?: string;
  notes?: string;
  status?: string;
  photo_url?: string | null;
}

export function useCreatePatrimonio() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (input: CreatePatrimonioInput) => {
      const { data, error } = await supabase
        .from("patrimonio")
        .insert({
          ...input,
          created_by: user!.id,
          organization_id: profile?.organization_id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patrimonio"] });
      toast.success("Patrimônio cadastrado com sucesso!");
    },
    onError: (e: Error) => toast.error("Erro ao cadastrar: " + e.message),
  });
}

export function useUpdatePatrimonio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreatePatrimonioInput> & { id: string }) => {
      const { error } = await supabase
        .from("patrimonio")
        .update(input)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patrimonio"] });
      toast.success("Patrimônio atualizado!");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useDeletePatrimonio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("patrimonio").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patrimonio"] });
      toast.success("Patrimônio removido!");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}
