import { LucideIcon } from "lucide-react";
import { BentoTile, Accent, accentVar } from "./BentoTile";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";

interface Metric {
  label: string;
  value: number;
  sub?: string;
  icon: LucideIcon;
  accent: Accent;
}

interface Props {
  left: Metric;
  right: Metric;
  code?: string;
  className?: string;
}

function Half({ m }: { m: Metric }) {
  const color = `hsl(${accentVar[m.accent]})`;
  const current = useAnimatedNumber(m.value);
  const Icon = m.icon;
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-4">
        <div
          className="h-8 w-8 rounded-md flex items-center justify-center border shrink-0"
          style={{ borderColor: `${color}55`, background: `${color}12` }}
        >
          <Icon className="h-4 w-4" strokeWidth={1.75} style={{ color }} />
        </div>
        <span className="text-sm md:text-base uppercase tracking-[0.18em] text-[hsl(var(--tv-text))] font-semibold truncate">
          {m.label}
        </span>
      </div>
      <div
        className="font-tv-display font-semibold tabular-nums leading-none"
        style={{ fontSize: "4rem", color }}
      >
        {current.toFixed(0)}
      </div>
      {m.sub && (
        <div className="mt-2 text-xs text-[hsl(var(--tv-text-dim))] truncate">{m.sub}</div>
      )}
    </div>
  );
}

export function DualKpiTile({ left, right, code, className }: Props) {
  const color = `hsl(${accentVar[left.accent]})`;
  return (
    <BentoTile accent={left.accent} grid className={className}>
      {code && (
        <span className="absolute right-0 top-0 font-mono-tech text-[10px] text-[hsl(var(--tv-text-mute))] tracking-widest">
          {code}
        </span>
      )}
      <div className="flex items-stretch gap-5">
        <Half m={left} />
        <div className="w-px self-stretch bg-[hsl(var(--tv-border))]" />
        <Half m={right} />
      </div>
      <div className="mt-4 h-[2px] w-full rounded-full bg-[hsl(var(--tv-border))] overflow-hidden">
        <div
          className="h-full w-1/3 tv-shimmer"
          style={{ background: color, boxShadow: `0 0 10px ${color}` }}
        />
      </div>
    </BentoTile>
  );
}
