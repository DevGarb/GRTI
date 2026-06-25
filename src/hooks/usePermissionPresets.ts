import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type PresetOverride = "grant" | "block";
export interface PermissionPreset {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  overrides: Record<string, PresetOverride>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function usePermissionPresets() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id || null;
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["permission-presets", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("menu_permission_presets")
        .select("*")
        .eq("organization_id", orgId)
        .order("name");
      if (error) throw error;
      return (data || []) as PermissionPreset[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (input: {
      id?: string;
      name: string;
      description?: string | null;
      overrides: Record<string, PresetOverride>;
    }) => {
      if (!orgId) throw new Error("Organização não selecionada");
      if (input.id) {
        const { error } = await (supabase as any)
          .from("menu_permission_presets")
          .update({
            name: input.name,
            description: input.description ?? null,
            overrides: input.overrides,
          })
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("menu_permission_presets")
          .insert({
            organization_id: orgId,
            name: input.name,
            description: input.description ?? null,
            overrides: input.overrides,
            created_by: profile?.user_id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permission-presets", orgId] });
      toast.success("Padrão salvo");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar padrão"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("menu_permission_presets")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permission-presets", orgId] });
      toast.success("Padrão excluído");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao excluir"),
  });

  return { presets: list.data || [], isLoading: list.isLoading, upsert, remove };
}
