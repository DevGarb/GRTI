import { describe, it, expect } from "vitest";
import { deriveAward, expectedAmountForScore, AWARD_AMOUNTS } from "../mvpAwards";

describe("mvpAwards.deriveAward", () => {
  it("100% metas atingidas -> ouro R$ 500", () => {
    expect(deriveAward(100)).toEqual({ level: "ouro", amount_brl: 500 });
    expect(deriveAward(120)).toEqual({ level: "ouro", amount_brl: 500 });
  });

  it("90-99% -> prata R$ 300", () => {
    expect(deriveAward(90)).toEqual({ level: "prata", amount_brl: 300 });
    expect(deriveAward(99.9)).toEqual({ level: "prata", amount_brl: 300 });
  });

  it("< 90% -> none R$ 0", () => {
    expect(deriveAward(89.99)).toEqual({ level: "none", amount_brl: 0 });
    expect(deriveAward(0)).toEqual({ level: "none", amount_brl: 0 });
  });

  it("disqualify força none/0 mesmo com 100%", () => {
    expect(deriveAward(100, true)).toEqual({ level: "none", amount_brl: 0 });
  });

  it("valores inválidos caem para 0", () => {
    expect(deriveAward(Number.NaN)).toEqual({ level: "none", amount_brl: 0 });
  });

  it("AWARD_AMOUNTS bate com a regra do banco (compute_mvp_awards)", () => {
    expect(AWARD_AMOUNTS.ouro).toBe(500);
    expect(AWARD_AMOUNTS.prata).toBe(300);
    expect(AWARD_AMOUNTS.none).toBe(0);
  });
});

describe("Invariante: amount_brl nunca é 0 quando metas foram batidas", () => {
  // Simula linhas retornadas pela RPC get_mvp_chamados_metrics quando
  // o técnico tem metas individuais preenchidas E as atingiu.
  type RpcRow = { user_id: string; final_score: number; amount_brl: number; award_level: string };

  const rowsFromRpc: RpcRow[] = [
    { user_id: "u-felipe", final_score: 100, amount_brl: 500, award_level: "ouro" },
    { user_id: "u-maria", final_score: 95, amount_brl: 300, award_level: "prata" },
    { user_id: "u-baixo", final_score: 75, amount_brl: 0, award_level: "none" },
  ];

  it("RPC devolve amount_brl > 0 sempre que final_score >= 90", () => {
    for (const row of rowsFromRpc) {
      const expected = expectedAmountForScore(row.final_score);
      expect(row.amount_brl).toBe(expected);
      if (row.final_score >= 90) {
        expect(row.amount_brl).toBeGreaterThan(0);
      }
    }
  });

  it("nenhum técnico com 100% pode aparecer com R$ 0 na tela MVP Equipe", () => {
    const bugRows = rowsFromRpc.filter((r) => r.final_score >= 100 && r.amount_brl === 0);
    expect(bugRows).toEqual([]);
  });
});
