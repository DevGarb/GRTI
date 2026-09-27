export type MaintenanceMaterial = { name: string; quantity: string; purchased: boolean };

export function readMaterials(value: unknown): MaintenanceMaterial[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is MaintenanceMaterial =>
    item !== null && typeof item === "object" && typeof item.name === "string"
  ).map(item => ({ name: item.name, quantity: String(item.quantity ?? "1"), purchased: Boolean(item.purchased) }));
}

export function pendingMaterials(value: unknown) {
  return readMaterials(value).filter(item => item.name.trim() && !item.purchased).length;
}

export function weekStart(date = new Date()) {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  day.setDate(day.getDate() - (day.getDay() + 6) % 7);
  return day;
}

export function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function weekDates(start: Date) {
  return Array.from({ length: 7 }, (_, offset) => {
    const day = new Date(start);
    day.setDate(start.getDate() + offset);
    return dateKey(day);
  });
}

export const TECH_TONES = [
  "maintenance-tech-a", "maintenance-tech-b", "maintenance-tech-c",
  "maintenance-tech-d", "maintenance-tech-e", "maintenance-tech-f",
];