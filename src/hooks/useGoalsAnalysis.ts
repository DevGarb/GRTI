import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GoalItem {
  metric: string;
  label: string;
  target: number;
  actual: number;
  pct: number;
  inverse: boolean;
}

export interface TechGoalRow {
  userId: string;
  name: string;
  closed: number;
  csat: number;
  csatCount: number;
  points: number;
  reworkPercent: number;
  attainment: number;
  goals: GoalItem[];
}

export interface GoalsAnalysisData {
  year: number;
  month: number;
  periodLabel: string;
  kpis: {
    avgAttainment: number;
    totalClosed: number;
    avgCsat: number;
    csatCount: number;
    techsWithGoals: number;
    goalsMet: number;
    goalsTotal: number;
  };
  podium: { position: number; name: string; points: number; closed: number }[];
  rows: TechGoalRow[];
}

export const GOAL_METRIC_LABELS: Record<string, string> = {
  tickets_closed: "Chamados Fechados",
  avg_score: "Nota Média",
  avg_resolution_hours: "Tempo Resolução (h)",
  points: "Pontuação",
  preventivas_done: "Preventivas",
  rework_percent: "Retrabalho Máx. (%)",
  project_tasks_done: "Projetos Entregues",
};

const INVERSE_METRICS = new Set(["avg_resolution_hours", "rework_percent"]);

function pctOf(actual: number, target: number, inverse: boolean) {
  if (target <= 0) return 0;
  if (inverse) {
    if (actual <= 0) return 100;
    if (actual <= target) return 100;
    return Math.max(0, Math.round((target / actual) * 100));
  }
  return Math.min(100, Math.round((actual / target) * 100));
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function useGoalsAnalysis(params: {
  organizationId?: string | null;
  reference: Date;
  enabled?: boolean;
}) {
  const { organizationId, reference, enabled = true } = params;
  const year = reference.getFullYear();
  const month = reference.getMonth() + 1;

  return useQuery({
    queryKey: ["goals-analysis", organizationId, year, month],
    enabled: !!organizationId && enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<GoalsAnalysisData> => {
      const [metasRes, goalsRes] = await Promise.all([
        supabase.rpc("get_metas_tecnicos", { _year: year, _month: month }),
        supabase
          .from("performance_goals")
          .select("*")
          .eq("reference_year", year)
          .eq("reference_month", month)
          .eq("target_type", "individual"),
      ]);
      if (metasRes.error) throw metasRes.error;
      if (goalsRes.error) throw goalsRes.error;

      const metas = ((metasRes.data || []) as unknown) as Array<{
        user_id: string;
        full_name: string;
        total_closed: number;
        total_points: number;
        avg_score: number;
        evaluations_count: number;
        preventivas_done: number;
        rework_count: number;
        total_work_minutes: number;
        timed_tickets_count?: number;
      }>;
      const goals = (goalsRes.data || []) as Array<{
        target_id: string;
        metric: string;
        target_value: number;
      }>;

      // Tarefas de projeto concluídas no mês (métrica project_tasks_done)
      const userIds = metas.map((m) => m.user_id);
      const tasksByUser = new Map<string, number>();
      if (userIds.length > 0) {
        const monthStart = new Date(year, month - 1, 1).toISOString();
        const monthEnd = new Date(year, month, 1).toISOString();
        const { data: tasks } = await (supabase as any)
          .from("project_tasks")
          .select("assigned_to")
          .in("status", ["Concluído", "done"])
          .in("assigned_to", userIds)
          .gte("updated_at", monthStart)
          .lt("updated_at", monthEnd);
        for (const t of (tasks || []) as Array<{ assigned_to: string }>) {
          tasksByUser.set(t.assigned_to, (tasksByUser.get(t.assigned_to) || 0) + 1);
        }
      }

      const rows: TechGoalRow[] = metas
        .filter((m) => goals.some((g) => g.target_id === m.user_id))
        .map((m) => {
          const timed = Number(m.timed_tickets_count || 0);
          const avgResolutionHours = timed > 0 ? Number(m.total_work_minutes || 0) / 60 / timed : 0;
          const reworkPercent = m.total_closed > 0 ? (m.rework_count / m.total_closed) * 100 : 0;
          const actualFor = (metric: string) => {
            switch (metric) {
              case "tickets_closed": return Number(m.total_closed || 0);
              case "avg_score": return Number(m.avg_score || 0);
              case "avg_resolution_hours": return Number(avgResolutionHours.toFixed(2));
              case "points": return Number(m.total_points || 0);
              case "preventivas_done": return Number(m.preventivas_done || 0);
              case "rework_percent": return Number(reworkPercent.toFixed(1));
              case "project_tasks_done": return tasksByUser.get(m.user_id) || 0;
              default: return 0;
            }
          };

          const items: GoalItem[] = goals
            .filter((g) => g.target_id === m.user_id)
            .map((g) => {
              const inverse = INVERSE_METRICS.has(g.metric);
              const actual = actualFor(g.metric);
              return {
                metric: g.metric,
                label: GOAL_METRIC_LABELS[g.metric] ?? g.metric,
                target: Number(g.target_value),
                actual,
                pct: pctOf(actual, Number(g.target_value), inverse),
                inverse,
              };
            });

          const attainment = items.length > 0
            ? Math.round(items.reduce((a, i) => a + i.pct, 0) / items.length)
            : 0;

          return {
            userId: m.user_id,
            name: m.full_name || "Sem nome",
            closed: Number(m.total_closed || 0),
            csat: Number(m.avg_score || 0),
            csatCount: Number(m.evaluations_count || 0),
            points: Number(m.total_points || 0),
            reworkPercent,
            attainment,
            goals: items,
          };
        })
        .sort((a, b) => b.attainment - a.attainment);

      const allItems = rows.flatMap((r) => r.goals);
      const csatRows = rows.filter((r) => r.csatCount > 0);
      const csatSum = csatRows.reduce((a, r) => a + r.csat * r.csatCount, 0);
      const csatCount = csatRows.reduce((a, r) => a + r.csatCount, 0);

      const podium = [...rows]
        .sort((a, b) => b.points - a.points)
        .slice(0, 4)
        .map((r, i) => ({ position: i + 1, name: r.name, points: r.points, closed: r.closed }));

      return {
        year,
        month,
        periodLabel: `${MONTHS[month - 1]}/${year}`,
        kpis: {
          avgAttainment: rows.length > 0 ? Math.round(rows.reduce((a, r) => a + r.attainment, 0) / rows.length) : 0,
          totalClosed: rows.reduce((a, r) => a + r.closed, 0),
          avgCsat: csatCount > 0 ? csatSum / csatCount : 0,
          csatCount,
          techsWithGoals: rows.length,
          goalsMet: allItems.filter((i) => i.pct >= 100).length,
          goalsTotal: allItems.length,
        },
        podium,
        rows,
      };
    },
  });
}

function businessDaysLeft(year: number, month: number) {
  const now = new Date();
  const isCurrent = now.getFullYear() === year && now.getMonth() + 1 === month;
  if (!isCurrent) return 0;
  const last = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = now.getDate() + 1; d <= last; d++) {
    const wd = new Date(year, month - 1, d).getDay();
    if (wd !== 0 && wd !== 6) count++;
  }
  return count;
}

