import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { computeOpStatus, opStatusLabel, opStatusEmoji, type OpStatus } from "@/lib/opStatus";

interface Props {
  closed: number;
  inProgress: number;
  awaiting: number;
  backlog: number;
  csat: number;
  csatCount: number;
  tmaMinutes: number;
  points: number;
  activeTechs: number;
  reworkPercent: number;
}

function fmtMinutes(m: number) {
  if (!m || m <= 0) return "—";
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

function statusClasses(status: OpStatus) {
  return status === "normal"
    ? "bg-[hsl(var(--status-closed-bg))] text-[hsl(var(--status-closed))] border-[hsl(var(--status-closed))]"
    : status === "attention"
    ? "bg-[hsl(var(--status-waiting-bg))] text-[hsl(var(--status-waiting))] border-[hsl(var(--status-waiting))]"
    : "bg-[hsl(var(--status-open-bg))] text-[hsl(var(--status-open))] border-[hsl(var(--status-open))]";
}

function Kpi({ label, value, accent }: { label: string; value: string | number; accent?: "primary" | "warn" | "danger" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn(
          "text-2xl md:text-3xl font-bold mt-1",
          accent === "warn" && "text-[hsl(var(--status-waiting))]",
          accent === "danger" && "text-[hsl(var(--status-open))]",
        )}>{value}</p>
      </CardContent>
    </Card>
  );
}

export function ExecutiveSummary(props: Props) {
  const { closed, inProgress, awaiting, backlog, csat, csatCount, tmaMinutes, points, activeTechs, reworkPercent } = props;
  const status = computeOpStatus({
    backlogTotal: backlog,
    awaitingApproval: awaiting,
    reworkPercent,
    avgCsat: csat,
    csatCount,
  });

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Resumo Executivo do Dia</h2>
        <Badge variant="outline" className={cn("text-sm px-3 py-1 border-2", statusClasses(status))}>
          {opStatusEmoji(status)} {opStatusLabel(status)}
        </Badge>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Kpi label="Finalizados" value={closed} />
        <Kpi label="Em Andamento" value={inProgress} />
        <Kpi label="Aguardando Aprov." value={awaiting} accent={awaiting >= 10 ? "warn" : undefined} />
        <Kpi label="Backlog Total" value={backlog} accent={backlog >= 20 ? "warn" : undefined} />
        <Kpi label="CSAT Médio" value={csat > 0 ? csat.toFixed(2) : "—"} />
        <Kpi label="TMA Médio" value={fmtMinutes(tmaMinutes)} />
        <Kpi label="Pontuação" value={points.toFixed(0)} />
        <Kpi label="Técnicos Ativos" value={activeTechs} />
        <Kpi label="Retrabalho" value={`${reworkPercent.toFixed(1)}%`} accent={reworkPercent > 20 ? "danger" : reworkPercent > 10 ? "warn" : undefined} />
      </div>
    </section>
  );
}
