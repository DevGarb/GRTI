import { CalendarDays } from "lucide-react";
import { BentoTile } from "./BentoTile";
import { cn } from "@/lib/utils";

export interface TodayTicket {
  id: string;
  code: string;
  title: string;
  priority: string;
  status: string;
  hour: string; // "HH:mm"
  technician?: string | null;
}

interface Props {
  tickets: TodayTicket[];
}

const START_HOUR = 8;
const END_HOUR = 18;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

const priorityAccent: Record<string, string> = {
  Urgente: "hsl(var(--tv-accent-magenta))",
  Alta: "hsl(var(--tv-accent-amber))",
  Média: "hsl(var(--tv-accent-cyan))",
  Baixa: "hsl(var(--tv-accent-violet))",
};

function hourToPct(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = (h + (m || 0) / 60) - START_HOUR;
  const span = END_HOUR - START_HOUR;
  return Math.max(0, Math.min(100, (total / span) * 100));
}

export function TodayTimelinePanel({ tickets }: Props) {
  return (
    <BentoTile accent="cyan" grid>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md flex items-center justify-center border border-[hsl(var(--tv-accent-cyan)/0.35)] bg-[hsl(var(--tv-accent-cyan)/0.08)]">
            <CalendarDays className="h-3.5 w-3.5 text-[hsl(var(--tv-accent-cyan))]" strokeWidth={1.75} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--tv-text-dim))]">Hoje</div>
            <div className="text-sm text-[hsl(var(--tv-text))]">Ticks ao longo do expediente</div>
          </div>
        </div>
        <span className="font-mono-tech text-[10px] text-[hsl(var(--tv-text-mute))] tracking-widest">
          {tickets.length.toString().padStart(3, "0")} EVT
        </span>
      </div>

      {/* Timeline */}
      <div className="relative mt-2 mb-4">
        <div className="flex justify-between text-[10px] font-mono-tech text-[hsl(var(--tv-text-mute))] mb-1.5">
          {HOURS.map(h => (
            <span key={h}>{h.toString().padStart(2, "0")}h</span>
          ))}
        </div>
        <div className="relative h-8">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-[hsl(var(--tv-border))]" />
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between">
            {HOURS.map(h => (
              <div key={h} className="h-2 w-px bg-[hsl(var(--tv-border-strong))]" />
            ))}
          </div>
          {tickets.map(t => {
            const pct = hourToPct(t.hour);
            const color = priorityAccent[t.priority] ?? "hsl(var(--tv-accent-cyan))";
            return (
              <div
                key={t.id}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                style={{ left: `${pct}%` }}
                title={`${t.code} · ${t.title} · ${t.hour}`}
              >
                <div
                  className="h-2.5 w-2.5 rounded-full ring-2"
                  style={{ background: color, boxShadow: `0 0 8px ${color}`, ["--tw-ring-color" as any]: "hsl(var(--tv-bg))" }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Ticket cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 max-h-[220px] overflow-hidden">
        {tickets.slice(0, 10).map(t => {
          const color = priorityAccent[t.priority] ?? "hsl(var(--tv-accent-cyan))";
          return (
            <div
              key={t.id}
              className="relative rounded-lg border border-[hsl(var(--tv-border))] bg-[hsl(var(--tv-surface-2))] p-2.5 overflow-hidden"
            >
              <div
                className="absolute left-0 top-0 h-full w-[2px]"
                style={{ background: color }}
              />
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono-tech text-[10px] text-[hsl(var(--tv-text-mute))]">
                  #{t.code}
                </span>
                <span
                  className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded"
                  style={{ color, background: `${color}18` }}
                >
                  {t.priority}
                </span>
              </div>
              <div className="text-xs text-[hsl(var(--tv-text))] leading-tight line-clamp-2 mb-1.5 min-h-[2.2em]">
                {t.title}
              </div>
              <div className="flex items-center justify-between text-[10px] text-[hsl(var(--tv-text-dim))] font-mono-tech">
                <span>{t.hour}</span>
                <span className="truncate ml-1">{t.technician ?? "—"}</span>
              </div>
            </div>
          );
        })}
        {tickets.length === 0 && (
          <div className="col-span-full text-center text-sm text-[hsl(var(--tv-text-mute))] py-6">
            Sem chamados registrados hoje
          </div>
        )}
      </div>
    </BentoTile>
  );
}
