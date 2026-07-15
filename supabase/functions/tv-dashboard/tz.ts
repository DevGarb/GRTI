// Timezone helpers for the tv-dashboard edge function.
// Deno edge functions can't import from src/, so this mirrors src/lib/orgTimezone.ts.
export const ORG_TZ = "America/Sao_Paulo";

function partsInTz(tz: string, instant: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return {
    y: get("year"), m: get("month"), d: get("day"),
    hh: get("hour") % 24, mm: get("minute"), ss: get("second"),
  };
}

function tzOffsetMinutes(tz: string, instant: Date): number {
  const s = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, timeZoneName: "shortOffset",
  }).formatToParts(instant).find((p) => p.type === "timeZoneName")?.value ?? "GMT-3";
  const m = s.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
  if (!m) return -180;
  const sign = m[1].startsWith("-") ? -1 : 1;
  const h = Math.abs(Number(m[1]));
  const mm = m[2] ? Number(m[2]) : 0;
  return sign * (h * 60 + mm);
}

/** Wall-clock (Y-M-D H:M:S) interpretado no fuso `tz` -> Date UTC. */
export function localDateInTz(
  y: number, m: number, d: number,
  hh = 0, mm = 0, ss = 0, ms = 0,
  tz: string = ORG_TZ,
): Date {
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm, ss, ms));
  const offset = tzOffsetMinutes(tz, guess);
  return new Date(guess.getTime() - offset * 60_000);
}

export function startOfDayInTz(instant: Date, tz: string = ORG_TZ): Date {
  const { y, m, d } = partsInTz(tz, instant);
  return localDateInTz(y, m, d, 0, 0, 0, 0, tz);
}

export function startOfMonthInTz(instant: Date, tz: string = ORG_TZ): Date {
  const { y, m } = partsInTz(tz, instant);
  return localDateInTz(y, m, 1, 0, 0, 0, 0, tz);
}

export function addDaysInTz(instant: Date, days: number, tz: string = ORG_TZ): Date {
  const { y, m, d } = partsInTz(tz, instant);
  return localDateInTz(y, m, d + days, 0, 0, 0, 0, tz);
}

export function addMonthsInTz(instant: Date, months: number, tz: string = ORG_TZ): Date {
  const { y, m } = partsInTz(tz, instant);
  return localDateInTz(y, m + months, 1, 0, 0, 0, 0, tz);
}

/** Componentes do wall-clock no fuso `tz` para o instante dado. */
export function wallPartsInTz(instant: Date, tz: string = ORG_TZ) {
  return partsInTz(tz, instant);
}

/** Dia da semana (0=Dom..6=Sáb) do instante no fuso `tz`. */
export function weekdayInTz(instant: Date, tz: string = ORG_TZ): number {
  const s = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, weekday: "short",
  }).format(instant);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[s] ?? 0;
}
