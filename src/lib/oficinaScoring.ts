// Pontuação da Oficina: itens de serviço por OS, somas e cálculo progressivo
// da premiação por faixas. Compartilhado entre as telas do mecânico, auditoria,
// premiações e os testes unitários.

export type OsServiceItemType = "checklist" | "adicional" | "nao_cadastrado";

export interface OsServiceItem {
  id: string;
  organization_id: string;
  service_order_id: string;
  item_type: OsServiceItemType;
  label: string;
  points: number;
  done: boolean;
  done_at: string | null;
  done_by: string | null;
  approved: boolean | null;
  points_approved: number | null;
  audit_note: string | null;
  position: number;
}

export interface AwardTier {
  id: string;
  organization_id: string;
  label: string;
  from_points: number;
  to_points: number | null;
  rate_brl: number;
  /** Bônus fixo pago ao atingir a faixa (batimento de meta). */
  bonus_brl?: number | null;
  position: number;
  active: boolean;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Pontos solicitados: soma dos itens marcados como executados. */
export function requestedPoints(items: Pick<OsServiceItem, "done" | "points">[]) {
  return round2(items.filter((i) => i.done).reduce((s, i) => s + Number(i.points || 0), 0));
}

/** Pontos aprovados pela auditoria (só itens aprovados contam). */
export function approvedPoints(items: Pick<OsServiceItem, "approved" | "points" | "points_approved">[]) {
  return round2(
    items
      .filter((i) => i.approved === true)
      .reduce((s, i) => s + Number(i.points_approved ?? i.points ?? 0), 0),
  );
}

/** Pontuação máxima do checklist-base da OS (sem adicionais). */
export function maxChecklistPoints(items: Pick<OsServiceItem, "item_type" | "points">[]) {
  return round2(
    items.filter((i) => i.item_type === "checklist").reduce((s, i) => s + Number(i.points || 0), 0),
  );
}

/** Teto atual da OS: checklist-base + adicionais já incluídos. */
export function maxOsPoints(items: Pick<OsServiceItem, "item_type" | "points">[]) {
  return round2(
    items
      .filter((i) => i.item_type === "checklist" || i.item_type === "adicional")
      .reduce((s, i) => s + Number(i.points || 0), 0),
  );
}

/** Normaliza rótulo para comparação anti-duplicidade (sem acento, minúsculo). */
export function normalizeLabel(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Rótulos já presentes na OS (qualquer tipo), normalizados. */
export function existingLabels(items: Pick<OsServiceItem, "label">[]) {
  return new Set(items.map((i) => normalizeLabel(i.label)));
}

export function isDuplicateLabel(items: Pick<OsServiceItem, "label">[], label: string) {
  return existingLabels(items).has(normalizeLabel(label));
}

/* ---------- Premiação progressiva por faixas ---------- */

export interface AwardBreakdownRow {
  tier: AwardTier;
  points: number;
  amount: number;
}

/**
 * Cálculo progressivo: cada faixa cobre do fim da anterior até `to_points`.
 * Ex.: 70 pts com faixas (1-50 @10 · 51-99 @15) = 50×10 + 20×15 = R$ 800.
 */
export function calcAward(points: number, tiers: AwardTier[]): { total: number; breakdown: AwardBreakdownRow[] } {
  const sorted = [...tiers].filter((t) => t.active).sort((a, b) => Number(a.from_points) - Number(b.from_points));
  const p = Math.max(0, points);
  const breakdown: AwardBreakdownRow[] = [];
  let lower = 0;
  for (const tier of sorted) {
    const upper = tier.to_points == null ? Infinity : Number(tier.to_points);
    const span = Math.max(0, Math.min(p, upper) - lower);
    if (span > 0) breakdown.push({ tier, points: round2(span), amount: round2(span * Number(tier.rate_brl)) });
    lower = upper;
  }
  return { total: round2(breakdown.reduce((s, b) => s + b.amount, 0)), breakdown };
}

/** Situação do mecânico nas faixas: faixa atual, próxima e quanto falta. */
export function tierProgress(points: number, tiers: AwardTier[]) {
  const sorted = [...tiers].filter((t) => t.active).sort((a, b) => Number(a.from_points) - Number(b.from_points));
  if (!sorted.length) return { current: null as AwardTier | null, next: null as AwardTier | null, missing: 0, progress: 0 };
  let lower = 0;
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    const upper = t.to_points == null ? Infinity : Number(t.to_points);
    if (points <= upper || i === sorted.length - 1) {
      const next = t.to_points == null ? null : sorted[i + 1] ?? null;
      const missing = next ? round2(Math.max(0, Number(next.from_points) - points)) : 0;
      const span = upper === Infinity ? 0 : upper - lower;
      const progress = upper === Infinity ? 100 : Math.min(100, Math.round(((points - lower) / (span || 1)) * 100));
      return { current: t, next, missing, progress: Math.max(0, progress) };
    }
    lower = upper;
  }
  return { current: sorted[sorted.length - 1], next: null, missing: 0, progress: 100 };
}

export const POINTS_STATUS_INFO: Record<string, { label: string; chip: string }> = {
  pendente: { label: "Em auditoria", chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  aprovada: { label: "Aprovada", chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  ajustada: { label: "Ajustada", chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
};

export const formatPoints = (n: number) => {
  const v = round2(n);
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(".", ",");
};
