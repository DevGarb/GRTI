import { Target, TrendingUp, Star, Clock, Award, CheckCircle2, AlertTriangle, Wrench } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

interface TechnicianStats {
  userId: string;
  name: string;
  totalClosed: number;
  avgScore: number;
  avgResolutionHours: number;
  totalPoints: number;
  preventivasDone: number;
}

interface PerformanceGoal {
  id: string;
  target_type: string;
  target_id: string;
  target_label: string;
  metric: string;
  target_value: number;
}

interface Props {
  stats: TechnicianStats[];
  goals: PerformanceGoal[];
  formatHours: (h: number) => string;
}

const METRIC_CONFIG: Record<string, { label: string; icon: typeof Target; shortLabel: string }> = {
  tickets_closed: { label: "Chamados Fechados", icon: TrendingUp, shortLabel: "Chamados" },
  avg_score: { label: "Nota Média", icon: Star, shortLabel: "Nota" },
  avg_resolution_hours: { label: "Tempo Resolução", icon: Clock, shortLabel: "Tempo" },
  points: { label: "Pontuação", icon: Award, shortLabel: "Pontos" },
  preventivas_done: { label: "Preventivas Realizadas", icon: Wrench, shortLabel: "Preventivas" },
};

function getActualValue(tech: TechnicianStats, metric: string): number {
  if (metric === "tickets_closed") return tech.totalClosed;
  if (metric === "avg_score") return tech.avgScore;
  if (metric === "avg_resolution_hours") return tech.avgResolutionHours;
  if (metric === "points") return tech.totalPoints;
  if (metric === "preventivas_done") return tech.preventivasDone;
  return 0;
}

function getPct(actual: number, target: number, isInverse: boolean): number {
  if (target <= 0) return 0;
  const pct = Math.round((actual / target) * 100);
  return isInverse ? (pct <= 100 ? 100 : Math.max(0, 200 - pct)) : Math.min(pct, 100);
}

export default function GoalsSummaryCards({ stats, goals, formatHours }: Props) {
  // Only show techs that have goals
  const techsWithGoals = stats.filter((tech) =>
    goals.some((g) => g.target_type === "individual" && g.target_id === tech.userId)
  );

  if (techsWithGoals.length === 0) {
    return (
      <div className="card-elevated p-8 text-center">
        <Target className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Nenhuma meta individual definida para este período.</p>
        <p className="text-xs text-muted-foreground mt-1">Vá em "Definir Metas" para criar metas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" />
        Resumo de Metas por Técnico
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {techsWithGoals.map((tech) => {
          const techGoals = goals.filter(
            (g) => g.target_type === "individual" && g.target_id === tech.userId
          );

          const radarData = techGoals.map((g) => {
            const isInverse = g.metric === "avg_resolution_hours";
            const actual = getActualValue(tech, g.metric);
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
            <div key={tech.userId} className="card-elevated p-4 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">
                      {tech.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{tech.name}</p>
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
                {/* Radar Chart */}
                {radarData.length >= 3 ? (
                  <div className="w-[160px] h-[140px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis
                          dataKey="metric"
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        />
                        <PolarRadiusAxis
                          angle={90}
                          domain={[0, 100]}
                          tick={false}
                          axisLine={false}
                        />
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
                ) : null}

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
        })}
      </div>
    </div>
  );
}
