import { CalendarDays, Sunrise, Sunset } from "lucide-react";
import { BentoTile } from "./BentoTile";
import { TodayTicket } from "./TodayTimelinePanel";

interface Props {
  tickets: TodayTicket[];
}

const MORNING_HOURS = [8, 9, 10, 11, 12];
const AFTERNOON_HOURS = [13, 14, 15, 16, 17];

const priorityAccent: Record<string, string> = {
  Urgente: "hsl(var(--tv-accent-magenta))",
  Alta: "hsl(var(--tv-accent-amber))",
  Média: "hsl(var(--tv-accent-cyan))",
  Baixa: "hsl(var(--tv-accent-violet))",
};

function hourOf(hhmm: string) {
  const [h] = hhmm.split(":").map(Number);
  return h;
}

function TicketChip({ t }: { t: TodayTicket }) {
  const color = priorityAccent[t.priority] ?? "hsl(var(--tv-accent-cyan))";
  return (
    <div
      className="relative rounded-md border border-[hsl(var(--tv-border))] bg-[hsl(var(--tv-surface-2))] px-1.5 py-1 overflow-hidden min-w-0"
      title={`${t.code} · ${t.title} · ${t.hour}`}
    >
      <div className="absolute left-0 top-0 h-full w-[2px]" style={{ background: color }} />
      <div className="flex items-center gap-1.5 leading-none">
        <span className="font-mono-tech text-[9px] text-[hsl(var(--tv-text-mute))] shrink-0">
          {t.hour}
        </span>
        <span className="text-[9px] text-[hsl(var(--tv-text-dim))] font-mono-tech shrink-0">
          #{t.code}
        </span>
        <span
          className="text-[8px] uppercase tracking-wider font-semibold px-1 py-0 rounded shrink-0"
          style={{ color, background: `${color}18` }}
        >
          {t.priority}
        </span>
      </div>
      <div className="text-[11px] text-[hsl(var(--tv-text))] leading-tight truncate mt-0.5">
        {t.title}
      </div>
    </div>
  );
}

function HourRow({ hour, tickets }: { hour: number; tickets: TodayTicket[] }) {
  return (
    <div className="flex items-start gap-2 py-1 border-b border-[hsl(var(--tv-border))] last:border-b-0 min-h-[28px]">
      <div className="font-mono-tech text-[10px] text-[hsl(var(--tv-text-mute))] w-8 shrink-0 pt-0.5">
        {hour.toString().padStart(2, "0")}h
      </div>
      <div className="flex-1 min-w-0 grid grid-cols-1 xl:grid-cols-2 gap-1">
        {tickets.length === 0 ? (
          <div className="text-[10px] text-[hsl(var(--tv-text-mute))]/60 italic pt-0.5">—</div>
        ) : (
          tickets.map(t => <TicketChip key={t.id} t={t} />)
        )}
      </div>
    </div>
  );
}

export function TodayAgendaPanel({ tickets }: Props) {
  const grouped = new Map<number, TodayTicket[]>();
  for (const t of tickets) {
    const h = hourOf(t.hour);
    if (!grouped.has(h)) grouped.set(h, []);
    grouped.get(h)!.push(t);
  }
  // Fold hours outside window into edges
  for (const t of tickets) {
    const h = hourOf(t.hour);
    if (h < 8) {
      grouped.get(8)?.push(t);
      grouped.get(h)?.splice(grouped.get(h)!.indexOf(t), 1);
    } else if (h > 17) {
      grouped.get(17)?.push(t);
      grouped.get(h)?.splice(grouped.get(h)!.indexOf(t), 1);
    }
  }

  return (
    <BentoTile accent="cyan" grid>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md flex items-center justify-center border border-[hsl(var(--tv-accent-cyan)/0.35)] bg-[hsl(var(--tv-accent-cyan)/0.08)]">
            <CalendarDays className="h-3.5 w-3.5 text-[hsl(var(--tv-accent-cyan))]" strokeWidth={1.75} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--tv-text-dim))]">Agenda de Hoje</div>
            <div className="text-sm text-[hsl(var(--tv-text))]">Chamados por horário</div>
          </div>
        </div>
        <span className="font-mono-tech text-[10px] text-[hsl(var(--tv-text-mute))] tracking-widest">
          {tickets.length.toString().padStart(3, "0")} EVT
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[
          { label: "Manhã · 08h–12h", icon: Sunrise, hours: MORNING_HOURS },
          { label: "Tarde · 13h–17h", icon: Sunset, hours: AFTERNOON_HOURS },
        ].map((col, ci) => {
          const Icon = col.icon;
          return (
            <div key={ci} className="rounded-lg border border-[hsl(var(--tv-border))] bg-[hsl(var(--tv-surface-2))]/40 p-3">
              <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-[hsl(var(--tv-border))]">
                <Icon className="h-3.5 w-3.5 text-[hsl(var(--tv-accent-cyan))]" strokeWidth={1.75} />
                <span className="text-[10px] uppercase tracking-widest text-[hsl(var(--tv-text-dim))]">
                  {col.label}
                </span>
              </div>
              <div>
                {col.hours.map(h => (
                  <HourRow key={h} hour={h} tickets={grouped.get(h) ?? []} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {tickets.length === 0 && (
        <div className="text-center text-sm text-[hsl(var(--tv-text-mute))] py-4 mt-2">
          Sem chamados registrados hoje
        </div>
      )}
    </BentoTile>
  );
}
