import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface MvpIndividual {
  full_name: string;
  active_projects: number;
  backlogs: number;
  sprints: number;
  planned: number;
  delivered: number;
  late: number;
  reworks: number;
  on_time: number;
  on_time_rate: number;
  rework_rate: number;
  op_efficiency: number;
  tech_quality: number;
  penalty_mvp: number;
  penalty_quality: number;
  disqualified: boolean;
  final_score: number;
  award_level: "ouro" | "prata" | "none";
  amount_brl: number;
  needed_for_gold: number;
  rework_impact_pct: number;
}

export function useMvpIndividual(userId: string | undefined, year: number, month: number) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id ?? null;
  return useQuery({
    queryKey: ["mvp-individual", userId, orgId, year, month],
    enabled: !!userId && !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_mvp_individual", {
        _user_id: userId,
        _organization_id: orgId,
        _year: year,
        _month: month,
      });
      if (error) throw error;
      return data as MvpIndividual;
    },
  });
}

export function useMvpTeamRanking(year: number, month: number) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id ?? null;
  return useQuery({
    queryKey: ["mvp-team-ranking", orgId, year, month],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_mvp_team_ranking", {
        _organization_id: orgId,
        _year: year,
        _month: month,
      });
      if (error) throw error;
      return data as { users: any[]; sprints: any[]; projects: any[] };
    },
  });
}

export function useMvpEvolution(monthsBack = 6) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id ?? null;
  return useQuery({
    queryKey: ["mvp-evolution", orgId, monthsBack],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_mvp_team_evolution", {
        _organization_id: orgId,
        _months_back: monthsBack,
      });
      if (error) throw error;
      return (data || []) as Array<{
        year: number;
        month: number;
        avg_final: number;
        total_deliveries: number;
        total_reworks: number;
        avg_quality: number;
      }>;
    },
  });
}

export interface Penalty {
  id: string;
  user_id: string;
  organization_id: string;
  scope: "mvp" | "operacional";
  type: string;
  percent_impact: number;
  quality_impact: number;
  disqualify: boolean;
  reference_date: string;
  year: number;
  month: number;
  project_id: string | null;
  sprint_id: string | null;
  task_id: string | null;
  justification: string;
  evidence_url: string | null;
  status: "pendente" | "aprovado" | "rejeitado";
  requested_by: string;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string;
}

export const PENALTY_TYPES: Array<{
  value: string;
  label: string;
  scope: "mvp" | "operacional";
  impact: string;
}> = [
  { value: "falta_injustificada", label: "Falta injustificada", scope: "mvp", impact: "-25% MVP" },
  { value: "atrasos_15min", label: "3+ atrasos > 15min", scope: "mvp", impact: "-10% MVP" },
  { value: "advertencia", label: "Advertência", scope: "mvp", impact: "-50% MVP" },
  { value: "suspensao", label: "Suspensão", scope: "mvp", impact: "Desclassificado" },
  { value: "sprint_atrasada", label: "Sprint atrasada s/ justificativa", scope: "operacional", impact: "-5% Eficiência" },
  { value: "backlog_parado", label: "Backlog parado > 5 dias úteis", scope: "operacional", impact: "-2% Eficiência" },
  { value: "homologacao_reprovada", label: "Homologação reprovada", scope: "operacional", impact: "+1 retrabalho" },
  { value: "sem_documentacao", label: "Ausência de documentação", scope: "operacional", impact: "-5% Qualidade" },
  { value: "sem_evidencia", label: "Ausência de evidências", scope: "operacional", impact: "-5% Qualidade" },
];

export function usePenalties(filters: {
  year?: number;
  month?: number;
  userId?: string;
  type?: string;
  status?: string;
} = {}) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id ?? null;
  return useQuery({
    queryKey: ["mvp-penalties", orgId, filters],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase.from("mvp_penalties").select("*").eq("organization_id", orgId!);
      if (filters.year) q = q.eq("year", filters.year);
      if (filters.month) q = q.eq("month", filters.month);
      if (filters.userId) q = q.eq("user_id", filters.userId);
      if (filters.type) q = q.eq("type", filters.type);
      if (filters.status) q = q.eq("status", filters.status);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      const items = (data || []) as Penalty[];
      const userIds = [...new Set(items.map((i) => i.user_id))];
      if (!userIds.length) return items;
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      const map = new Map((profs || []).map((p: any) => [p.user_id, p.full_name]));
      return items.map((i) => ({ ...i, user_name: map.get(i.user_id) || "Sem nome" }));
    },
  });
}

export function useCreatePenalty() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      user_id: string;
      type: string;
      reference_date: string;
      justification: string;
      evidence_url?: string | null;
      project_id?: string | null;
      sprint_id?: string | null;
      task_id?: string | null;
      notes?: string | null;
    }) => {
      const { data, error } = await (supabase as any).rpc("request_penalty", {
        _user_id: input.user_id,
        _organization_id: profile?.organization_id,
        _type: input.type,
        _reference_date: input.reference_date,
        _justification: input.justification,
        _evidence_url: input.evidence_url ?? null,
        _project_id: input.project_id ?? null,
        _sprint_id: input.sprint_id ?? null,
        _task_id: input.task_id ?? null,
        _notes: input.notes ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mvp-penalties"] });
      toast.success("Penalidade registrada");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useApprovePenalty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, approve, notes }: { id: string; approve: boolean; notes?: string }) => {
      const { error } = await (supabase as any).rpc("approve_penalty", {
        _id: id,
        _approve: approve,
        _notes: notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mvp-penalties"] });
      qc.invalidateQueries({ queryKey: ["mvp-individual"] });
      toast.success("Status atualizado");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}
