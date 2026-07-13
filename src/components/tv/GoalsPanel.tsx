import { Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoalRow {
  label: string;
  actual: number;
  target: number;
  format?: (v: number) => string;
  higherIsBetter?: boolean;
  suffix?: string;
}

interface Props {
  rows: GoalRow[];
}

function computeTone(pct: number, higherIsBetter: boolean): "ok" | "warn" | "crit" {
  if (higherIsBetter) {
    if (pct >= 100) return "ok";
    if (pct >= 70) return "warn";
    return "crit";
  }
  // lower is better: actual <= target => ok
  if (pct <= 100) return "ok";
  if (pct <= 130) return "warn";
  return "crit";
}

export function GoalsPanel({ rows }: Props) {
  return (
    <div className="rounded-2xl border-2 border-primary/40 bg-card p-5 shadow-lg flex flex-col gap-3 h-full">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-primary" />
        <h3 className="text-sm md:text-base font-semibold uppercase tracking-wider">Metas do Mês</h3>
      </div>

      <div className="flex-1 flex flex-col gap-3 justify-around">
        {rows.map((r, idx) => {
          const higherIsBetter = r.higherIsBetter !== false;
          const target = r.target || 0;
          const rawPct = target > 0 ? (r.actual / target) * 100 : 0;
          const tone = target > 0 ? computeTone(rawPct, higherIsBetter) : "warn";
          const displayPct = higherIsBetter ? Math.min(100, rawPct) : Math.min(100, (target / Math.max(r.actual, 0.0001)) * 100);

          const fmt = r.format ?? ((v: number) => v.toLocaleString("pt-BR"));
          const barColor =
            tone === "ok" ? "bg-[hsl(var(--status-closed))]" :
            tone === "warn" ? "bg-[hsl(var(--status-waiting))]" :
            "bg-[hsl(var(--status-open))]";
          const textColor =
            tone === "ok" ? "text-[hsl(var(--status-closed))]" :
            tone === "warn" ? "text-[hsl(var(--status-waiting))]" :
            "text-[hsl(var(--status-open))]";

          return (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs uppercase tracking-widest text-muted-foreground truncate">{r.label}</span>
                <div className="flex items-baseline gap-1 shrink-0">
                  <span className={cn("text-lg font-bold tabular-nums", textColor)}>{fmt(r.actual)}{r.suffix ?? ""}</span>
                  <span className="text-xs text-muted-foreground">/ {target > 0 ? fmt(target) : "—"}{r.suffix ?? ""}</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full transition-all duration-700", barColor)}
                  style={{ width: `${target > 0 ? displayPct : 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
