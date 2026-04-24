/**
 * Sprint planning — funções puras e testáveis
 * Usadas em: AddTicketsToSprintModal, SprintPlanningPanel, SprintImpactPanel
 */

export interface UrgencyTicket {
  id: string;
  priority: string;
  sla_deadline?: string | null;
  story_points?: number | null;
  assigned_to?: string | null;
  assignedName?: string | null;
}

export interface SprintLike {
  id: string;
  name: string;
  status: string;
  capacity_points: number;
  totalPoints: number;
}

const PRIORITY_WEIGHT: Record<string, number> = {
  Crítica: 4,
  Alta: 3,
  Média: 2,
  Baixa: 1,
};

export function urgencyScore(t: UrgencyTicket): number {
  const base = (PRIORITY_WEIGHT[t.priority] ?? 2) * 10;
  if (!t.sla_deadline) return base;
  const ms = new Date(t.sla_deadline).getTime() - Date.now();
  if (ms < 0) return base + 20;
  const hours = ms / (1000 * 60 * 60);
  if (hours < 2) return base + 15;
  if (hours < 24) return base + 8;
  if (hours < 72) return base + 3;
  return base;
}

export function slaBucket(t: UrgencyTicket): "overdue" | "soon" | "ok" | "none" {
  if (!t.sla_deadline) return "none";
  const ms = new Date(t.sla_deadline).getTime() - Date.now();
  if (ms < 0) return "overdue";
  if (ms < 24 * 60 * 60 * 1000) return "soon";
  return "ok";
}

export function sortByUrgency<T extends UrgencyTicket>(tickets: T[]): T[] {
  return [...tickets].sort((a, b) => urgencyScore(b) - urgencyScore(a));
}

// ---------------- Sugestão automática ----------------

export interface SuggestionConfig {
  maxCriticalPerSprint?: number;
  maxTicketsPerAssignee?: number;
  technicianCapacity?: Record<string, number>; // user_id → pts/sprint disponíveis
  enforceTechnicianCapacity?: boolean;
}

export interface SuggestionResult {
  selectedIds: string[];
  reasonByTicket: Record<string, string>;
  totalPoints: number;
  rejected: { id: string; reason: string }[];
}

export function suggestForSprint(
  tickets: UrgencyTicket[],
  sprint: SprintLike,
  config: SuggestionConfig = {}
): SuggestionResult {
  const remaining =
    sprint.capacity_points > 0
      ? Math.max(0, sprint.capacity_points - sprint.totalPoints)
      : Infinity;

  const ordered = sortByUrgency(tickets);
  const selected: string[] = [];
  const reason: Record<string, string> = {};
  const rejected: { id: string; reason: string }[] = [];

  let used = 0;
  let critCount = 0;
  const perAssignee: Record<string, number> = {};
  const perAssigneePts: Record<string, number> = { ...(config.technicianCapacity ? {} : {}) };

  for (const t of ordered) {
    const pts = t.story_points || 1;

    if (used + pts > remaining) {
      rejected.push({ id: t.id, reason: "Excede capacidade da sprint" });
      continue;
    }
    if (
      t.priority === "Crítica" &&
      config.maxCriticalPerSprint != null &&
      critCount >= config.maxCriticalPerSprint
    ) {
      rejected.push({ id: t.id, reason: "Limite de críticos atingido" });
      continue;
    }

    if (t.assigned_to) {
      const cnt = perAssignee[t.assigned_to] || 0;
      if (config.maxTicketsPerAssignee != null && cnt >= config.maxTicketsPerAssignee) {
        rejected.push({ id: t.id, reason: `Técnico ${t.assignedName || ""} já tem muitos chamados` });
        continue;
      }

      // capacidade por técnico em pontos
      if (config.enforceTechnicianCapacity && config.technicianCapacity) {
        const cap = config.technicianCapacity[t.assigned_to];
        if (cap != null) {
          const usedPts = perAssigneePts[t.assigned_to] || 0;
          if (usedPts + pts > cap) {
            rejected.push({ id: t.id, reason: `Capacidade do técnico ${t.assignedName || ""} excedida` });
            continue;
          }
          perAssigneePts[t.assigned_to] = usedPts + pts;
        }
      }
    }

    selected.push(t.id);
    reason[t.id] = sugestaoMotivo(t);
    used += pts;
    if (t.priority === "Crítica") critCount++;
    if (t.assigned_to) perAssignee[t.assigned_to] = (perAssignee[t.assigned_to] || 0) + 1;
  }

  return { selectedIds: selected, reasonByTicket: reason, totalPoints: used, rejected };
}

