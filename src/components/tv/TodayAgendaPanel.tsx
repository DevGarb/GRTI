import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { CalendarDays, Sunrise, Sunset } from "lucide-react";
import { BentoTile } from "./BentoTile";
import { TodayTicket } from "./TodayTimelinePanel";
import { useTicketModal } from "@/contexts/TicketModalContext";

interface FlashCtx { flashKey: number; targetId: string | null }
const FlashContext = createContext<FlashCtx>({ flashKey: 0, targetId: null });
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export type AgendaFilterType = "today" | "custom";
export interface AgendaFilter {
  type: AgendaFilterType;
  from: string; // YYYY-MM-DD
  to: string;
}

interface Props {
  tickets: (TodayTicket & { date?: string })[];
  filter: AgendaFilter;
  onFilterChange: (f: AgendaFilter) => void;
  /** Increments to trigger a one-shot flash animation. */
  flashKey?: number;
  /** If provided AND visible in current tickets, flash only that chip; else flash whole panel. */
  flashTicketId?: string | null;
}

const MORNING_HOURS = [8, 9, 10, 11, 12];
const AFTERNOON_HOURS = [13, 14, 15, 16, 17];

const priorityAccent: Record<string, string> = {
  Urgente: "hsl(var(--tv-accent-magenta))",
  Alta: "hsl(var(--tv-accent-amber))",
  Média: "hsl(var(--tv-accent-cyan))",
  Baixa: "hsl(var(--tv-accent-violet))",
};

const statusGradient: Record<string, string> = {
  Fechado: "linear-gradient(135deg, hsl(var(--tv-accent-lime) / 0.38) 0%, hsl(var(--tv-accent-lime) / 0.05) 100%)",
  Aprovado: "linear-gradient(135deg, hsl(var(--tv-accent-lime) / 0.38) 0%, hsl(var(--tv-accent-lime) / 0.05) 100%)",
  "Aguardando Aprovação": "linear-gradient(135deg, hsl(var(--tv-accent-lime) / 0.38) 0%, hsl(var(--tv-accent-lime) / 0.05) 100%)",
  "Em Andamento": "linear-gradient(135deg, hsl(var(--tv-accent-amber) / 0.36) 0%, hsl(var(--tv-accent-amber) / 0.05) 100%)",
  Aberto: "linear-gradient(135deg, hsl(var(--tv-accent-red) / 0.42) 0%, hsl(var(--tv-accent-red) / 0.06) 100%)",
};

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

export function computeAgendaRange(input: Date | "today" = "today"): AgendaFilter {
  const now = new Date();
  const d = input === "today" ? now : input;
  const s = ymd(d);
  return { type: s === ymd(now) ? "today" : "custom", from: s, to: s };
}

/** First day of the previous month (lower bound for the agenda date picker). */
export function agendaMinDate(now: Date = new Date()) {
  return new Date(now.getFullYear(), now.getMonth() - 1, 1);
}

function hourOf(hhmm: string) {
  const [h] = hhmm.split(":").map(Number);
  return h;
}

function TicketChip({ t }: { t: TodayTicket & { date?: string } }) {
  const color = priorityAccent[t.priority] ?? "hsl(var(--tv-accent-cyan))";
  const gradient = statusGradient[t.status];
  const { openTicket } = useTicketModal();
  const { flashKey, targetId } = useContext(FlashContext);
  const [flashing, setFlashing] = useState(false);
  useEffect(() => {
    if (!flashKey || targetId !== t.id) return;
    setFlashing(false);
    const raf = requestAnimationFrame(() => setFlashing(true));
    const to = window.setTimeout(() => setFlashing(false), 1600);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(to); };
  }, [flashKey, targetId, t.id]);
  return (
    <button
      type="button"
      onClick={() => openTicket(t.id)}
      className={cn(
        "relative w-full text-left rounded-md border border-[hsl(var(--tv-border))] bg-[hsl(var(--tv-surface-2))] px-2 py-1.5 overflow-hidden min-w-0 cursor-pointer transition hover:border-[hsl(var(--tv-border-strong))] hover:bg-[hsl(var(--tv-surface))] focus:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--tv-accent-cyan))]",
        flashing && "tv-flash",
      )}
      style={{ backgroundImage: gradient }}
      title={`${t.code} · ${t.title} · ${t.hour}`}
    >
      <div className="absolute left-0 top-0 h-full w-[3px]" style={{ background: color }} />
      <div className="flex items-center gap-2 leading-none">
        <span className="font-mono-tech text-[13px] text-[hsl(var(--tv-text-dim))] shrink-0">
          {t.hour}
        </span>
        <span className="text-[13px] text-[hsl(var(--tv-text-dim))] font-mono-tech shrink-0">
          #{t.code}
        </span>
        <span
          className="text-[11px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded shrink-0"
          style={{ color, background: `${color}22` }}
        >
          {t.priority}
        </span>
      </div>
      <div className="text-[15px] font-medium text-[hsl(var(--tv-text))] leading-tight truncate mt-1">
        {t.title}
      </div>

    </button>
  );
}

