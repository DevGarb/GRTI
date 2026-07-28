export const DIAS_ALERTA = 15; // dias na oficina -> alerta
export const SLA_PECAS = 10; // dias para concluir após a chegada das peças

export interface OficinaStage {
  id: string;
  label: string;
  dot: string;
  bar: string;
  chip: string;
}

export const STAGES: OficinaStage[] = [
  { id: "analise", label: "Análise / Triagem", dot: "bg-slate-400", bar: "bg-slate-400", chip: "bg-slate-500/10 text-slate-700 dark:text-slate-300" },
  { id: "orcamento", label: "Orçamento / Compras", dot: "bg-sky-500", bar: "bg-sky-500", chip: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  { id: "aguardando_peca", label: "Aguardando Peça", dot: "bg-amber-500", bar: "bg-amber-500", chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  { id: "desempeno", label: "Desempeno / Chassi", dot: "bg-violet-500", bar: "bg-violet-500", chip: "bg-violet-500/10 text-violet-700 dark:text-violet-300" },
  { id: "pintura", label: "Pintura", dot: "bg-fuchsia-500", bar: "bg-fuchsia-500", chip: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300" },
  { id: "execucao", label: "Em Execução", dot: "bg-blue-500", bar: "bg-blue-500", chip: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  { id: "pronto", label: "Pronto p/ Entrega", dot: "bg-emerald-500", bar: "bg-emerald-500", chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
];

export const STAGE_ENTREGUE = "entregue";

export const stageInfo = (id: string): OficinaStage =>
  STAGES.find((s) => s.id === id) || { id, label: id === STAGE_ENTREGUE ? "Entregue" : id, dot: "bg-slate-400", bar: "bg-slate-400", chip: "bg-slate-500/10 text-slate-700" };

export const PART_STATUS_FLOW = ["solicitada", "orcamento", "comprada", "recebida"] as const;
export type PartStatus = (typeof PART_STATUS_FLOW)[number];

export const PART_STATUS_INFO: Record<string, { label: string; chip: string }> = {
  solicitada: { label: "Solicitada", chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  orcamento: { label: "Em Orçamento", chip: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  comprada: { label: "Comprada", chip: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" },
  recebida: { label: "Recebida", chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
};

const DAY = 86400000;

export function diffDays(fromISO: string, toISO: string) {
  return Math.floor((new Date(toISO).getTime() - new Date(fromISO).getTime()) / DAY);
}

export function daysInWorkshop(openedAt: string, finishedAt?: string | null) {
  return Math.max(0, diffDays(openedAt, finishedAt || new Date().toISOString()));
}

/** Dias restantes do SLA de peças (negativo = estourado). Null se peças não chegaram. */
export function partsSlaRemaining(partsArrivedAt?: string | null) {
  if (!partsArrivedAt) return null;
  const limit = new Date(partsArrivedAt);
  limit.setDate(limit.getDate() + SLA_PECAS);
  return diffDays(new Date().toISOString(), limit.toISOString());
}
