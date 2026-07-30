import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ListChecks, ChevronRight, Building, User, CalendarDays, SearchX } from "lucide-react";
import { useChkExecutions, type ChkExecStatus } from "@/hooks/useChecklists";
import { ChkPageHeader, ChkEmptyState, ChkListSkeleton, ChkBadge, type ChkTone } from "@/components/checklists/ChkUI";
import { formatDateBR } from "@/lib/dateFormat";

const STATUS_LABELS: Record<ChkExecStatus, string> = {
  pendente: "Pendente", em_andamento: "Em andamento", concluida: "Concluída", atrasada: "Atrasada",
};
const STATUS_TONES: Record<ChkExecStatus, ChkTone> = {
  pendente: "warn",
  em_andamento: "info",
  concluida: "ok",
  atrasada: "danger",
};

const VALID_STATUSES: ReadonlyArray<ChkExecStatus | "all"> = ["all", "pendente", "em_andamento", "concluida", "atrasada"];

export default function ChkExecucoes() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = (searchParams.get("status") as ChkExecStatus | "all" | null);
  const [status, setStatus] = useState<ChkExecStatus | "all">(
    initialStatus && VALID_STATUSES.includes(initialStatus) ? initialStatus : "all"
  );
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const { data: execs = [], isLoading } = useChkExecutions({ status, from, to });

  const changeStatus = (s: ChkExecStatus | "all") => {
    setStatus(s);
    const next = new URLSearchParams(searchParams);
    if (s === "all") next.delete("status"); else next.set("status", s);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <ChkPageHeader
        icon={ListChecks}
        title="Execuções"
        subtitle="Fila de checklists gerados a partir das atribuições"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <label className="sr-only" htmlFor="chk-from">Data inicial</label>
            <input
              id="chk-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
            />
            <span className="text-sm text-[hsl(var(--chk-text-dim))]">até</span>
            <label className="sr-only" htmlFor="chk-to">Data final</label>
            <input
              id="chk-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
            />
          </div>
        }
      />

      <div className="flex gap-2 flex-wrap" role="group" aria-label="Filtro de status">
        {(["all", "pendente", "em_andamento", "concluida", "atrasada"] as const).map((s) => (
          <button
            key={s}
            onClick={() => changeStatus(s)}
            data-active={status === s}
            aria-pressed={status === s}
            className="chk-chip"
          >
            {s === "all" ? "Todas" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <ChkListSkeleton rows={5} />
      ) : execs.length === 0 ? (
        <ChkEmptyState
          icon={SearchX}
          title="Nenhuma execução encontrada"
          hint="Ajuste o período ou o filtro de status para ver outros resultados."
        />
      ) : (
        <div className="card-elevated divide-y divide-[hsl(var(--chk-border))] overflow-hidden">
          {execs.map((e: any) => (
            <Link
              key={e.id}
              to={`/checklists/executar/${e.id}`}
              className="chk-row group flex items-center gap-3 px-4 py-3.5 min-h-[62px]"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{e.chk_templates?.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[hsl(var(--chk-text-dim))]">
                  <span className="inline-flex items-center gap-1 truncate">
                    <Building className="h-3 w-3 shrink-0" /> {e.chk_companies?.name}
                  </span>
                  <span className="inline-flex items-center gap-1 truncate">
                    <User className="h-3 w-3 shrink-0" /> {e.profiles?.full_name || "—"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3 w-3 shrink-0" /> {formatDateBR(e.target_date)}
                  </span>
                </p>
              </div>
              {e.score !== null && (
                <span className="text-sm font-bold tabular-nums text-[hsl(var(--chk-primary))]">{e.score}%</span>
              )}
              <ChkBadge tone={STATUS_TONES[e.status as ChkExecStatus]}>
                {STATUS_LABELS[e.status as ChkExecStatus]}
              </ChkBadge>
              <ChevronRight className="h-4 w-4 shrink-0 text-[hsl(var(--chk-text-dim))] transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
