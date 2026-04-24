import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { calcBusinessMinutes } from "@/lib/businessHours";
import { fetchTicketResolutionEnds, getTicketWorkStart } from "@/lib/ticketTiming";

export interface TechCsatData {
  name: string;
  csat: number;
  total: number;
}

export interface DashboardMetrics {
  avgResolutionMinutes: number;
  avgResolutionFormatted: string;
  totalScore: number;
  csatScore: number;
  preventivePercent: number;
  reworkCount: number;
  csatDistribution: { satisfied: number; neutral: number; unsatisfied: number };
  monthlyCsat: { month: string; value: number }[];
  monthlyAvgTime: { month: string; value: number }[];
  techCsat: TechCsatData[];
  techPoints: { name: string; points: number }[];
}

function formatMinutes(mins: number): string {
  if (mins <= 0) return "0m";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  return `${h}h${m.toString().padStart(2, "0")}m`;
}

function getMonthLabel(date: Date): string {
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const y = date.getFullYear().toString().slice(-2);
  return `${months[date.getMonth()]}. ${y}`;
}

export function useDashboardMetrics(dateFrom?: Date, dateTo?: Date) {
  const { user, profile } = useAuth();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: ["dashboard-metrics", user?.id, orgId, dateFrom?.toISOString(), dateTo?.toISOString()],
    queryFn: async () => {
      // Fetch tickets
      let ticketQuery = supabase
        .from("tickets")
        .select("id, status, created_at, updated_at, type, assigned_to")
        .order("created_at", { ascending: false });
      if (orgId) {
        ticketQuery = ticketQuery.eq("organization_id", orgId);
      }
      const { data: tickets } = await ticketQuery;

      // Tickets criados no período (para "total" e categorias)
      const allTickets = (tickets || []).filter((t) => {
        if (!dateFrom || !dateTo) return true;
        const d = new Date(t.created_at);
        return d >= dateFrom && d <= dateTo;
      });

      // Tickets FECHADOS no período: filtra por created_at (mesma base da Auditoria)
      const closedTickets = (tickets || []).filter((t) => {
        if (t.status !== "Fechado") return false;
        if (!dateFrom || !dateTo) return true;
        const d = new Date(t.created_at);
        return d >= dateFrom && d <= dateTo;
      });

      // Avg resolution time
      let avgResolutionMinutes = 0;
      if (closedTickets.length > 0) {
        const totalMinutes = closedTickets.reduce((sum, t) => {
          return sum + calcBusinessMinutes(new Date(t.created_at), new Date(t.updated_at));
        }, 0);
        avgResolutionMinutes = totalMinutes / closedTickets.length;
      }

      // Fetch rework counts for the period tickets
      const allTicketIds = allTickets.map(t => t.id);
      let reworkCount = 0;
      if (allTicketIds.length > 0) {
        const { count } = await supabase
          .from("ticket_history")
          .select("*", { count: "exact", head: true })
          .in("ticket_id", allTicketIds)
          .eq("action", "rework");
        reworkCount = count || 0;
      }

      // Fetch satisfaction evaluations (CSAT 1-5 scale) for period
      let evalQuery = supabase
        .from("evaluations")
        .select("score, created_at, ticket_id")
        .eq("type", "satisfaction");
      if (dateFrom && dateTo) {
        evalQuery = evalQuery.gte("created_at", dateFrom.toISOString()).lte("created_at", dateTo.toISOString());
      }
      const { data: evaluations } = await (evalQuery as any);

      const rawEvals = (evaluations || []) as { score: number; created_at: string; ticket_id: string }[];

      // Fetch rework counts for evaluated tickets to penalize CSAT
      const evalTicketIds = [...new Set(rawEvals.map(e => e.ticket_id).filter(Boolean))] as string[];
      let reworkMap = new Map<string, number>();
      if (evalTicketIds.length > 0) {
        const { data: reworkHistory } = await supabase
          .from("ticket_history")
          .select("ticket_id")
          .in("ticket_id", evalTicketIds)
          .eq("action", "rework");
        if (reworkHistory) {
          reworkHistory.forEach(h => {
            reworkMap.set(h.ticket_id, (reworkMap.get(h.ticket_id) || 0) + 1);
          });
        }
      }

      // Apply rework penalty
      const allEvals = rawEvals.map(e => ({
        ...e,
        effectiveScore: Math.max(1, Math.min(5, e.score) - (reworkMap.get(e.ticket_id) || 0)),
      }));

      // Fetch tickets to map evaluations to technicians
      let ticketTechMap = new Map<string, string>();
      if (evalTicketIds.length > 0) {
        const { data: evalTickets } = await supabase
          .from("tickets")
          .select("id, assigned_to")
          .in("id", evalTicketIds);
        
        const techIds = [...new Set((evalTickets || []).map(t => t.assigned_to).filter(Boolean))] as string[];
        let techNameMap = new Map<string, string>();
        if (techIds.length > 0) {
          const { data: techProfiles } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", techIds);
          techNameMap = new Map((techProfiles || []).map(p => [p.user_id, p.full_name]));
        }
        
        (evalTickets || []).forEach(t => {
          if (t.assigned_to) {
            ticketTechMap.set(t.id, techNameMap.get(t.assigned_to) || "Sem nome");
          }
        });
      }

      // ===== PONTUAÇÃO =====
      // Regra unificada: pontos vêm de avaliações META dos chamados FECHADOS no período.
      // Deduplicar por ticket (uma única meta por ticket).
      const closedTicketIds = closedTickets.map(t => t.id);
      const closedTicketTechMap = new Map<string, string | null>(
        closedTickets.map(t => [t.id, t.assigned_to])
      );

      let totalScore = 0;
      const techPointsMap = new Map<string, number>();

      if (closedTicketIds.length > 0) {
        const { data: metaEvals } = await supabase
          .from("evaluations")
          .select("score, ticket_id")
          .eq("type", "meta")
          .in("ticket_id", closedTicketIds);

        // Map tech ids -> names (for closed tickets in period)
        const closedTechIds = [...new Set(closedTickets.map(t => t.assigned_to).filter(Boolean))] as string[];
        let nameMap = new Map<string, string>();
        if (closedTechIds.length > 0) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", closedTechIds);
          nameMap = new Map((profs || []).map(p => [p.user_id, p.full_name]));
        }

        // Soma direta: um único meta por ticket (garantido pelo unique index no banco)
        (metaEvals || []).forEach((e: any) => {
          const score = e.score || 0;
          totalScore += score;
          const techId = closedTicketTechMap.get(e.ticket_id);
          const techName = techId ? nameMap.get(techId) : null;
          if (techName) {
            techPointsMap.set(techName, (techPointsMap.get(techName) || 0) + score);
          }
        });
      }

      const techPoints = [...techPointsMap.entries()]
        .map(([name, points]) => ({ name, points }))
        .sort((a, b) => b.points - a.points);

      // CSAT calculation (1-5 scale) from satisfaction evaluations
      let satisfied = 0, neutral = 0, unsatisfied = 0;
      allEvals.forEach((e) => {
        if (e.effectiveScore >= 4) satisfied++;
        else if (e.effectiveScore === 3) neutral++;
        else unsatisfied++;
      });
      const totalEvals = allEvals.length;
      const csatScore = totalEvals > 0
        ? Math.round((satisfied / totalEvals) * 100)
        : 0;

      // Preventive percentage
      let prevQuery = supabase
        .from("preventive_maintenance")
        .select("id", { count: "exact", head: true });
      if (orgId) {
        prevQuery = prevQuery.eq("organization_id", orgId);
      }
      if (dateFrom && dateTo) {
        prevQuery = prevQuery.gte("created_at", dateFrom.toISOString()).lte("created_at", dateTo.toISOString());
      }
      const { count: preventiveCount } = await prevQuery;

      const totalAll = allTickets.length + (preventiveCount || 0);
      const preventivePercent = totalAll > 0
        ? Math.round(((preventiveCount || 0) / totalAll) * 100)
        : 0;

      // Monthly CSAT (last 6 months) - always show last 6 regardless of filter
      const now = new Date();
      const monthlyCsat: { month: string; value: number }[] = [];
      const monthlyAvgTime: { month: string; value: number }[] = [];

      // For monthly charts, use ALL tickets (unfiltered by period)
      const allTicketsUnfiltered = tickets || [];
      const closedUnfiltered = allTicketsUnfiltered.filter((t) => t.status === "Fechado");

      // Fetch ALL evaluations for monthly chart
      const { data: allEvalsForChart } = await (supabase
        .from("evaluations")
        .select("score, created_at, ticket_id")
        .eq("type", "satisfaction") as any);
      const chartEvals = (allEvalsForChart || []) as { score: number; created_at: string; ticket_id: string }[];
      const chartEvalsWithPenalty = chartEvals.map(e => ({
        ...e,
        effectiveScore: Math.max(1, Math.min(5, e.score) - (reworkMap.get(e.ticket_id) || 0)),
      }));

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const label = getMonthLabel(d);

        const monthEvals = chartEvalsWithPenalty.filter((e) => {
          const ed = new Date(e.created_at);
          return ed >= d && ed < nextMonth;
        });
        const mSatisfied = monthEvals.filter(e => e.effectiveScore >= 4).length;
        const mCsat = monthEvals.length > 0
          ? Math.round((mSatisfied / monthEvals.length) * 100)
          : 0;
        monthlyCsat.push({ month: label, value: mCsat });

        const monthClosed = closedUnfiltered.filter((t) => {
          const cd = new Date(t.updated_at);
          return cd >= d && cd < nextMonth;
        });
        const avgMin = monthClosed.length > 0
          ? Math.round(monthClosed.reduce((sum, t) => {
              return sum + calcBusinessMinutes(new Date(t.created_at), new Date(t.updated_at));
            }, 0) / monthClosed.length)
          : 0;
        monthlyAvgTime.push({ month: label, value: avgMin });
      }

      // Tech CSAT - group evaluations by technician
      const techEvalMap = new Map<string, number[]>();
      allEvals.forEach((e) => {
        const techName = ticketTechMap.get(e.ticket_id);
        if (techName) {
          if (!techEvalMap.has(techName)) techEvalMap.set(techName, []);
          techEvalMap.get(techName)!.push(e.effectiveScore);
        }
      });
      const techCsat: TechCsatData[] = [...techEvalMap.entries()].map(([name, scores]) => {
        const s = scores.filter(sc => sc >= 4).length;
        return { name, csat: Math.round((s / scores.length) * 100), total: scores.length };
      }).sort((a, b) => b.csat - a.csat);

      return {
        avgResolutionMinutes,
        avgResolutionFormatted: formatMinutes(avgResolutionMinutes),
        totalScore,
        csatScore,
        preventivePercent,
        reworkCount,
        csatDistribution: {
          satisfied: totalEvals > 0 ? Math.round((satisfied / totalEvals) * 100) : 0,
          neutral: totalEvals > 0 ? Math.round((neutral / totalEvals) * 100) : 0,
          unsatisfied: totalEvals > 0 ? Math.round((unsatisfied / totalEvals) * 100) : 0,
        },
        monthlyCsat,
        monthlyAvgTime,
        techCsat,
        techPoints,
      } as DashboardMetrics;
    },
    enabled: !!user,
  });
}
