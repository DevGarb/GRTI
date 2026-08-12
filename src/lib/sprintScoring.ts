/**
 * Regras de pontuação de chamados.
 *
 * Chamados normais recebem pontos pela avaliação de "meta" (tabela `evaluations`).
 * Chamados de crédito de sprint (type = "Projeto") não recebem avaliação — a pontuação
 * é o `story_points` somado dos backlogs da sprint encerrada. Essa é a mesma regra
 * usada nas RPCs `get_metas_tecnicos` e `get_mvp_chamados_metrics`.
 */

export const PROJECT_TICKET_TYPE = "Projeto";

export interface ScorableTicket {
  id: string;
  type?: string | null;
  story_points?: number | null;
  title?: string | null;
  ticket_number?: number | null;
}

/** Pontos vindos da sprint para um chamado (0 quando não for chamado de projeto). */
export function sprintPointsOf(ticket: ScorableTicket): number {
  if (ticket.type !== PROJECT_TICKET_TYPE) return 0;
  const pts = Number(ticket.story_points || 0);
  return Number.isFinite(pts) && pts > 0 ? pts : 0;
}

/**
 * Mapa de pontos por chamado: avaliação quando existir, senão os pontos da sprint.
 */
export function buildScoreMap(
  evalScores: Map<string, number>,
  tickets: ScorableTicket[]
): Map<string, number> {
  const map = new Map<string, number>(evalScores);
  for (const t of tickets) {
    if (!map.get(t.id)) {
      const pts = sprintPointsOf(t);
      if (pts > 0) map.set(t.id, pts);
    }
  }
  return map;
}

export interface SprintBreakdownEntry {
  id: string;
  label: string;
  points: number;
}

export interface ScoreBreakdown {
  /** Pontos vindos de avaliações de chamados normais. */
  evaluationPoints: number;
  /** Pontos vindos de sprints encerradas. */
  sprintPoints: number;
  /** Total exibido no card e refletido nas metas/MVP. */
  total: number;
  /** Quebra por sprint (S1, S2, ...). */
  sprints: SprintBreakdownEntry[];
}

/**
 * Pontuação do técnico no período: avaliações + pontos das sprints encerradas,
 * com a quebra por sprint para detalhamento no card.
 */
export function computeScoreBreakdown(
  evaluationPoints: number,
  closedTickets: ScorableTicket[]
): ScoreBreakdown {
  const sprints: SprintBreakdownEntry[] = [];
  for (const t of closedTickets) {
    const points = sprintPointsOf(t);
    if (points > 0) {
      sprints.push({ id: t.id, label: (t.title || "Sprint").trim(), points });
    }
  }
  sprints.sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { numeric: true }));
  const sprintPoints = sprints.reduce((s, e) => s + e.points, 0);
  const evalPts = Number(evaluationPoints || 0);
  return {
    evaluationPoints: evalPts,
    sprintPoints,
    total: evalPts + sprintPoints,
    sprints,
  };
}
