import { describe, it, expect } from "vitest";
import {
  sprintPointsOf,
  buildScoreMap,
  computeScoreBreakdown,
  type ScorableTicket,
} from "@/lib/sprintScoring";

const sprintTicket = (id: string, title: string, pts: number): ScorableTicket => ({
  id,
  title,
  type: "Projeto",
  story_points: pts,
});

const normalTicket = (id: string): ScorableTicket => ({ id, title: "Chamado normal", type: "Chamado" });

describe("sprintPointsOf", () => {
  it("retorna os story_points de chamados do tipo Projeto", () => {
    expect(sprintPointsOf(sprintTicket("a", "S1 - Planejamento", 3))).toBe(3);
  });

  it("ignora chamados que não são de projeto", () => {
    expect(sprintPointsOf({ ...normalTicket("b"), story_points: 5 })).toBe(0);
  });

  it("trata pontos nulos, zero ou inválidos como 0", () => {
    expect(sprintPointsOf({ id: "c", type: "Projeto", story_points: null })).toBe(0);
    expect(sprintPointsOf({ id: "d", type: "Projeto", story_points: 0 })).toBe(0);
    expect(sprintPointsOf({ id: "e", type: "Projeto", story_points: -2 })).toBe(0);
  });
});

describe("buildScoreMap (coluna Pts)", () => {
  const tickets = [
    sprintTicket("s1", "S1 - Planejamento", 3),
    sprintTicket("s2", "S2 - Execução", 4),
    sprintTicket("s3", "S3 - Desenvolvimento", 9),
    normalTicket("n1"),
    normalTicket("n2"),
  ];

  it("exibe os pontos da sprint quando não há avaliação", () => {
    const map = buildScoreMap(new Map(), tickets);
    expect(map.get("s1")).toBe(3);
    expect(map.get("s2")).toBe(4);
    expect(map.get("s3")).toBe(9);
  });

  it("mantém a avaliação quando ela existe", () => {
    const map = buildScoreMap(new Map([["n1", 5]]), tickets);
    expect(map.get("n1")).toBe(5);
  });

  it("dá prioridade à avaliação sobre os pontos da sprint", () => {
    const map = buildScoreMap(new Map([["s1", 10]]), tickets);
    expect(map.get("s1")).toBe(10);
  });

  it("não inventa pontos para chamados normais sem avaliação", () => {
    const map = buildScoreMap(new Map(), tickets);
    expect(map.get("n2")).toBeUndefined();
  });

  it("não muta o mapa de avaliações recebido", () => {
    const evals = new Map<string, number>();
    buildScoreMap(evals, tickets);
    expect(evals.size).toBe(0);
  });
});

describe("computeScoreBreakdown (card de pontuação / metas / MVP)", () => {
  const closed = [
    normalTicket("n1"),
    sprintTicket("s3", "S3 - Desenvolvimento", 9),
    sprintTicket("s1", "S1 - Planejamento", 3),
    sprintTicket("s2", "S2 - Execução", 4),
  ];

  it("soma avaliações e pontos de sprint no total", () => {
    const r = computeScoreBreakdown(20, closed);
    expect(r.evaluationPoints).toBe(20);
    expect(r.sprintPoints).toBe(16);
    expect(r.total).toBe(36);
  });

  it("detalha a quebra por sprint em ordem natural", () => {
    const r = computeScoreBreakdown(0, closed);
    expect(r.sprints.map((s) => s.label)).toEqual([
      "S1 - Planejamento",
      "S2 - Execução",
      "S3 - Desenvolvimento",
    ]);
    expect(r.sprints.map((s) => s.points)).toEqual([3, 4, 9]);
  });

  it("recalcula o total quando novas sprints são encerradas no período", () => {
    const antes = computeScoreBreakdown(10, [normalTicket("n1")]);
    expect(antes.total).toBe(10);
    expect(antes.sprints).toHaveLength(0);

    const depois = computeScoreBreakdown(10, [normalTicket("n1"), sprintTicket("s4", "S4 - Qualidade", 8)]);
    expect(depois.total).toBe(18);
    expect(depois.sprints).toHaveLength(1);
  });

  it("período sem chamados fechados resulta em zero", () => {
    const r = computeScoreBreakdown(0, []);
    expect(r.total).toBe(0);
    expect(r.sprintPoints).toBe(0);
  });

  it("o total do card bate com a soma da coluna Pts dos mesmos chamados", () => {
    const evals = new Map<string, number>([["n1", 20]]);
    const map = buildScoreMap(evals, closed);
    const somaColuna = closed.reduce((s, t) => s + (map.get(t.id) || 0), 0);
    expect(computeScoreBreakdown(20, closed).total).toBe(somaColuna);
  });
});
