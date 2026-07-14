import { Inbox, PlayCircle, PauseCircle, CheckCircle2, LucideIcon } from "lucide-react";
import { Accent, accentVar } from "./BentoTile";

interface Chip {
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

export function FunnelStrip({ received, inProgress, awaiting, closed }: Props) {
  const total = received || 1;
  const chips: Chip[] = [
    { label: "Recebidos", value: received, accent: "blue", icon: Inbox },
    { label: "Em Andamento", value: inProgress, accent: "cyan", icon: PlayCircle },
    { label: "Aguardando", value: awaiting, accent: "amber", icon: PauseCircle },
    { label: "Finalizados", value: closed, accent: "lime", icon: CheckCircle2 },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {chips.map((c, i) => {
        const color = `hsl(${accentVar[c.accent]})`;
        const pct = (c.value / total) * 100;
        const Icon = c.icon;
        return (
          <div
            key={i}
            className="relative rounded-md border border-[hsl(var(--tv-border))] bg-[hsl(var(--tv-surface)/0.7)] backdrop-blur px-3 py-2 overflow-hidden"
          >
            <div className="absolute left-0 top-0 h-full w-[2px]" style={{ background: color }} />
            <div className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} style={{ color }} />
              <span className="text-[10px] uppercase tracking-widest text-[hsl(var(--tv-text-dim))] truncate">
                {c.label}
              </span>
              <span
                className="ml-auto font-mono-tech text-[9px] px-1.5 py-0.5 rounded shrink-0"
                style={{ color, background: `${color}18` }}
              >
                {pct.toFixed(0)}%
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="font-display font-semibold text-2xl tabular-nums leading-none text-[hsl(var(--tv-text))]">
                {c.value}
              </span>
              <span className="font-mono-tech text-[9px] text-[hsl(var(--tv-text-mute))]">
                de {total}
              </span>
            </div>
            <div className="mt-1.5 h-1 rounded-full bg-[hsl(var(--tv-border))] overflow-hidden">
              <div
                className="h-full transition-all duration-700"
                style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
