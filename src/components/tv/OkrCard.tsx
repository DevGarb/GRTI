import { GaugeRing } from "./GaugeRing";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  current: number;
  target: number;
  unit?: string;
  higherIsBetter?: boolean; // false para "backlog < 20"
  format?: (v: number) => string;
}

export function OkrCard({ title, current, target, unit, higherIsBetter = true, format }: Props) {
  const pct = higherIsBetter
    ? target > 0 ? Math.min(100, (current / target) * 100) : 0
    : target > 0 ? Math.max(0, Math.min(100, ((target - current) / target) * 100 + (current <= target ? 0 : 0))) : 0;

  // Cor pelo pct atingido
  const tone: "ok" | "warn" | "crit" = pct >= 90 ? "ok" : pct >= 60 ? "warn" : "crit";
  const fmt = format ?? ((v: number) => `${v}${unit ?? ""}`);

  return (
    <div className="rounded-2xl border bg-card p-4 flex items-center gap-4 shadow-sm">
      <GaugeRing value={pct} size={110} stroke={10} tone={tone} sub="atingido" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">OKR</div>
        <div className="font-semibold text-base leading-tight">{title}</div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className={cn(
            "text-2xl font-bold tabular-nums",
            tone === "ok" && "text-[hsl(var(--status-closed))]",
            tone === "warn" && "text-[hsl(var(--status-waiting))]",
            tone === "crit" && "text-[hsl(var(--status-open))]",
          )}>{fmt(current)}</span>
          <span className="text-sm text-muted-foreground">/ meta {fmt(target)}</span>
        </div>
      </div>
    </div>
  );
}
