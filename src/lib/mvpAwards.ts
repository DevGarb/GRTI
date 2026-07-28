// Regra de premiação MVP (Chamados e Projetos):
//   final_score >= 100  -> ouro,   R$ 500
//   final_score >=  90  -> prata,  R$ 300
//   caso contrário      -> none,   R$   0
// `disqualify=true` (penalidade aprovada) força none/0 independente do score.
//
// Compartilhado entre frontend e os testes de integração para garantir
// que a lógica exibida seja idêntica à do banco (compute_mvp_awards).

export type AwardLevel = "ouro" | "prata" | "none";

export interface DerivedAward {
  level: AwardLevel;
  amount_brl: number;
}

export const AWARD_AMOUNTS = { ouro: 500, prata: 300, none: 0 } as const;

export function deriveAward(finalScore: number, disqualify = false): DerivedAward {
  if (disqualify) return { level: "none", amount_brl: 0 };
  const score = Number.isFinite(finalScore) ? finalScore : 0;
  if (score >= 100) return { level: "ouro", amount_brl: AWARD_AMOUNTS.ouro };
  if (score >= 90) return { level: "prata", amount_brl: AWARD_AMOUNTS.prata };
  return { level: "none", amount_brl: 0 };
}

/**
 * Invariante crítico do MVP: quando um técnico tem metas individuais
 * definidas E bate 100% delas, a premiação NUNCA pode ser R$ 0.
 * Usado nos testes de integração da RPC `get_mvp_chamados_metrics`.
 */
export function expectedAmountForScore(finalScore: number): number {
  return deriveAward(finalScore).amount_brl;
}
