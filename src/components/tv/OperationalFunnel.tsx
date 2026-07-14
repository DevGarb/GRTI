import { Inbox, PlayCircle, PauseCircle, CheckCircle2, Filter, ChevronRight, LucideIcon } from "lucide-react";
import { BentoTile, Accent, accentVar } from "./BentoTile";

interface Stage {
  label: string;
  value: number;
  accent: Accent;
  icon: LucideIcon;
}

interface Props {
  received: number;
  inProgress: number;
  awaiting: number;
  closed: number;
}

export function OperationalFunnel({ received, inProgress, awaiting, closed }: Props) {
  const total = received || 1;
  const stages: Stage[] = [
    { label: "Recebidos", value: received, accent: "blue", icon: Inbox },
    { label: "Em Andamento", value: inProgress, accent: "cyan", icon: PlayCircle },
    { label: "Aguardando", value: awaiting, accent: "amber", icon: PauseCircle },
    { label: "Finalizados", value: closed, accent: "lime", icon: CheckCircle2 },
  ];

  return (
    <BentoTile accent="blue" grid>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md flex items-center justify-center border border-[hsl(var(--tv-accent-blue)/0.35)] bg-[hsl(var(--tv-accent-blue)/0.08)]">
            <Filter className="h-3.5 w-3.5 text-[hsl(var(--tv-accent-blue))]" strokeWidth={1.75} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--tv-text-dim))]">Funil Operacional</div>
            <div className="text-sm text-[hsl(var(--tv-text))]">Visão geral do fluxo de tickets</div>
          </div>
        </div>
        <span className="font-mono-tech text-[10px] text-[hsl(var(--tv-text-mute))] tracking-widest">
          FLW · {total.toString().padStart(3, "0")}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3 items-stretch">
        {stages.map((s, i) => {
          const color = `hsl(${accentVar[s.accent]})`;
          const pct = (s.value / total) * 100;
          const Icon = s.icon;
          return (
            <div key={i} className="relative">
              <div
                className="relative rounded-lg border border-[hsl(var(--tv-border))] bg-[hsl(var(--tv-surface-2))] p-3 overflow-hidden h-full"
              >
                <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: color }} />
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="h-4 w-4" strokeWidth={1.75} style={{ color }} />
                  <span className="text-[10px] uppercase tracking-widest text-[hsl(var(--tv-text-dim))] truncate">
                    {s.label}
                  </span>
                </div>
                <div className="font-display font-semibold text-4xl tabular-nums leading-none text-[hsl(var(--tv-text))]">
                  {s.value}
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="font-mono-tech text-[10px] text-[hsl(var(--tv-text-mute))]">
                    {pct.toFixed(0)}% vol
                  </span>
                  <span className="font-mono-tech text-[10px]" style={{ color }}>
                    ●
                  </span>
                </div>
                <div className="mt-2 h-1 rounded-full bg-[hsl(var(--tv-border))] overflow-hidden">
                  <div
                    className="h-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}` }}
                  />
                </div>
              </div>
              {i < stages.length - 1 && (
                <ChevronRight
                  className="hidden md:block absolute top-1/2 -right-2.5 -translate-y-1/2 h-4 w-4 text-[hsl(var(--tv-text-mute))] z-10"
                  strokeWidth={1.5}
                />
              )}
            </div>
          );
        })}
      </div>
    </BentoTile>
  );
}
