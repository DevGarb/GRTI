const BUSINESS_START = 8; // 08:00
const BUSINESS_END = 18;  // 18:00
const BUSINESS_MINUTES_PER_DAY = (BUSINESS_END - BUSINESS_START) * 60; // 600

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
