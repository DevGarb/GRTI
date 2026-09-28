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

type DueInput = { sla_started_at?: string | null; material_received_at?: string | null; postponed_until?: string | null; awaiting_material?: boolean; awaiting_sector_release?: boolean | null; sector_released_at?: string | null };

export function maintenanceDueAt(order: DueInput) {
  if (!order.material_received_at || order.awaiting_sector_release) return null;
  const received = new Date(order.material_received_at).getTime();
  const released = order.sector_released_at ? new Date(order.sector_released_at).getTime() : 0;
  const base = Math.max(received, released) + 24 * 60 * 60 * 1000;
  const postponed = order.postponed_until ? new Date(order.postponed_until).getTime() : 0;
  return new Date(Math.max(base, postponed));
}

export function maintenanceIsOverdue(order: DueInput & { status: string; deadline?: string | null }, now = new Date()) {
  if (["Concluída", "Cancelada"].includes(order.status) || !order.material_received_at || order.awaiting_sector_release) return false;
  const due = maintenanceDueAt(order);
  return due ? now.getTime() > due.getTime() : Boolean(order.deadline && order.deadline < now.toISOString().slice(0, 10));
}

export function formatMaintenanceDue(due: Date | null) {
  return due?.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) || "";
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