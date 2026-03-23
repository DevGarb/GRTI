import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PerformanceGoal {
  id: string;
  target_type: string;
  target_id: string;
  target_label: string;
  metric: string;
  target_value: number;
  period: string;
  reference_month: number | null;
  reference_year: number;
  organization_id: string | null;
  created_by: string;
  created_at: string;
}

export function useGoals(year?: number, month?: number) {
  return useQuery({
    queryKey: ["performance-goals", year, month],
    queryFn: async () => {
      let query = supabase
        .from("performance_goals")
        .select("*")
        .order("created_at", { ascending: false });

      if (year) query = query.eq("reference_year", year);
      if (month) query = query.eq("reference_month", month);

      const { data, error } = await query;
      if (error) throw error;
      return data as PerformanceGoal[];
    },
  });
}

export interface CreateGoalInput {
  target_type: string;
  target_id: string;
  target_label: string;
  metric: string;
  target_value: number;
  period: string;
  reference_month: number | null;
  reference_year: number;
}

export function useCreateGoal() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      const { error } = await supabase
        .from("performance_goals")
        .insert({ ...input, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["performance-goals"] });
      toast.success("Meta criada com sucesso!");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, target_value }: { id: string; target_value: number }) => {
      const { error } = await supabase
        .from("performance_goals")
        .update({ target_value, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["performance-goals"] });
      toast.success("Meta atualizada!");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("performance_goals")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["performance-goals"] });
      toast.success("Meta removida!");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}
