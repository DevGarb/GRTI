import { describe, it, expect } from "vitest";
import {
  calcAward,
  requestedPoints,
  approvedPoints,
  maxChecklistPoints,
  maxOsPoints,
  normalizeLabel,
  isDuplicateLabel,
  tierProgress,
  type AwardTier,
} from "../oficinaScoring";

const TIERS: AwardTier[] = [
  { id: "1", from_points: 1, to_points: 50, rate_brl: 10, position: 1, active: true },
  { id: "2", from_points: 51, to_points: 99, rate_brl: 15, position: 2, active: true },
  { id: "3", from_points: 100, to_points: null, rate_brl: 20, position: 3, active: true },
];

describe("calcAward (premiação progressiva)", () => {
  it("70 pontos -> 50×10 + 20×15 = R$ 800", () => {
    const r = calcAward(70, TIERS);
    expect(r.total).toBe(800);
    expect(r.breakdown.map((b) => b.points)).toEqual([50, 20]);
  });

  it("120 pontos -> 50×10 + 49×15 + 21×20 = R$ 1.655", () => {
    const r = calcAward(120, TIERS);
    expect(r.total).toBe(1655);
    expect(r.breakdown.map((b) => b.amount)).toEqual([500, 735, 420]);
  });

  it("30 pontos -> R$ 300 (só primeira faixa)", () => {
    expect(calcAward(30, TIERS).total).toBe(300);
  });

  it("pontos fracionados funcionam (87,5 pts)", () => {
    // 50×10 + 37,5×15 = 500 + 562,50 = 1062,50
    expect(calcAward(87.5, TIERS).total).toBe(1062.5);
  });

  it("0 pontos -> R$ 0", () => {
    expect(calcAward(0, TIERS).total).toBe(0);
  });

  it("ignora faixas inativas", () => {
    const tiers = TIERS.map((t) => (t.id === "3" ? { ...t, active: false } : t));
    expect(calcAward(120, tiers).total).toBe(500 + 735);
  });
});

describe("somas da OS", () => {
  const items = [
    { item_type: "checklist" as const, label: "Troca de óleo", points: 0.75, done: true, approved: null, points_approved: null },
    { item_type: "checklist" as const, label: "Freios", points: 0.5, done: true, approved: true, points_approved: 0.5 },
    { item_type: "checklist" as const, label: "Corrente", points: 0.5, done: false, approved: null, points_approved: null },
    { item_type: "adicional" as const, label: "Troca de vela", points: 0.3, done: true, approved: true, points_approved: 0.3 },
  ];

  it("requestedPoints soma só itens executados", () => {
    expect(requestedPoints(items)).toBe(1.55);
  });

  it("approvedPoints soma só aprovados", () => {
    expect(approvedPoints(items)).toBe(0.8);
  });

  it("maxChecklistPoints ignora adicionais", () => {
    expect(maxChecklistPoints(items)).toBe(1.75);
  });

  it("maxOsPoints inclui adicionais", () => {
    expect(maxOsPoints(items)).toBe(2.05);
  });
});

describe("anti-duplicidade", () => {
  const items = [{ label: "Troca de Óleo" }, { label: "Calibragem dos pneus" }];

  it("detecta duplicado ignorando acentos e caixa", () => {
    expect(isDuplicateLabel(items, "troca de oleo")).toBe(true);
    expect(isDuplicateLabel(items, "  TROCA DE ÓLEO ")).toBe(true);
    expect(isDuplicateLabel(items, "Troca de vela")).toBe(false);
  });

  it("normalizeLabel remove acentos", () => {
    expect(normalizeLabel("Regulagem/lubrificação da Corrente")).toBe("regulagem/lubrificacao da corrente");
  });
});

describe("tierProgress", () => {
  it("87,5 pts -> faixa R$15, próxima em 100, faltam 12,5", () => {
    const p = tierProgress(87.5, TIERS);
    expect(p.current?.rate_brl).toBe(15);
    expect(p.next?.from_points).toBe(100);
    expect(p.missing).toBe(12.5);
  });

  it("120 pts -> última faixa, sem próxima", () => {
    const p = tierProgress(120, TIERS);
    expect(p.current?.rate_brl).toBe(20);
    expect(p.next).toBeNull();
    expect(p.missing).toBe(0);
  });

  it("10 pts -> primeira faixa, faltam 41 para a próxima", () => {
    const p = tierProgress(10, TIERS);
    expect(p.current?.rate_brl).toBe(10);
    expect(p.missing).toBe(41);
  });
});
