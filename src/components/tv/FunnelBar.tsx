import { cn } from "@/lib/utils";

interface Segment { label: string; value: number; color: string; }

interface Props { segments: Segment[]; }

export function FunnelBar({ segments }: Props) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div className="space-y-3">
      <div className="flex h-14 rounded-lg overflow-hidden border">
        {segments.map((s, i) => {
          const pct = (s.value / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={i}
              className="flex items-center justify-center text-sm font-bold text-white transition-all"
              style={{ width: `${pct}%`, background: s.color, minWidth: pct > 0 ? 40 : 0 }}
              title={`${s.label}: ${s.value}`}
            >
              {s.value}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="h-3 w-3 rounded-sm" style={{ background: s.color }} />
            <span className="text-muted-foreground truncate">{s.label}</span>
            <span className="ml-auto font-semibold tabular-nums">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
