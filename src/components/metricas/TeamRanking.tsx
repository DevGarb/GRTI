import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { technicianStatus } from "@/lib/opStatus";
import type { ManagementMetricRow } from "@/hooks/useManagementMetrics";

interface Props {
  rows: ManagementMetricRow[];
  technicianSummaries?: Record<string, string>;
}

type SortKey = "closed" | "csat" | "rework";

function fmtMinutes(m: number) {
  if (!m || m <= 0) return "—";
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

function medal(idx: number) {
  return idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;
}

function statusBadge(status: ReturnType<typeof technicianStatus>) {
  const map = {
    excellent: { label: "Excelente", cls: "bg-[hsl(var(--status-closed-bg))] text-[hsl(var(--status-closed))]" },
    normal: { label: "Bom", cls: "bg-muted text-foreground" },
    attention: { label: "Atenção", cls: "bg-[hsl(var(--status-waiting-bg))] text-[hsl(var(--status-waiting))]" },
    critical: { label: "Crítico", cls: "bg-[hsl(var(--status-open-bg))] text-[hsl(var(--status-open))]" },
  } as const;
  const cfg = map[status];
  return <Badge variant="outline" className={cn("border-0", cfg.cls)}>{cfg.label}</Badge>;
}

export function TeamRanking({ rows, technicianSummaries = {} }: Props) {
  const [sortBy, setSortBy] = useState<SortKey>("closed");

  const sorted = [...rows].sort((a, b) => {
    if (sortBy === "closed") return b.closed_in_period - a.closed_in_period;
    if (sortBy === "csat") return Number(b.avg_csat) - Number(a.avg_csat);
    return a.rework_percent - b.rework_percent;
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Ranking da Equipe</CardTitle>
        <div className="flex gap-1">
          {[
            { key: "closed" as const, label: "Fechamentos" },
            { key: "csat" as const, label: "CSAT" },
            { key: "rework" as const, label: "Menor retrabalho" },
          ].map((opt) => (
            <Button
              key={opt.key}
              size="sm"
              variant={sortBy === opt.key ? "default" : "outline"}
              onClick={() => setSortBy(opt.key)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {sorted.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Sem dados no período.</p>}
        {sorted.map((r, idx) => {
          const status = technicianStatus({
            reworkPct: r.rework_percent,
            avgCsat: Number(r.avg_csat),
            csatCount: r.csat_count,
            closed: r.closed_in_period,
          });
          return (
            <Collapsible key={r.user_id}>
              <Card className="border">
                <CollapsibleTrigger asChild>
                  <button className="w-full text-left">
                    <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-muted text-sm font-bold shrink-0">
                        {medal(idx) ?? idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{r.full_name}</p>
                          {statusBadge(status)}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                          <span><b className="text-foreground">{r.closed_in_period}</b> fechados</span>
                          <span><b className="text-foreground">{r.in_progress_now}</b> em andamento</span>
                          <span><b className="text-foreground">{r.awaiting_approval}</b> aguardando</span>
                          <span>CSAT <b className="text-foreground">{r.csat_count > 0 ? Number(r.avg_csat).toFixed(2) : "—"}</b></span>
                          <span>TMA <b className="text-foreground">{fmtMinutes(Number(r.avg_handle_minutes))}</b></span>
                          <span className={cn(r.rework_percent > 20 && "text-[hsl(var(--status-open))]")}>Retrab. <b>{r.rework_percent.toFixed(1)}%</b></span>
                        </div>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-3 pb-3 pt-1 border-t bg-muted/30 space-y-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div><p className="text-muted-foreground">Total atribuídos</p><p className="font-bold text-base">{r.total_assigned}</p></div>
                      <div><p className="text-muted-foreground">Pontuação</p><p className="font-bold text-base">{Number(r.points).toFixed(0)}</p></div>
                      <div><p className="text-muted-foreground">Retrabalho (qtd)</p><p className="font-bold text-base">{r.rework_count}</p></div>
                      <div><p className="text-muted-foreground">Avaliações</p><p className="font-bold text-base">{r.csat_count}</p></div>
                    </div>
                    {technicianSummaries[r.user_id] && (
                      <p className="text-sm italic text-muted-foreground">"{technicianSummaries[r.user_id]}"</p>
                    )}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
