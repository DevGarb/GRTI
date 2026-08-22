export const DIAS_ALERTA = 30; // dias na oficina -> alerta (motos com o cliente não entram em alerta)

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
  { id: "pintura", label: "Aguardando para iniciar reparo", dot: "bg-fuchsia-500", bar: "bg-fuchsia-500", chip: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300" },
  { id: "execucao", label: "Em Execução", dot: "bg-blue-500", bar: "bg-blue-500", chip: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  
];

export const STAGE_ENTREGUE = "entregue";

/** Etapas legadas que já contam como finalizadas (a etapa "pronto" foi removida do fluxo). */
export const LEGACY_DONE_STAGES = ["pronto"];
export const isDoneStage = (stage?: string | null) =>
  stage === STAGE_ENTREGUE || LEGACY_DONE_STAGES.includes(stage || "");

export const stageInfo = (id: string): OficinaStage =>
  STAGES.find((s) => s.id === id) || { id, label: isDoneStage(id) ? "Entregue" : id, dot: "bg-emerald-700", bar: "bg-emerald-700", chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" };

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


/* ---------- Premiação por OS finalizada ---------- */

export type AwardStatus = "pendente" | "validado" | "enviado_dp";

export const AWARD_STATUS_INFO: Record<AwardStatus, { label: string; chip: string }> = {
  pendente: { label: "Pendente", chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  validado: { label: "Validada", chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  enviado_dp: { label: "Enviada ao DP", chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
};

/** Valores sugeridos de premiação por OS finalizada. */
export const PREMIO_NO_PRAZO = 50;
export const PREMIO_FORA_PRAZO = 25;

export const suggestedAward = (onTime: boolean) => (onTime ? PREMIO_NO_PRAZO : PREMIO_FORA_PRAZO);

/** SLA da OS: usa o prazo (deadline) quando existir, senão abertura + DIAS_ALERTA. */
export function osSlaInfo(o: { opened_at: string; finished_at?: string | null; deadline?: string | null }) {
  const limit = o.deadline
    ? new Date(`${o.deadline}T23:59:59`)
    : (() => { const d = new Date(`${o.opened_at}T23:59:59`); d.setDate(d.getDate() + DIAS_ALERTA); return d; })();
  const end = new Date(`${o.finished_at || new Date().toISOString().slice(0, 10)}T12:00:00`);
  const days = Math.round((limit.getTime() - end.getTime()) / DAY);
  const onTime = end.getTime() <= limit.getTime();
  return {
    onTime,
    days,
    label: onTime ? `No prazo${days > 0 ? ` (${days}d)` : ""}` : `Fora do prazo (${Math.abs(days)}d)`,
    chip: onTime
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  };
}

/* ---------- Checklist de serviço (por OS) ---------- */

/** Itens padrão do checklist de serviço, na mesma ordem criada no banco. */
export const SERVICE_CHECKLIST = [
  "Orçamento aprovado",
  "Peças recebidas",
  "Desmontagem",
  "Desempeno / Chassi",
  "Pintura",
  "Pré-montagem",
  "Montagem final",
  "Revisão / Teste",
] as const;

export const CHECKLIST_PARTS_LABEL = "Peças recebidas";

/** Percentual de conclusão do checklist (0-100). */
export function checklistProgress(items: { done: boolean }[]) {
  if (!items.length) return { done: 0, total: 0, percent: 0 };
  const done = items.filter((i) => i.done).length;
  return { done, total: items.length, percent: Math.round((done / items.length) * 100) };
}

