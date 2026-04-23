import { useQuery } from "@tanstack/react-query";
import { Target, TrendingUp, Star, Clock, Award, CheckCircle2, AlertTriangle, Wrench } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGoals } from "@/hooks/useGoals";

const METRIC_CONFIG: Record<string, { label: string; icon: typeof Target; shortLabel: string }> = {
  tickets_closed: { label: "Chamados Fechados", icon: TrendingUp, shortLabel: "Chamados" },
  avg_score: { label: "Nota Média", icon: Star, shortLabel: "Nota" },
  avg_resolution_hours: { label: "Tempo Resolução", icon: Clock, shortLabel: "Tempo" },
  points: { label: "Pontuação", icon: Award, shortLabel: "Pontos" },
  preventivas_done: { label: "Preventivas Realizadas", icon: Wrench, shortLabel: "Preventivas" },
};

function getPct(actual: number, target: number, isInverse: boolean): number {
  if (target <= 0) return 0;
  const pct = Math.round((actual / target) * 100);
  return isInverse ? (pct <= 100 ? 100 : Math.max(0, 200 - pct)) : Math.min(pct, 100);
}

function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}min`;
  if (h < 24) return `${h.toFixed(1)}h`;
  const days = Math.floor(h / 24);
  return `${days}d ${(h % 24).toFixed(0)}h`;
}

interface Props {
  year: number;
  month: number; // 1-based
}

export default function MyGoalCard({ year, month }: Props) {
  const { user, profile } = useAuth();
  const { data: allGoals = [] } = useGoals(year, month);

  // Only goals assigned to the current user
  const myGoals = allGoals.filter(
    (g) => g.target_type === "individual" && g.target_id === user?.id
  );

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  const { data: stats } = useQuery({
    queryKey: ["my-goal-stats", user?.id, year, month],
    queryFn: async () => {
      if (!user?.id) return null;

      // Tickets fechados no mês atribuídos ao usuário (mesma base da Auditoria)
      const { data: closedTickets } = await supabase
        .from("tickets")
        .select("id, created_at, updated_at, assigned_to")
        .eq("status", "Fechado")
        .eq("assigned_to", user.id)
        .gte("created_at", monthStart.toISOString())
        .lt("created_at", monthEnd.toISOString());

      const ids = (closedTickets || []).map((t) => t.id);

      // Pontuação (meta)
      let totalPoints = 0;
      if (ids.length > 0) {
        const { data: metaEvals } = await supabase
          .from("evaluations")
          .select("score")
          .eq("type", "meta")
          .in("ticket_id", ids);
        totalPoints = (metaEvals || []).reduce((s, e) => s + (e.score || 0), 0);
      }

      // Nota média (satisfaction)
      let avgScore = 0;
      if (ids.length > 0) {
        const { data: satEvals } = await supabase
          .from("evaluations")
          .select("score")
          .eq("type", "satisfaction")
          .in("ticket_id", ids);
        const scores = (satEvals || []).map((e) => e.score).filter(Boolean) as number[];
        avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      }

      // Tempo médio de resolução
      let avgResolutionHours = 0;
      if ((closedTickets || []).length > 0) {
        const totalHours = (closedTickets || []).reduce((sum, t) => {
          const h = Math.max(0, (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60));
          return sum + h;
        }, 0);
        avgResolutionHours = totalHours / (closedTickets || []).length;
      }

      // Preventivas do mês
      const { count: prevCount } = await supabase
        .from("preventive_maintenance")
        .select("id", { count: "exact", head: true })
        .eq("created_by", user.id)
        .gte("created_at", monthStart.toISOString())
        .lt("created_at", monthEnd.toISOString());

      return {
        totalClosed: (closedTickets || []).length,
        totalPoints,
        avgScore,
        avgResolutionHours,
        preventivasDone: prevCount || 0,
      };
    },
    enabled: !!user?.id && myGoals.length > 0,
  });

  if (myGoals.length === 0 || !stats) return null;

  const name = profile?.full_name || user?.email || "";
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const radarData = myGoals.map((g) => {
    const isInverse = g.metric === "avg_resolution_hours";
    let actual = 0;
    if (g.metric === "tickets_closed") actual = stats.totalClosed;
    else if (g.metric === "avg_score") actual = stats.avgScore;
    else if (g.metric === "avg_resolution_hours") actual = stats.avgResolutionHours;
    else if (g.metric === "points") actual = stats.totalPoints;
    else if (g.metric === "preventivas_done") actual = stats.preventivasDone;

    const pct = getPct(actual, g.target_value, isInverse);
    return {
      metric: METRIC_CONFIG[g.metric]?.shortLabel || g.metric,
      fullLabel: METRIC_CONFIG[g.metric]?.label || g.metric,
      pct,
      actual,
      target: g.target_value,
      isInverse,
      metricKey: g.metric,
    };
  });

  const goalsHit = radarData.filter((d) => d.pct >= 100).length;
  const totalGoals = radarData.length;
  const overallPct = totalGoals > 0 ? Math.round(radarData.reduce((a, d) => a + d.pct, 0) / totalGoals) : 0;

  return (
    <div className="card-elevated p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">{initials}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{name}</p>
            <p className="text-[11px] text-muted-foreground">
              {goalsHit}/{totalGoals} metas atingidas
            </p>
          </div>
        </div>
        <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${
          overallPct >= 80
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
            : overallPct >= 50
            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
            : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
        }`}>
          {overallPct}%
        </div>
      </div>

      <div className="flex gap-4 items-start">
        {/* Radar Chart — only if 3+ metrics */}
        {radarData.length >= 3 && (
          <div className="w-[160px] h-[140px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Progresso"
                  dataKey="pct"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Metric cards */}
        <div className="flex-1 grid grid-cols-2 gap-2">
          {radarData.map((d) => {
            const cfg = METRIC_CONFIG[d.metricKey];
            const Icon = cfg?.icon || Target;
            const isHit = d.pct >= 100;
            return (
              <div
                key={d.metricKey}
                className={`p-2.5 rounded-lg border transition-colors ${
                  isHit
                    ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/20"
                    : "border-border bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className={`h-3.5 w-3.5 ${isHit ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`} />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{d.metric}</span>
                  {isHit && <CheckCircle2 className="h-3 w-3 text-emerald-500 ml-auto" />}
                  {!isHit && d.pct < 50 && <AlertTriangle className="h-3 w-3 text-amber-500 ml-auto" />}
                </div>
                <div className="text-base font-bold text-foreground leading-tight">
                  {d.metricKey === "avg_score"
                    ? d.actual.toFixed(1)
                    : d.metricKey === "avg_resolution_hours"
                    ? formatHours(d.actual)
                    : Math.round(d.actual)}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  meta: {d.metricKey === "avg_resolution_hours" ? `${d.target}h` : d.target}
                </div>
                <div className="h-1.5 bg-muted rounded-full mt-1.5">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isHit ? "bg-emerald-500" : d.pct >= 50 ? "bg-amber-500" : "bg-destructive"
                    }`}
                    style={{ width: `${Math.min(100, d.pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
