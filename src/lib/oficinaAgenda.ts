export type SchedulePeriod = "manha" | "tarde" | "dia";

export const SCHEDULE_PERIODS: { id: SchedulePeriod; label: string; chip: string }[] = [
  { id: "manha", label: "Manhã", chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  { id: "tarde", label: "Tarde", chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  { id: "dia", label: "Dia inteiro", chip: "bg-slate-500/15 text-slate-700 dark:text-slate-300" },
];

export const periodInfo = (id?: string | null) =>
  SCHEDULE_PERIODS.find((p) => p.id === id) || SCHEDULE_PERIODS[2];

export type BookingStatus = "pendente" | "agendado" | "recusado";

export const BOOKING_STATUS_INFO: Record<BookingStatus, { label: string; chip: string }> = {
  pendente: { label: "Aguardando agendamento", chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  agendado: { label: "Agendado", chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  recusado: { label: "Recusado", chip: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
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
