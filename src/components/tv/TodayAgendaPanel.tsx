import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { CalendarDays, Sunrise, Sunset, ChevronDown } from "lucide-react";
import { BentoTile } from "./BentoTile";
import { TodayTicket } from "./TodayTimelinePanel";
import { useTicketModal } from "@/contexts/TicketModalContext";

interface FlashCtx { flashKey: number; targetId: string | null }
const FlashContext = createContext<FlashCtx>({ flashKey: 0, targetId: null });
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";

export type AgendaFilterType = "today" | "yesterday" | "last_month" | "custom";
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

export function computeAgendaRange(type: AgendaFilterType, custom?: DateRange): AgendaFilter {
  const now = new Date();
  if (type === "today") {
    const s = ymd(now);
    return { type, from: s, to: s };
  }
  if (type === "yesterday") {
    const y = new Date(now); y.setDate(y.getDate() - 1);
    const s = ymd(y);
    return { type, from: s, to: s };
  }
  if (type === "last_month") {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return { type, from: ymd(first), to: ymd(last) };
  }
  // custom
  const from = custom?.from ?? now;
  const to = custom?.to ?? from;
  return { type: "custom", from: ymd(from), to: ymd(to) };
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

function MultiDayView({ tickets }: { tickets: (TodayTicket & { date?: string })[] }) {
  const byDay = new Map<string, (TodayTicket & { date?: string })[]>();
  for (const t of tickets) {
    const k = t.date ?? "sem-data";
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(t);
  }
  const days = Array.from(byDay.keys()).sort();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[520px] overflow-y-auto pr-1">
      {days.map(day => {
        const list = byDay.get(day)!;
        const dateObj = new Date(day + "T12:00:00");
        const label = format(dateObj, "EEE, dd/MM", { locale: ptBR });
        return (
          <div key={day} className="rounded-lg border border-[hsl(var(--tv-border))] bg-[hsl(var(--tv-surface-2))]/40 p-3">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-[hsl(var(--tv-border))]">
              <span className="text-[11px] uppercase tracking-widest text-[hsl(var(--tv-text-dim))] font-medium">
                {label}
              </span>
              <span className="font-mono-tech text-[10px] text-[hsl(var(--tv-text-mute))]">
                {list.length.toString().padStart(2, "0")}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {list.map(t => <TicketChip key={t.id} t={t} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const FILTER_LABELS: Record<AgendaFilterType, string> = {
  today: "Hoje",
  yesterday: "Ontem",
  last_month: "Mês passado",
  custom: "Personalizado",
};

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

  const [customOpen, setCustomOpen] = useState(false);
  const [customRange, setCustomRange] = useState<DateRange | undefined>(() => {
    if (filter.type === "custom") {
      return {
        from: new Date(filter.from + "T12:00:00"),
        to: new Date(filter.to + "T12:00:00"),
      };
    }
    return undefined;
  });

  const isSingleDay = filter.from === filter.to;

  const headerTitle = useMemo(() => {
    if (filter.type === "today") return "Agenda de Hoje";
    if (filter.type === "yesterday") return "Agenda de Ontem";
    if (filter.type === "last_month") return "Agenda · Mês Passado";
    if (isSingleDay) {
      return `Agenda · ${format(new Date(filter.from + "T12:00:00"), "dd/MM/yyyy")}`;
    }
    return `Agenda · ${format(new Date(filter.from + "T12:00:00"), "dd/MM")} → ${format(new Date(filter.to + "T12:00:00"), "dd/MM")}`;
  }, [filter, isSingleDay]);

  function handleSelect(type: AgendaFilterType) {
    if (type === "custom") {
      setCustomOpen(true);
      return;
    }
    onFilterChange(computeAgendaRange(type));
  }

  function applyCustom() {
    if (customRange?.from) {
      onFilterChange(computeAgendaRange("custom", customRange));
      setCustomOpen(false);
    }
  }

  return (
    <FlashContext.Provider value={{ flashKey, targetId: flashTicketId }}>
    <div className={cn("rounded-xl", panelFlashing && "tv-flash")}>
    <BentoTile accent="cyan" grid>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md flex items-center justify-center border border-[hsl(var(--tv-accent-cyan)/0.35)] bg-[hsl(var(--tv-accent-cyan)/0.08)]">
            <CalendarDays className="h-3.5 w-3.5 text-[hsl(var(--tv-accent-cyan))]" strokeWidth={1.75} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--tv-text-dim))]">Agenda</div>
            <div className="text-sm text-[hsl(var(--tv-text))]">{headerTitle}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-1.5 rounded-md border border-[hsl(var(--tv-border))] bg-[hsl(var(--tv-surface-2))] px-2.5 py-1.5 text-[11px] uppercase tracking-wider text-[hsl(var(--tv-text))] hover:border-[hsl(var(--tv-border-strong))] transition"
              >
                {FILTER_LABELS[filter.type]}
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]">
              {(["today", "yesterday", "last_month", "custom"] as AgendaFilterType[]).map(k => (
                <DropdownMenuItem key={k} onClick={() => handleSelect(k)}>
                  {FILTER_LABELS[k]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover open={customOpen} onOpenChange={setCustomOpen}>
            <PopoverTrigger asChild>
              <button className="sr-only" aria-hidden />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={customRange}
                onSelect={setCustomRange}
                numberOfMonths={2}
                locale={ptBR}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
              <div className="flex justify-end gap-2 p-3 border-t">
                <button
                  className="text-xs px-3 py-1.5 rounded-md border hover:bg-muted"
                  onClick={() => setCustomOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
                  disabled={!customRange?.from}
                  onClick={applyCustom}
                >
                  Aplicar
                </button>
              </div>
            </PopoverContent>
          </Popover>

          <span className="font-mono-tech text-[10px] text-[hsl(var(--tv-text-mute))] tracking-widest">
            {tickets.length.toString().padStart(3, "0")} EVT
          </span>
        </div>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center text-sm text-[hsl(var(--tv-text-mute))] py-8">
          Sem chamados no período selecionado
        </div>
      ) : isSingleDay ? (
        <SingleDayView tickets={tickets} />
      ) : (
        <MultiDayView tickets={tickets} />
      )}
    </BentoTile>
    </div>
    </FlashContext.Provider>
  );
}
