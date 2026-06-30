// Helpers únicos de formatação de datas em pt-BR.
// Importante: strings "date-only" (YYYY-MM-DD) vindas do Postgres (`date`)
// são parseadas como UTC pelo `new Date()`. Em fusos negativos (BRT, UTC-3)
// isso renderiza como o dia anterior (bug "D-1"). Estes helpers tratam esse
// caso parseando date-only no fuso local.

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toLocalDate(value: string | Date | null | undefined): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "string") {
    const m = value.match(DATE_ONLY_RE);
    if (m) {
      const [, y, mo, d] = m;
      return new Date(Number(y), Number(mo) - 1, Number(d));
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function formatDateBR(value: string | Date | null | undefined, fallback = "—"): string {
  const d = toLocalDate(value);
  if (!d) return fallback;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatDateShortBR(value: string | Date | null | undefined, fallback = "—"): string {
  const d = toLocalDate(value);
  if (!d) return fallback;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

export function formatDateTimeBR(value: string | Date | null | undefined, fallback = "—"): string {
  const d = toLocalDate(value);
  if (!d) return fallback;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateTimeFullBR(value: string | Date | null | undefined, fallback = "—"): string {
  const d = toLocalDate(value);
  if (!d) return fallback;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function formatTimeBR(value: string | Date | null | undefined, fallback = "—"): string {
  const d = toLocalDate(value);
  if (!d) return fallback;
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
