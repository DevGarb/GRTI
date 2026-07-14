import { useState } from "react";
import { Link } from "react-router-dom";
import { ListChecks, ChevronRight } from "lucide-react";
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

export default function ChkExecucoes() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [status, setStatus] = useState<ChkExecStatus | "all">("all");
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const { data: execs = [], isLoading } = useChkExecutions({ status, from, to });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <ListChecks className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Execuções</h1>
            <p className="text-sm text-muted-foreground">Fila de checklists gerados a partir das atribuições</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          <span className="text-sm text-muted-foreground">até</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["all", "pendente", "em_andamento", "concluida", "atrasada"] as const).map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${status === s ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-muted"}`}>
            {s === "all" ? "Todas" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="card-elevated p-12 flex justify-center"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : execs.length === 0 ? (
        <div className="card-elevated p-12 text-center text-sm text-muted-foreground">Nenhuma execução encontrada no período.</div>
      ) : (
        <div className="card-elevated divide-y divide-border">
          {execs.map((e: any) => (
            <Link key={e.id} to={`/checklists/executar/${e.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{e.chk_templates?.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {e.chk_companies?.name} · {e.profiles?.full_name || "—"} · {e.target_date}
                </p>
              </div>
              {e.score !== null && <span className="text-sm font-semibold text-primary">{e.score}%</span>}
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[e.status as ChkExecStatus]}`}>{STATUS_LABELS[e.status as ChkExecStatus]}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
