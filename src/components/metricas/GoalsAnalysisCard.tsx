import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw, Target, Trophy, Star, CheckCircle2 } from "lucide-react";
import type { GoalsAnalysisData } from "@/hooks/useGoalsAnalysis";
import { cn } from "@/lib/utils";

interface Props {
  data?: GoalsAnalysisData;
  loading?: boolean;
  insights: string[];
  insightsLoading?: boolean;
  onGenerate: () => void;
}

function Kpi({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

const MEDALS = ["🥇", "🥈", "🥉", "4º"];

export function GoalsAnalysisCard({ data, loading, insights, insightsLoading, onGenerate }: Props) {
  if (loading) {
    return (
      <Card><CardContent className="p-6 text-sm text-muted-foreground">Carregando metas…</CardContent></Card>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center space-y-2">
          <Target className="h-8 w-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground">
            Nenhuma meta individual definida para {data?.periodLabel ?? "o período"}.
          </p>
          <p className="text-xs text-muted-foreground">Defina metas em “Metas dos Técnicos”.</p>
        </CardContent>
      </Card>
    );
  }

  const { kpis, podium, rows } = data;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Kpi label="Atingimento Médio" value={`${kpis.avgAttainment}%`} icon={Target} />
        <Kpi label="Chamados Resolvidos" value={kpis.totalClosed} icon={CheckCircle2} />
        <Kpi label="CSAT Médio" value={kpis.avgCsat > 0 ? kpis.avgCsat.toFixed(2) : "—"} icon={Star} />
        <Kpi label="Metas Batidas" value={`${kpis.goalsMet}/${kpis.goalsTotal}`} icon={Trophy} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" /> Top 4 — Pontuação de Chamados ({data.periodLabel})
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {podium.map((p) => (
            <div key={p.position} className={cn(
              "rounded-lg border p-3",
              p.position === 1 && "border-primary/50 bg-primary/5"
            )}>
              <div className="flex items-center justify-between">
                <span className="text-lg">{MEDALS[p.position - 1]}</span>
                <Badge variant="outline">{p.points.toFixed(0)} pts</Badge>
              </div>
              <p className="text-sm font-medium mt-1 truncate">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.closed} chamado(s)</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Atingimento por técnico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.map((r) => (
            <div key={r.userId} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{r.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{r.closed} fechados</span>
                  <span>· CSAT {r.csat > 0 ? r.csat.toFixed(2) : "—"}</span>
                  <span>· {r.points.toFixed(0)} pts</span>
                  <Badge variant={r.attainment >= 100 ? "default" : r.attainment >= 70 ? "secondary" : "destructive"}>
                    {r.attainment}%
                  </Badge>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {r.goals.map((g) => (
                  <div key={g.metric} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{g.label}</span>
                      <span className="font-medium">
                        {g.actual} {g.inverse ? "/ máx " : "/ "} {g.target} ({g.pct}%)
                      </span>
                    </div>
                    <Progress value={g.pct} className="h-1.5" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-primary/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Análise IA das Metas
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onGenerate} disabled={insightsLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-1", insightsLoading && "animate-spin")} />
            {insights.length > 0 ? "Regerar" : "Gerar"}
          </Button>
        </CardHeader>
        <CardContent>
          {insightsLoading && <p className="text-sm text-muted-foreground">Analisando metas…</p>}
          {!insightsLoading && insights.length === 0 && (
            <p className="text-sm text-muted-foreground">Clique em “Gerar” para a análise de IA sobre o atingimento das metas.</p>
          )}
          {insights.length > 0 && !insightsLoading && (
            <ul className="space-y-1.5 text-sm">
              {insights.map((i, idx) => (
                <li key={idx} className="flex gap-2"><span>•</span><span>{i}</span></li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
