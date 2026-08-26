// Timezone helpers for the tv-dashboard edge function.
// Deno edge functions can't import from src/, so this mirrors src/lib/orgTimezone.ts.
// Perf: Intl.DateTimeFormat instances are expensive to build — cache one per
// timezone/format and memoize the UTC offset per (tz, day).
export const ORG_TZ = "America/Sao_Paulo";

const partsFmtCache = new Map<string, Intl.DateTimeFormat>();
const offsetFmtCache = new Map<string, Intl.DateTimeFormat>();
const weekdayFmtCache = new Map<string, Intl.DateTimeFormat>();
const offsetCache = new Map<string, number>();

function partsFmt(tz: string) {
  let f = partsFmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    });
    partsFmtCache.set(tz, f);
  }
  return f;
}

function partsInTz(tz: string, instant: Date) {
  const parts = partsFmt(tz).formatToParts(instant);
  let y = 0, m = 0, d = 0, hh = 0, mm = 0, ss = 0;
  for (const p of parts) {
    switch (p.type) {
      case "year": y = Number(p.value); break;
      case "month": m = Number(p.value); break;
      case "day": d = Number(p.value); break;
      case "hour": hh = Number(p.value) % 24; break;
      case "minute": mm = Number(p.value); break;
      case "second": ss = Number(p.value); break;
    }
  }
  return { y, m, d, hh, mm, ss };
}

function tzOffsetMinutes(tz: string, instant: Date): number {
  // Offsets only change at DST boundaries; caching per UTC day is safe enough
  // for business-hour math and removes the bulk of the Intl cost.
  const dayKey = `${tz}|${Math.floor(instant.getTime() / 86_400_000)}`;
  const cached = offsetCache.get(dayKey);
  if (cached !== undefined) return cached;

  let f = offsetFmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" });
    offsetFmtCache.set(tz, f);
  }
  const s = f.formatToParts(instant).find((p) => p.type === "timeZoneName")?.value ?? "GMT-3";
  const m = s.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
  let out = -180;
  if (m) {
    const sign = m[1].startsWith("-") ? -1 : 1;
    const h = Math.abs(Number(m[1]));
    const mm = m[2] ? Number(m[2]) : 0;
    out = sign * (h * 60 + mm);
  }
  offsetCache.set(dayKey, out);
  return out;
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

/** Número do dia civil (dias desde 1970-01-01) para componentes Y-M-D. */
export function civilDayNumber(y: number, m: number, d: number): number {
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Dia da semana (0=Dom..6=Sáb) a partir do número do dia civil. */
export function weekdayOfDayNumber(dayNumber: number): number {
  // 1970-01-01 foi uma quinta-feira (4).
  return ((dayNumber % 7) + 7 + 4) % 7;
}

/** Dia da semana (0=Dom..6=Sáb) do instante no fuso `tz`. */
export function weekdayInTz(instant: Date, tz: string = ORG_TZ): number {
  let f = weekdayFmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" });
    weekdayFmtCache.set(tz, f);
  }
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[f.format(instant)] ?? 0;
}
