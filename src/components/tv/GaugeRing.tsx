import { cn } from "@/lib/utils";

interface Props {
  value: number; // 0-100
  size?: number;
  stroke?: number;
  label?: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "ok" | "warn" | "crit" | "primary";
}

const toneVar: Record<NonNullable<Props["tone"]>, string> = {
  ok: "var(--status-closed)",
  warn: "var(--status-waiting)",
  crit: "var(--status-open)",
  primary: "var(--primary)",
};

export function GaugeRing({ value, size = 160, stroke = 14, label, sub, tone = "primary" }: Props) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;
  const color = `hsl(${toneVar[tone]})`;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="hsl(var(--muted))" strokeWidth={stroke} fill="none"
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className={cn("font-bold tabular-nums leading-none")} style={{ color, fontSize: size * 0.28 }}>
          {label ?? `${Math.round(v)}%`}
        </div>
        {sub && <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">{sub}</div>}
      </div>
    </div>
  );
}
