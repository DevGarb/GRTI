export type SchedulePeriod = "manha" | "tarde" | "dia";

export const SCHEDULE_PERIODS: { id: SchedulePeriod; label: string; chip: string }[] = [
  { id: "manha", label: "Manhã", chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  { id: "tarde", label: "Tarde", chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  { id: "dia", label: "Dia inteiro", chip: "bg-slate-500/15 text-slate-700 dark:text-slate-300" },
];

export const periodInfo = (id?: string | null) =>
  SCHEDULE_PERIODS.find((p) => p.id === id) || SCHEDULE_PERIODS[2];

export type BookingStatus = "pendente" | "agendado" | "recusado" | "concluido" | "nao_compareceu";

/** Períodos que ocupam vaga na agenda (1 manhã + 1 tarde por dia). */
export const BOOKING_PERIODS = SCHEDULE_PERIODS.filter((p) => p.id !== "dia");

/** Status que não ocupam mais vaga: já viraram OS, foram recusados ou o cliente não compareceu. */
export const RELEASED_BOOKING_STATUSES = ["recusado", "concluido", "nao_compareceu"];

export interface SlotBooking {
  id?: string;
  status?: string | null;
  service_order_id?: string | null;
  scheduled_date?: string | null;
  preferred_date?: string | null;
  scheduled_period?: string | null;
  preferred_period?: string | null;
}

/** Períodos já ocupados numa data. Serviços em execução (OS aberta) não contam. */
export const takenPeriods = (bookings: SlotBooking[], date: string, ignoreId?: string) => {
  const taken = new Set<string>();
  bookings.forEach((b) => {
    if (ignoreId && b.id === ignoreId) return;
    if (b.service_order_id) return;
    if (RELEASED_BOOKING_STATUSES.includes(String(b.status))) return;
    const d = b.scheduled_date || b.preferred_date;
    if (d !== date) return;
    const p = b.scheduled_period || b.preferred_period;
    if (p) taken.add(p);
  });
  return taken;
};

export const BOOKING_STATUS_INFO: Record<BookingStatus, { label: string; chip: string }> = {
  pendente: { label: "Aguardando agendamento", chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  agendado: { label: "Agendado", chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  recusado: { label: "Recusado", chip: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
  concluido: { label: "OS aberta", chip: "bg-teal-500/15 text-teal-700 dark:text-teal-300" },
  nao_compareceu: { label: "Cliente não compareceu", chip: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
};

export const SERVICE_TYPES = [
  "Manutenção preventiva",
  "Manutenção corretiva",
  "Revisão",
  "Sinistro / Colisão",
  "Elétrica",
  "Outros",
];

export const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const shiftDay = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const formatDateBRShort = (iso?: string | null) => {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

export const weekdayLabel = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long" });
