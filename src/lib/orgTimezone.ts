// Helpers para calcular intervalos (D-1, hoje, etc.) no fuso horário da organização.
// Retornam objetos Date em UTC, prontos para serem enviados ao banco via toISOString().

export const DEFAULT_TZ = "America/Sao_Paulo";

export const COMMON_TIMEZONES: { value: string; label: string }[] = [
  { value: "America/Sao_Paulo", label: "Brasília / São Paulo (UTC-3)" },
  { value: "America/Manaus", label: "Manaus (UTC-4)" },
  { value: "America/Cuiaba", label: "Cuiabá (UTC-4)" },
  { value: "America/Belem", label: "Belém (UTC-3)" },
  { value: "America/Fortaleza", label: "Fortaleza (UTC-3)" },
  { value: "America/Recife", label: "Recife (UTC-3)" },
  { value: "America/Bahia", label: "Salvador (UTC-3)" },
  { value: "America/Rio_Branco", label: "Rio Branco (UTC-5)" },
  { value: "America/Noronha", label: "Fernando de Noronha (UTC-2)" },
  { value: "UTC", label: "UTC" },
];

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Componentes year/month/day "agora" no fuso `tz`. */
function nowPartsInTz(tz: string, base: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(base);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

/** Offset em minutos do fuso `tz` para o instante `instant`. Ex: -180 para BRT. */
function tzOffsetMinutes(tz: string, instant: Date): number {
  const s = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "shortOffset",
  }).formatToParts(instant).find((p) => p.type === "timeZoneName")?.value ?? "GMT-3";
  const m = s.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
  if (!m) return -180;
  const sign = m[1].startsWith("-") ? -1 : 1;
  const h = Math.abs(Number(m[1]));
  const mm = m[2] ? Number(m[2]) : 0;
  return sign * (h * 60 + mm);
}

/**
 * Converte um wall-clock (Y-M-D H:M:S) interpretado no fuso `tz` para um Date UTC.
 * Ex.: localDateInTz(2026, 6, 1, 0, 0, 0, "America/Sao_Paulo") → 2026-06-01T03:00:00.000Z
 */
export function localDateInTz(
  y: number, m: number, d: number,
  hh = 0, mm = 0, ss = 0, ms = 0,
  tz: string = DEFAULT_TZ,
): Date {
  // 1ª aproximação: trata o wall-clock como UTC
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm, ss, ms));
  // Ajusta pelo offset real do fuso naquele instante
  const offset = tzOffsetMinutes(tz, guess);
  return new Date(guess.getTime() - offset * 60_000);
}

/** Início (00:00:00.000) do dia da data informada, considerando o fuso `tz`. */
export function startOfDayInTz(date: Date, tz: string = DEFAULT_TZ): Date {
  const { y, m, d } = nowPartsInTz(tz, date);
  return localDateInTz(y, m, d, 0, 0, 0, 0, tz);
}

/** Fim (23:59:59.999) do dia da data informada, considerando o fuso `tz`. */
export function endOfDayInTz(date: Date, tz: string = DEFAULT_TZ): Date {
  const { y, m, d } = nowPartsInTz(tz, date);
  return localDateInTz(y, m, d, 23, 59, 59, 999, tz);
}

/** Intervalo D-1: ontem 00:00:00 → 23:59:59.999 no fuso da organização. */
export function dMinusOneRangeInTz(tz: string = DEFAULT_TZ, base: Date = new Date()) {
  const { y, m, d } = nowPartsInTz(tz, base);
  // Subtrai 1 dia no calendário local
  const todayUtc = new Date(Date.UTC(y, m - 1, d));
  todayUtc.setUTCDate(todayUtc.getUTCDate() - 1);
  const yy = todayUtc.getUTCFullYear();
  const mm = todayUtc.getUTCMonth() + 1;
  const dd = todayUtc.getUTCDate();
  return {
    from: localDateInTz(yy, mm, dd, 0, 0, 0, 0, tz),
    to: localDateInTz(yy, mm, dd, 23, 59, 59, 999, tz),
  };
}

export type RangePreset = "yesterday" | "today" | "last7" | "thisMonth";

export function presetRangeInTz(preset: RangePreset, tz: string = DEFAULT_TZ) {
  const now = new Date();
  const { y, m, d } = nowPartsInTz(tz, now);
  switch (preset) {
    case "today":
      return {
        from: localDateInTz(y, m, d, 0, 0, 0, 0, tz),
        to: localDateInTz(y, m, d, 23, 59, 59, 999, tz),
      };
    case "yesterday":
      return dMinusOneRangeInTz(tz, now);
    case "last7": {
      const start = new Date(Date.UTC(y, m - 1, d));
      start.setUTCDate(start.getUTCDate() - 7);
      return {
        from: localDateInTz(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate(), 0, 0, 0, 0, tz),
        to: localDateInTz(y, m, d, 23, 59, 59, 999, tz),
      };
    }
    case "thisMonth":
      return {
        from: localDateInTz(y, m, 1, 0, 0, 0, 0, tz),
        to: localDateInTz(y, m, d, 23, 59, 59, 999, tz),
      };
  }
}

/** Formata um Date como "dd/MM HH:mm" no fuso `tz`. */
export function formatInTz(date: Date, tz: string = DEFAULT_TZ, opts: Intl.DateTimeFormatOptions = {
  day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
}): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: tz, ...opts }).format(date);
}
