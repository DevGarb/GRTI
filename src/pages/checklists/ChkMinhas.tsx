import { Link } from "react-router-dom";
import { ClipboardCheck, ChevronRight, Building, CalendarDays, PartyPopper } from "lucide-react";
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

export default function ChkMinhas() {
  const { data: execs = [], isLoading } = useChkExecutions({ mine: true });
  const pendentes = execs
    .filter((e: any) => e.status !== "concluida")
    .slice()
    .sort((a: any, b: any) => (a.target_date || "").localeCompare(b.target_date || ""));
  const concluidas = execs.filter((e: any) => e.status === "concluida");

  return (
    <div className="space-y-6 sm:space-y-8">
      <ChkPageHeader icon={ClipboardCheck} title="Meus Checklists" subtitle="Checklists atribuídos a você" />

      {isLoading ? (
        <ChkListSkeleton rows={4} />
      ) : (
        <>
          <section className="space-y-3">
            <p className="chk-eyebrow">A fazer ({pendentes.length})</p>
            {pendentes.length === 0 ? (
              <ChkEmptyState
                icon={PartyPopper}
                title="Nada pendente por aqui"
                hint="Assim que um novo checklist for atribuído a você, ele aparece nesta lista."
              />
            ) : (
              <div className="card-elevated divide-y divide-[hsl(var(--chk-border))] overflow-hidden">
                {pendentes.map((e: any) => (
                  <Link
                    key={e.id}
                    to={`/checklists/executar/${e.id}`}
                    className="chk-row flex items-center gap-3 px-4 py-3.5 min-h-[60px] group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{e.chk_templates?.title}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[hsl(var(--chk-text-dim))]">
                        <span className="inline-flex items-center gap-1 truncate">
                          <Building className="h-3 w-3 shrink-0" /> {e.chk_companies?.name}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3 shrink-0" /> {formatDateBR(e.target_date)}
                        </span>
                      </p>
                    </div>
                    <ChkBadge tone={STATUS_TONES[e.status as ChkExecStatus]}>
                      {STATUS_LABELS[e.status as ChkExecStatus]}
                    </ChkBadge>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[hsl(var(--chk-text-dim))] transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            )}
          </section>

          {concluidas.length > 0 && (
            <section className="space-y-3">
              <p className="chk-eyebrow">Concluídos ({concluidas.length})</p>
              <div className="card-elevated divide-y divide-[hsl(var(--chk-border))] overflow-hidden">
                {concluidas.map((e: any) => (
                  <Link
                    key={e.id}
                    to={`/checklists/executar/${e.id}`}
                    className="chk-row flex items-center gap-3 px-4 py-3.5 min-h-[60px] group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{e.chk_templates?.title}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[hsl(var(--chk-text-dim))]">
                        <span className="inline-flex items-center gap-1 truncate">
                          <Building className="h-3 w-3 shrink-0" /> {e.chk_companies?.name}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3 shrink-0" /> {formatDateBR(e.target_date)}
                        </span>
                      </p>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-[hsl(var(--chk-primary))]">{e.score}%</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[hsl(var(--chk-text-dim))] transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
