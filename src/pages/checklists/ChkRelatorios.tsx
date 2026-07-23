import { useState } from "react";
import { BarChart3, Download } from "lucide-react";
import { useChkReport } from "@/hooks/useChecklists";
import { formatDateBR } from "@/lib/dateFormat";

function formatDuration(startedAt: string | null, completedAt: string | null, createdAt?: string | null): string {
  if (!completedAt) return "—";
  const start = startedAt || createdAt;
  if (!start) return "—";
  const ms = new Date(completedAt).getTime() - new Date(start).getTime();
  if (!isFinite(ms) || ms < 0) return "—";
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function toCSV(rows: any[]) {
  if (rows.length === 0) return "";
  const headers = ["data", "empresa", "colaborador", "checklist", "status", "score", "duracao"];
  const lines = [headers.join(";")];
  for (const r of rows) {
    lines.push([
      formatDateBR(r.target_date),
      r.company_name,
      r.user_name || "",
      r.template_title,
      r.status,
      r.score ?? "",
      formatDuration(r.started_at, r.completed_at, r.created_at),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"));
  }
  return "\uFEFF" + lines.join("\n");
}

export default function ChkRelatorios() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const { data, isLoading } = useChkReport(from, to);

  const totals = data?.totals || {};
  const byCompany = data?.by_company || [];
  const byUser = data?.by_user || [];
  const byTemplate = data?.by_template || [];
  const executions = data?.executions || [];

  const exportCSV = () => {
    const blob = new Blob([toCSV(executions)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `checklists_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Relatórios</h1>
            <p className="text-sm text-muted-foreground">Acompanhamento dos checklists preenchidos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          <span className="text-sm text-muted-foreground">até</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          <button onClick={exportCSV} disabled={executions.length === 0} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50">
            <Download className="h-4 w-4" /> CSV
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="card-elevated p-12 flex justify-center"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <KPI label="Total" value={totals.total || 0} />
            <KPI label="Concluídas" value={totals.concluidas || 0} tone="success" />
            <KPI label="Pendentes" value={totals.pendentes || 0} tone="warning" />
            <KPI label="Atrasadas" value={totals.atrasadas || 0} tone="danger" />
            <KPI label="Score médio" value={`${totals.avg_score || 0}%`} />
          </div>

          <ReportSection title="Por empresa" rows={byCompany} keyName="company_name" />
          <ReportSection title="Por colaborador" rows={byUser} keyName="user_name" />
          <ReportSection title="Por modelo" rows={byTemplate} keyName="template_title" />

          <section className="space-y-2">
            <h2 className="font-semibold">Execuções ({executions.length})</h2>
            <div className="card-elevated divide-y divide-border max-h-[500px] overflow-y-auto">
              {executions.map((e: any) => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                  <span className="text-xs text-muted-foreground w-24">{formatDateBR(e.target_date)}</span>
                  <span className="flex-1 truncate">{e.template_title}</span>
                  <span className="text-xs text-muted-foreground truncate w-20 text-right tabular-nums" title="Duração">
                    {formatDuration(e.started_at, e.completed_at, e.created_at)}
                  </span>
                  <span className="text-xs text-muted-foreground truncate w-32">{e.company_name}</span>
                  <span className="text-xs text-muted-foreground truncate w-32">{e.user_name || "—"}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${e.status === "concluida" ? "bg-emerald-100 text-emerald-700" : e.status === "atrasada" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{e.status}</span>
                  {e.score !== null && <span className="text-sm font-semibold text-primary w-14 text-right">{e.score}%</span>}
                </div>
              ))}
              {executions.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma execução no período.</div>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function KPI({ label, value, tone = "default" }: { label: string; value: any; tone?: "default" | "success" | "warning" | "danger" }) {
  const color = { default: "text-foreground", success: "text-emerald-600", warning: "text-amber-600", danger: "text-red-600" }[tone];
  return (
    <div className="card-elevated p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold ${color} mt-1`}>{value}</p>
    </div>
  );
}

function ReportSection({ title, rows, keyName }: { title: string; rows: any[]; keyName: string }) {
  if (!rows || rows.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="font-semibold">{title}</h2>
      <div className="card-elevated divide-y divide-border">
        {rows.map((r: any, i: number) => {
          const pct = r.total > 0 ? Math.round((r.concluidas / r.total) * 100) : 0;
          return (
            <div key={i} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex-1 text-sm font-medium truncate">{r[keyName] || "—"}</span>
                <span className="text-xs text-muted-foreground">{r.concluidas}/{r.total} · score {r.avg_score || 0}%</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
