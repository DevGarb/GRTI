// Lógica de status operacional semafórico — compartilhada entre frontend e edge functions.

export type OpStatus = "normal" | "attention" | "critical";

export interface OpStatusInput {
  backlogTotal: number;
  awaitingApproval: number;
  reworkPercent: number;
  avgCsat: number;
  csatCount: number;
  /** Média móvel de backlog dos últimos 7 dias (opcional). */
  backlogAvg7d?: number;
}

export function computeOpStatus(input: OpStatusInput): OpStatus {
  const { backlogTotal, awaitingApproval, reworkPercent, avgCsat, csatCount, backlogAvg7d } = input;

  const awaitPct = backlogTotal > 0 ? (awaitingApproval / backlogTotal) * 100 : 0;
  const backlogGrowth = backlogAvg7d && backlogAvg7d > 0
    ? ((backlogTotal - backlogAvg7d) / backlogAvg7d) * 100
    : 0;

  // CRÍTICO
  if (backlogGrowth > 30) return "critical";
  if (reworkPercent > 20) return "critical";
  if (csatCount >= 3 && avgCsat > 0 && avgCsat < 3) return "critical";
  if (awaitPct > 50 && awaitingApproval >= 10) return "critical";

  // ATENÇÃO
  if (backlogGrowth > 10) return "attention";
  if (awaitPct > 30 && awaitingApproval >= 5) return "attention";
  if (reworkPercent > 10) return "attention";

  return "normal";
}

export function opStatusLabel(status: OpStatus): string {
  return status === "normal" ? "Operação Normal" : status === "attention" ? "Atenção" : "Crítico";
}

export function opStatusEmoji(status: OpStatus): string {
  return status === "normal" ? "🟢" : status === "attention" ? "🟡" : "🔴";
}

export function technicianStatus(input: { reworkPct: number; avgCsat: number; csatCount: number; closed: number }): OpStatus | "excellent" {
  const { reworkPct, avgCsat, csatCount, closed } = input;
  if (reworkPct > 20 || (csatCount >= 2 && avgCsat > 0 && avgCsat < 3)) return "critical";
  if (reworkPct > 10) return "attention";
  if (closed >= 3 && csatCount >= 2 && avgCsat >= 4.5 && reworkPct < 5) return "excellent";
  return "normal";
}
