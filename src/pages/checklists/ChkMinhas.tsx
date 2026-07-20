import { Link } from "react-router-dom";
import { ClipboardCheck, ChevronRight } from "lucide-react";
import { useChkExecutions, type ChkExecStatus } from "@/hooks/useChecklists";

const STATUS_LABELS: Record<ChkExecStatus, string> = {
  pendente: "Pendente", em_andamento: "Em andamento", concluida: "Concluída", atrasada: "Atrasada",
};
const STATUS_COLORS: Record<ChkExecStatus, string> = {
  pendente: "bg-amber-100 text-amber-700",
  em_andamento: "bg-blue-100 text-blue-700",
  concluida: "bg-emerald-100 text-emerald-700",
  atrasada: "bg-red-100 text-red-700",
};

export default function ChkMinhas() {
  const { data: execs = [], isLoading } = useChkExecutions({ mine: true });
  const pendentes = execs
    .filter((e: any) => e.status !== "concluida")
    .slice()
    .sort((a: any, b: any) => (a.target_date || "").localeCompare(b.target_date || ""));
  const concluidas = execs.filter((e: any) => e.status === "concluida");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Meus Checklists</h1>
          <p className="text-sm text-muted-foreground">Checklists atribuídos a você</p>
        </div>
      </div>

      {isLoading ? (
        <div className="card-elevated p-12 flex justify-center"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">A fazer ({pendentes.length})</h2>
            {pendentes.length === 0 ? (
              <div className="card-elevated p-8 text-center text-sm text-muted-foreground">Nada pendente. 🎉</div>
            ) : (
              <div className="card-elevated divide-y divide-border">
                {pendentes.map((e: any) => (
                  <Link key={e.id} to={`/checklists/executar/${e.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{e.chk_templates?.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{e.chk_companies?.name} · {e.target_date}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[e.status as ChkExecStatus]}`}>{STATUS_LABELS[e.status as ChkExecStatus]}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </section>

          {concluidas.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Concluídos ({concluidas.length})</h2>
              <div className="card-elevated divide-y divide-border">
                {concluidas.map((e: any) => (
                  <Link key={e.id} to={`/checklists/executar/${e.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{e.chk_templates?.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{e.chk_companies?.name} · {e.target_date}</p>
                    </div>
                    <span className="text-sm font-semibold text-primary">{e.score}%</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