function sugestaoMotivo(t: UrgencyTicket): string {
  const bucket = slaBucket(t);
  if (bucket === "overdue") return "SLA vencido";
  if (bucket === "soon") return "SLA próximo";
  if (t.priority === "Crítica") return "Prioridade crítica";
  if (t.priority === "Alta") return "Prioridade alta";
  return "Encaixe na capacidade";
}

// ---------------- Simulação de impacto ----------------

export interface ImpactInput {
  sprint: SprintLike;
  selectedTickets: UrgencyTicket[]; // tickets a adicionar
  pointsByTicket: Record<string, number>;
  technicianLoadCurrent?: Record<string, number>; // pts atuais por técnico na sprint
  technicianCapacity?: Record<string, number>;
}

export interface AssigneeImpact {
  userId: string | null;
  name: string;
  current: number;
  added: number;
  capacity: number | null;
  status: "ok" | "warn" | "over";
}

export interface ImpactResult {
  selectedCount: number;
  selectedPoints: number;
  totalAfter: number;
  capacity: number;
  exceedsBy: number;
  byPriority: Record<string, number>;
  byAssignee: AssigneeImpact[];
}

export function simulateImpact(input: ImpactInput): ImpactResult {
  const points = input.selectedTickets.reduce(
    (s, t) => s + (input.pointsByTicket[t.id] ?? t.story_points ?? 1),
    0
  );
  const totalAfter = input.sprint.totalPoints + points;
  const capacity = input.sprint.capacity_points || 0;
  const exceedsBy = capacity > 0 ? Math.max(0, totalAfter - capacity) : 0;

  const byPriority: Record<string, number> = {};
  for (const t of input.selectedTickets) {
    byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
  }

  const addedByAssignee: Record<string, { name: string; pts: number }> = {};
  for (const t of input.selectedTickets) {
    const k = t.assigned_to || "none";
    const name = t.assignedName || (t.assigned_to ? "(sem nome)" : "Sem atribuição");
    if (!addedByAssignee[k]) addedByAssignee[k] = { name, pts: 0 };
    addedByAssignee[k].pts += input.pointsByTicket[t.id] ?? t.story_points ?? 1;
  }

  const byAssignee: AssigneeImpact[] = Object.entries(addedByAssignee).map(([k, v]) => {
    const userId = k === "none" ? null : k;
    const current = (userId && input.technicianLoadCurrent?.[userId]) || 0;
    const cap = userId ? input.technicianCapacity?.[userId] ?? null : null;
    const total = current + v.pts;
    let status: "ok" | "warn" | "over" = "ok";
    if (cap != null && cap > 0) {
      const ratio = total / cap;
      if (ratio > 1) status = "over";
      else if (ratio >= 0.8) status = "warn";
    }
    return { userId, name: v.name, current, added: v.pts, capacity: cap, status };
  });

  return {
    selectedCount: input.selectedTickets.length,
    selectedPoints: points,
    totalAfter,
    capacity,
    exceedsBy,
    byPriority,
    byAssignee,
  };
}

// ---------------- Seleção do destino padrão ----------------

export function pickDefaultSprint<T extends { id: string; status: string; created_at?: string }>(
  sprints: T[]
): T | null {
  const ativa = sprints.find((s) => s.status === "ativa");
  if (ativa) return ativa;
  const planejadas = sprints
    .filter((s) => s.status === "planejada")
    .sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
  return planejadas[0] || null;
}
