import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const MONTHS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export interface PointsSuggestionRow {
  userId: string;
  name: string;
  history: { label: string; points: number }[];
  average: number;
  currentGoal: number | null;
  suggested: number;
  trend: "crescente" | "estavel" | "queda";
  rationale: string;
}

interface MetaRow {
  user_id: string;
  full_name: string;
  total_points: number;
}

/** Últimos 6 meses ANTERIORES ao mês de referência. */
function lastSixMonths(year: number, month: number) {
  const out: { year: number; month: number; label: string }[] = [];
  for (let i = 6; i >= 1; i--) {
    const d = new Date(year, month - 1 - i, 1);
    out.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: `${MONTHS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}` });
  }
  return out;
}

export function usePointsGoalSuggestion(year: number, month: number) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  return useMutation({
    mutationFn: async (technicians: { user_id: string; full_name: string }[]): Promise<PointsSuggestionRow[]> => {
      if (technicians.length === 0) return [];
      const months = lastSixMonths(year, month);

      const results = await Promise.all(
        months.map((m) => supabase.rpc("get_metas_tecnicos", { _year: m.year, _month: m.month }))
      );

      const historyByUser = new Map<string, { label: string; points: number }[]>();
      results.forEach((res, idx) => {
        const rows = ((res.data || []) as unknown) as MetaRow[];
        const byUser = new Map(rows.map((r) => [r.user_id, Number(r.total_points || 0)]));
        for (const t of technicians) {
          const arr = historyByUser.get(t.user_id) ?? [];
          arr.push({ label: months[idx].label, points: byUser.get(t.user_id) ?? 0 });
          historyByUser.set(t.user_id, arr);
        }
      });

      const { data: goals } = await supabase
        .from("performance_goals")
        .select("target_id, target_value")
        .eq("reference_year", year)
        .eq("reference_month", month)
        .eq("target_type", "individual")
        .eq("metric", "points");
      const goalByUser = new Map((goals || []).map((g: any) => [g.target_id, Number(g.target_value)]));

      const payloadTechs = technicians.map((t) => {
        const history = historyByUser.get(t.user_id) ?? [];
        const withData = history.filter((h) => h.points > 0);
        const average = withData.length > 0 ? withData.reduce((a, h) => a + h.points, 0) / withData.length : 0;
        return {
          user_id: t.user_id,
          name: t.full_name || "Sem nome",
          history,
          average,
          current_goal: goalByUser.get(t.user_id) ?? null,
        };
      });

      const { data: res, error } = await supabase.functions.invoke("suggest-points-goals", {
        body: {
          organization_name: (profile as any)?.organization_name ?? null,
          period_label: `${MONTHS[month - 1]}/${year}`,
          technicians: payloadTechs,
        },
      });
      if (error) throw error;
      if ((res as any)?.error) throw new Error((res as any).error);

      const suggestions = (((res as any)?.suggestions ?? []) as Array<{
        user_id: string;
        suggested_points: number;
        trend: PointsSuggestionRow["trend"];
        rationale: string;
      }>);
      const byId = new Map(suggestions.map((s) => [s.user_id, s]));

      return payloadTechs.map((t) => {
        const s = byId.get(t.user_id);
        return {
          userId: t.user_id,
          name: t.name,
          history: t.history,
          average: t.average,
          currentGoal: t.current_goal,
          suggested: Math.max(0, Math.round(Number(s?.suggested_points ?? Math.round(t.average)))),
          trend: s?.trend ?? "estavel",
          rationale: s?.rationale ?? "Sugestão baseada na média histórica.",
        };
      });
    },
    onError: (e: Error) => toast.error("Erro ao gerar sugestões: " + e.message),
  });
}

export function useApprovePointsGoals(year: number, month: number) {
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  const orgId = profile?.organization_id;

  return useMutation({
    mutationFn: async (rows: { userId: string; name: string; suggested: number }[]) => {
      const { data: existing } = await supabase
        .from("performance_goals")
        .select("id, target_id")
        .eq("reference_year", year)
        .eq("reference_month", month)
        .eq("target_type", "individual")
        .eq("metric", "points")
        .in("target_id", rows.map((r) => r.userId));
      const existingByUser = new Map((existing || []).map((g: any) => [g.target_id, g.id]));

      const toInsert = rows.filter((r) => !existingByUser.has(r.userId));
      const toUpdate = rows.filter((r) => existingByUser.has(r.userId));

      if (toInsert.length > 0) {
        const { error } = await supabase.from("performance_goals").insert(
          toInsert.map((r) => ({
            target_type: "individual",
            target_id: r.userId,
            target_label: r.name,
            metric: "points",
            target_value: r.suggested,
            period: "mensal",
            reference_month: month,
            reference_year: year,
            organization_id: orgId ?? null,
            created_by: user!.id,
          }))
        );
        if (error) throw error;
      }

      for (const r of toUpdate) {
        const { error } = await supabase
          .from("performance_goals")
          .update({ target_value: r.suggested, updated_at: new Date().toISOString() })
          .eq("id", existingByUser.get(r.userId)!);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["performance-goals"] });
      qc.invalidateQueries({ queryKey: ["goals-analysis"] });
      toast.success("Metas de pontuação definidas!");
    },
    onError: (e: Error) => toast.error("Erro ao aprovar metas: " + e.message),
  });
}
