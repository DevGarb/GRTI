const BUSINESS_START = 8; // 08:00
const BUSINESS_END = 18;  // 18:00
export const BUSINESS_HOURS_PER_DAY = BUSINESS_END - BUSINESS_START; // 10h
const BUSINESS_MINUTES_PER_DAY = BUSINESS_HOURS_PER_DAY * 60; // 600

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

/**
 * Calculates minutes between two dates considering only business hours (08:00-18:00, Mon-Fri).
 */
export function calcBusinessMinutes(start: Date, end: Date): number {
  if (end <= start) return 0;

  let totalMinutes = 0;
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);

  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);

  while (current <= endDay) {
    if (isWeekday(current)) {
      const dayStart = new Date(current);
      dayStart.setHours(BUSINESS_START, 0, 0, 0);

      const dayEnd = new Date(current);
      dayEnd.setHours(BUSINESS_END, 0, 0, 0);

      const overlapStart = start > dayStart ? start : dayStart;
      const overlapEnd = end < dayEnd ? end : dayEnd;

      if (overlapStart < overlapEnd) {
        totalMinutes += (overlapEnd.getTime() - overlapStart.getTime()) / 60000;
      }
    }
    current.setDate(current.getDate() + 1);
  }

  return totalMinutes;
}

/**
 * Formats business minutes into a human-readable string.
 * Uses BUSINESS_HOURS_PER_DAY (10h) as one business day.
 */
export function formatBusinessTime(minutes: number): string {
  if (minutes <= 0) return "0min";
  if (minutes < 60) return `${Math.round(minutes)}min`;
  const totalHours = minutes / 60;
  if (totalHours < BUSINESS_HOURS_PER_DAY) {
    const h = Math.floor(totalHours);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h${m.toString().padStart(2, "0")}m` : `${h}h`;
  }
  const days = Math.floor(totalHours / BUSINESS_HOURS_PER_DAY);
  const remH = Math.round(totalHours % BUSINESS_HOURS_PER_DAY);
  return remH > 0 ? `${days}d ${remH}h` : `${days}d`;
}

// Priority-based SLA thresholds in business hours
export const SLA_THRESHOLDS: Record<string, { warn: number; crit: number }> = {
  Urgente: { warn: 4,  crit: 8  },
  Alta:    { warn: 8,  crit: 16 },
  Média:   { warn: 16, crit: 32 },
  Baixa:   { warn: 32, crit: 80 },
};

export function getSlaStatus(elapsedMinutes: number, priority: string): "ok" | "warn" | "crit" {
  const t = SLA_THRESHOLDS[priority] ?? SLA_THRESHOLDS["Média"];
  if (elapsedMinutes >= t.crit * 60) return "crit";
  if (elapsedMinutes >= t.warn * 60) return "warn";
  return "ok";
}