export function useGoalsInsights() {
  return useMutation({
    mutationFn: async (input: { organizationName?: string | null; data: GoalsAnalysisData }) => {
      const { data: d } = input;
      const now = new Date();
      const isCurrent = now.getFullYear() === d.year && now.getMonth() + 1 === d.month;
      const daysTotal = new Date(d.year, d.month, 0).getDate();

      const { data: res, error } = await supabase.functions.invoke("generate-goals-analysis", {
        body: {
          organization_name: input.organizationName ?? null,
          period_label: d.periodLabel,
          month_progress: {
            days_elapsed: isCurrent ? now.getDate() : daysTotal,
            days_total: daysTotal,
            business_days_left: businessDaysLeft(d.year, d.month),
          },
          kpis: {
            avg_attainment: d.kpis.avgAttainment,
            total_closed: d.kpis.totalClosed,
            avg_csat: d.kpis.avgCsat,
            csat_count: d.kpis.csatCount,
            techs_with_goals: d.kpis.techsWithGoals,
            goals_met: d.kpis.goalsMet,
            goals_total: d.kpis.goalsTotal,
          },
          podium: d.podium,
          technicians: d.rows.map((r) => ({
            name: r.name,
            closed: r.closed,
            csat: r.csat,
            csat_count: r.csatCount,
            points: r.points,
            rework_percent: r.reworkPercent,
            attainment: r.attainment,
            goals: r.goals,
          })),
        },
      });
      if (error) throw error;
      return ((res as any)?.insights ?? []) as string[];
    },
  });
}