function HourRow({ hour, tickets }: { hour: number; tickets: (TodayTicket & { date?: string })[] }) {
  return (
    <div className="flex items-start gap-2 py-1 border-b border-[hsl(var(--tv-border))] last:border-b-0 min-h-[32px]">
      <div className="font-mono-tech text-[14px] font-semibold text-[hsl(var(--tv-text-dim))] w-10 shrink-0 pt-0.5">
        {hour.toString().padStart(2, "0")}h
      </div>
      <div className="flex-1 min-w-0 grid grid-cols-1 xl:grid-cols-2 gap-1">
        {tickets.length === 0 ? (
          <div className="text-[13px] text-[hsl(var(--tv-text-mute))]/70 italic pt-0.5">—</div>

        ) : (
          tickets.map(t => <TicketChip key={t.id} t={t} />)
        )}
      </div>
    </div>
  );
}

function SingleDayView({ tickets }: { tickets: (TodayTicket & { date?: string })[] }) {
  const grouped = new Map<number, (TodayTicket & { date?: string })[]>();
  for (let h = 0; h <= 23; h++) grouped.set(h, []);
  for (const t of tickets) {
    const h = Math.min(23, Math.max(0, hourOf(t.hour)));
    const bucket = h < 8 ? 8 : h > 17 ? 17 : h;
    grouped.get(bucket)!.push(t);
  }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {[
        { label: "Manhã · 08h–12h", icon: Sunrise, hours: MORNING_HOURS },
        { label: "Tarde · 13h–17h", icon: Sunset, hours: AFTERNOON_HOURS },
      ].map((col, ci) => {
        const Icon = col.icon;
        return (
          <div key={ci} className="rounded-lg border border-[hsl(var(--tv-border))] bg-[hsl(var(--tv-surface-2))]/40 p-3">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[hsl(var(--tv-border))]">
              <Icon className="h-4 w-4 text-[hsl(var(--tv-accent-cyan))]" strokeWidth={1.75} />
              <span className="text-[13px] font-semibold uppercase tracking-widest text-[hsl(var(--tv-text-dim))]">
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
  );
}

export function TodayAgendaPanel({ tickets, filter, onFilterChange, flashKey = 0, flashTicketId = null }: Props) {
  // Panel-wide flash when target isn't in the visible list
  const chipTargetVisible = !!flashTicketId && tickets.some(t => t.id === flashTicketId);
  const [panelFlashing, setPanelFlashing] = useState(false);
  useEffect(() => {
    if (!flashKey) return;
    if (chipTargetVisible) return;
    setPanelFlashing(false);
    const raf = requestAnimationFrame(() => setPanelFlashing(true));
    const to = window.setTimeout(() => setPanelFlashing(false), 1600);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(to); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flashKey]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedDate = useMemo(() => new Date(filter.from + "T12:00:00"), [filter.from]);
  const isToday = filter.type === "today";

  const headerTitle = useMemo(
    () => (isToday ? "Agenda de Hoje" : `Agenda · ${format(selectedDate, "dd/MM/yyyy")}`),
    [isToday, selectedDate],
  );

  return (
    <FlashContext.Provider value={{ flashKey, targetId: flashTicketId }}>
    <div className={cn("rounded-xl", panelFlashing && "tv-flash")}>
    <BentoTile accent="cyan" grid>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-md flex items-center justify-center border border-[hsl(var(--tv-accent-cyan)/0.35)] bg-[hsl(var(--tv-accent-cyan)/0.08)]">
            <CalendarDays className="h-5 w-5 text-[hsl(var(--tv-accent-cyan))]" strokeWidth={1.75} />
          </div>
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--tv-text-dim))]">Agenda</div>
            <div className="text-lg font-semibold text-[hsl(var(--tv-text))]">{headerTitle}</div>
          </div>

        </div>

        <div className="flex items-center gap-2">
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 rounded-md border border-[hsl(var(--tv-border))] bg-[hsl(var(--tv-surface-2))] px-3 py-2 text-[13px] font-semibold uppercase tracking-wider text-[hsl(var(--tv-text))] hover:border-[hsl(var(--tv-border-strong))] transition">
                <CalendarDays className="h-4 w-4" />
                {format(selectedDate, "dd/MM/yyyy")}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                defaultMonth={selectedDate}
                onSelect={(d) => {
                  if (!d) return;
                  onFilterChange(computeAgendaRange(d));
                  setPickerOpen(false);
                }}
                fromDate={agendaMinDate()}
                toDate={new Date()}
                locale={ptBR}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          {!isToday && (
            <button
              className="rounded-md border border-[hsl(var(--tv-border))] bg-[hsl(var(--tv-surface-2))] px-3 py-2 text-[13px] font-semibold uppercase tracking-wider text-[hsl(var(--tv-text-dim))] hover:border-[hsl(var(--tv-border-strong))] transition"
              onClick={() => onFilterChange(computeAgendaRange("today"))}
            >
              Hoje
            </button>
          )}

          <span className="font-mono-tech text-[13px] text-[hsl(var(--tv-text-dim))] tracking-widest">
            {tickets.length.toString().padStart(3, "0")} EVT
          </span>
        </div>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center text-lg text-[hsl(var(--tv-text-dim))] py-8">

          Sem chamados no período selecionado
        </div>
      ) : (
        <SingleDayView tickets={tickets} />
      )}
    </BentoTile>
    </div>
    </FlashContext.Provider>
  );
}
