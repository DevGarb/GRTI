import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  crit: number;
  warn: number;
  topCategories: Array<{ name: string; count: number }>;
}

export function CriticalAlertsPanel({ crit, warn, topCategories }: Props) {
  const tone: "ok" | "warn" | "crit" = crit > 0 ? "crit" : warn > 0 ? "warn" : "ok";
  const container = tone === "crit"
    ? "border-[hsl(var(--status-open))]/50 bg-[hsl(var(--status-open-bg))]"
    : tone === "warn"
    ? "border-[hsl(var(--status-waiting))]/50 bg-[hsl(var(--status-waiting-bg))]"
    : "border-[hsl(var(--status-closed))]/50 bg-[hsl(var(--status-closed-bg))]";

  return (
    <div className={cn("rounded-2xl border-2 p-5 shadow-lg flex flex-col gap-4 h-full", container)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className={cn(
            "h-5 w-5",
            tone === "crit" && "text-[hsl(var(--status-open))]",
            tone === "warn" && "text-[hsl(var(--status-waiting))]",
            tone === "ok" && "text-[hsl(var(--status-closed))]",
          )} />
          <h3 className="text-sm md:text-base font-semibold uppercase tracking-wider">Alertas Críticos</h3>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-background/50 border p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Crítico</div>
          <div className="text-4xl font-bold tabular-nums text-[hsl(var(--status-open))]">{crit}</div>
        </div>
        <div className="rounded-xl bg-background/50 border p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Atenção</div>
          <div className="text-4xl font-bold tabular-nums text-[hsl(var(--status-waiting))]">{warn}</div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Categorias mais impactadas</div>
        {topCategories.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            {tone === "ok" ? "Tudo dentro do prazo ✅" : "—"}
          </div>
        ) : (
          <ul className="space-y-2">
            {topCategories.map((c, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                <span className="flex-1 truncate text-sm">{c.name}</span>
                <span className="tabular-nums font-bold text-[hsl(var(--status-open))]">{c.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
