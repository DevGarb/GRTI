import { LucideIcon, Target } from "lucide-react";
import { BentoTile, Accent, accentVar } from "./BentoTile";
import { cn } from "@/lib/utils";

export interface GoalPill {
  label: string;
  actual: number;
  target: number;
  accent: Accent;
  icon: LucideIcon;
  format?: (v: number) => string;
  suffix?: string;
  higherIsBetter?: boolean;
}

interface Props {
  goals: GoalPill[];
  variant?: "full" | "compact";
}

export function MonthGoalsStrip({ goals, variant = "full" }: Props) {
  if (variant === "compact") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
        {goals.map((g, i) => {
          const color = `hsl(${accentVar[g.accent]})`;
          const higher = g.higherIsBetter !== false;
          const rawPct = g.target > 0 ? (g.actual / g.target) * 100 : 0;
          const displayPct = higher
            ? Math.min(100, rawPct)
            : Math.min(100, g.target > 0 ? (g.target / Math.max(g.actual, 0.0001)) * 100 : 0);
          const fmt = g.format ?? ((v: number) => v.toLocaleString("pt-BR"));
          const Icon = g.icon;
          return (
            <div
              key={i}
              className="relative rounded-md border border-[hsl(var(--tv-border))] bg-[hsl(var(--tv-surface)/0.6)] backdrop-blur px-2.5 py-1.5 overflow-hidden"
            >
              <div className="absolute left-0 top-0 h-full w-[2px]" style={{ background: color }} />
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className="h-3 w-3 shrink-0" strokeWidth={1.75} style={{ color }} />
                <span className="text-[9px] uppercase tracking-wider text-[hsl(var(--tv-text-dim))] truncate">
                  {g.label}
                </span>
                <span
                  className="ml-auto font-mono-tech text-[9px] px-1 rounded shrink-0"
                  style={{ color, background: `${color}18` }}
                >
                  {Math.round(displayPct)}%
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-tv-display font-semibold text-sm tabular-nums leading-none text-[hsl(var(--tv-text))]">
                  {fmt(g.actual)}{g.suffix ?? ""}
                </span>
                <span className="font-mono-tech text-[9px] text-[hsl(var(--tv-text-mute))] truncate">
                  / {g.target > 0 ? fmt(g.target) : "—"}{g.suffix ?? ""}
                </span>
              </div>
              <div className="mt-1 h-[2px] rounded-full bg-[hsl(var(--tv-border))] overflow-hidden">
                <div
                  className="h-full transition-all duration-700"
                  style={{ width: `${g.target > 0 ? displayPct : 0}%`, background: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <BentoTile accent="violet">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md flex items-center justify-center border border-[hsl(var(--tv-accent-violet)/0.35)] bg-[hsl(var(--tv-accent-violet)/0.08)]">
            <Target className="h-3.5 w-3.5 text-[hsl(var(--tv-accent-violet))]" strokeWidth={1.75} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--tv-text-dim))]">Metas do Mês</div>
            <div className="text-sm text-[hsl(var(--tv-text))]">Acompanhamento das principais metas</div>
          </div>
        </div>
        <span className="font-mono-tech text-[10px] text-[hsl(var(--tv-text-mute))] tracking-widest">
          KPI · MENSAL
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2.5">
        {goals.map((g, i) => {
          const color = `hsl(${accentVar[g.accent]})`;
          const higher = g.higherIsBetter !== false;
          const rawPct = g.target > 0 ? (g.actual / g.target) * 100 : 0;
          const displayPct = higher
            ? Math.min(100, rawPct)
            : Math.min(100, g.target > 0 ? (g.target / Math.max(g.actual, 0.0001)) * 100 : 0);
          const fmt = g.format ?? ((v: number) => v.toLocaleString("pt-BR"));
          const Icon = g.icon;
          return (
            <div
              key={i}
              className="relative rounded-lg border border-[hsl(var(--tv-border))] bg-[hsl(var(--tv-surface-2))] p-3 overflow-hidden"
            >
              <div className="absolute left-0 top-0 h-full w-[2px]" style={{ background: color }} />
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.75} style={{ color }} />
                  <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--tv-text-dim))] truncate">
                    {g.label}
                  </span>
                </div>
                <span
                  className="font-mono-tech text-[9px] px-1.5 py-0.5 rounded"
                  style={{ color, background: `${color}15` }}
                >
                  {Math.round(displayPct)}%
                </span>
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span
                  className="font-tv-display font-semibold text-2xl tabular-nums leading-none"
                  style={{ color: "hsl(var(--tv-text))" }}
                >
                  {fmt(g.actual)}{g.suffix ?? ""}
                </span>
                <span className="font-mono-tech text-[11px] text-[hsl(var(--tv-text-mute))]">
                  / {g.target > 0 ? fmt(g.target) : "—"}{g.suffix ?? ""}
                </span>
              </div>
              <div className="h-[3px] rounded-full bg-[hsl(var(--tv-border))] overflow-hidden">
                <div
                  className="h-full transition-all duration-700"
                  style={{ width: `${g.target > 0 ? displayPct : 0}%`, background: color, boxShadow: `0 0 6px ${color}` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </BentoTile>
  );
}
