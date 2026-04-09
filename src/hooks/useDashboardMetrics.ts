import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { calcBusinessMinutes } from "@/lib/businessHours";

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
  csatDistribution: { satisfied: number; neutral: number; unsatisfied: number };
  monthlyCsat: { month: string; value: number }[];
  monthlyAvgTime: { month: string; value: number }[];
  techCsat: TechCsatData[];
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

export function useDashboardMetrics() {
  const { user, profile } = useAuth();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: ["dashboard-metrics", user?.id, orgId],
    queryFn: async () => {
      // Fetch closed tickets for avg resolution time
      let ticketQuery = supabase
        .from("tickets")
        .select("id, status, created_at, updated_at, type")
        .order("created_at", { ascending: false });
      if (orgId) {
        ticketQuery = ticketQuery.eq("organization_id", orgId);
      }
      const { data: tickets } = await ticketQuery;

      const allTickets = tickets || [];
      const closedTickets = allTickets.filter((t) => t.status === "Fechado");

      // Avg resolution time
      let avgResolutionMinutes = 0;
      if (closedTickets.length > 0) {
        const totalMinutes = closedTickets.reduce((sum, t) => {
          return sum + calcBusinessMinutes(new Date(t.created_at), new Date(t.updated_at));
        }, 0);
        avgResolutionMinutes = totalMinutes / closedTickets.length;
      }

      // Fetch satisfaction evaluations (CSAT 1-5 scale)
      const { data: evaluations } = await (supabase
        .from("evaluations")
        .select("score, created_at, ticket_id") as any)
        .eq("type", "satisfaction");

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

      // Apply rework penalty: each rework reduces effective score by 1 (min 1)
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

      const totalScore = allEvals.reduce((sum, e) => sum + e.effectiveScore, 0);

      // CSAT calculation (1-5 scale)
      // Satisfied: 4-5, Neutral: 3, Unsatisfied: 1-2
      let satisfied = 0, neutral = 0, unsatisfied = 0;
      allEvals.forEach((e) => {
        if (e.effectiveScore >= 4) satisfied++;
        else if (e.effectiveScore === 3) neutral++;
        else unsatisfied++;
      });
      const totalEvals = allEvals.length;
      // CSAT = % of satisfied (score 4-5)
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
      const { count: preventiveCount } = await prevQuery;

      const totalAll = allTickets.length + (preventiveCount || 0);
      const preventivePercent = totalAll > 0
        ? Math.round(((preventiveCount || 0) / totalAll) * 100)
        : 0;

      // Monthly CSAT (last 6 months)
      const now = new Date();
      const monthlyCsat: { month: string; value: number }[] = [];
      const monthlyAvgTime: { month: string; value: number }[] = [];

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const label = getMonthLabel(d);

        // CSAT for this month
        const monthEvals = allEvals.filter((e) => {
          const ed = new Date(e.created_at);
          return ed >= d && ed < nextMonth;
        });
        const mSatisfied = monthEvals.filter(e => e.effectiveScore >= 4).length;
        const mCsat = monthEvals.length > 0
          ? Math.round((mSatisfied / monthEvals.length) * 100)
          : 0;
        monthlyCsat.push({ month: label, value: mCsat });

        // Avg time for this month (closed tickets)
        const monthClosed = closedTickets.filter((t) => {
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
        csatDistribution: {
          satisfied: totalEvals > 0 ? Math.round((satisfied / totalEvals) * 100) : 0,
          neutral: totalEvals > 0 ? Math.round((neutral / totalEvals) * 100) : 0,
          unsatisfied: totalEvals > 0 ? Math.round((unsatisfied / totalEvals) * 100) : 0,
        },
        monthlyCsat,
        monthlyAvgTime,
        techCsat,
      } as DashboardMetrics;
    },
    enabled: !!user,
  });
}
