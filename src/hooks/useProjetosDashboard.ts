import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ProjetosDashboard {
  active_projects: number;
  done_projects: number;
  late_projects: number;
  active_sprints: number;
  pending_backlog: number;
  month_deliveries: number;
  month_reworks: number;
  op_efficiency: number;
  tech_quality: number;
  on_time_rate: number;
  final_mvp: number;
}

export function useProjetosDashboard(from: Date, to: Date) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id ?? null;
  return useQuery({
    queryKey: ["projetos-dashboard", orgId, from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_projects_dashboard", {
        _organization_id: orgId,
        _from: from.toISOString(),
        _to: to.toISOString(),
      });
      if (error) throw error;
      return data as ProjetosDashboard;
    },
  });
}

export interface MvpRow {
  user_id: string;
  full_name: string;
  total_deliveries: number;
  on_time: number;
  reworks: number;
  on_time_rate: number;
  quality_rate: number;
  rework_rate: number;
  op_efficiency: number;
  final_score: number;
  award_level: "ouro" | "prata" | "none";
  amount_brl: number;
}

export interface MvpRow {
  user_id: string;
  full_name: string;
  total_deliveries: number;
  on_time: number;
  reworks: number;
  on_time_rate: number;
  quality_rate: number;
  rework_rate: number;
  op_efficiency: number;
  final_score: number;
  award_level: "ouro" | "prata" | "none";
  amount_brl: number;
}

export interface MvpChamadosRow {
  user_id: string;
  full_name: string;
  total_closed: number;
  on_time: number;
  on_time_rate: number;
  csat_avg: number;
  csat_count: number;
  csat_rate: number;
  reworks: number;
  rework_rate: number;
  category_points: number;
  final_score: number;
  award_level: "ouro" | "prata" | "none";
  amount_brl: number;
}

export function useMvpMetrics(year: number, month: number) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id ?? null;
  return useQuery({
    queryKey: ["mvp-metrics", orgId, year, month],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_mvp_metrics", {
        _organization_id: orgId,
        _year: year,
        _month: month,
      });
      if (error) throw error;
      return (data || []) as MvpRow[];
    },
    enabled: !!orgId,
  });
}

export function useMvpChamadosMetrics(year: number, month: number) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id ?? null;
  return useQuery({
    queryKey: ["mvp-chamados-metrics", orgId, year, month],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_mvp_chamados_metrics", {
        _organization_id: orgId,
        _year: year,
        _month: month,
      });
      if (error) throw error;
      return (data || []) as MvpChamadosRow[];
    },
    enabled: !!orgId,
  });
}
