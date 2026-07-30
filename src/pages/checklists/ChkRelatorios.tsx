import { useState } from "react";
import { BarChart3, Download } from "lucide-react";
import { useChkReport } from "@/hooks/useChecklists";
import { formatDateBR } from "@/lib/dateFormat";
import { ChkPageHeader, ChkKpiCard, ChkListSkeleton, ChkBadge } from "@/components/checklists/ChkUI";

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
      <ChkPageHeader
        icon={BarChart3}
        title="Relatórios"
        subtitle="Acompanhamento dos checklists preenchidos"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <label className="sr-only" htmlFor="rep-from">Data inicial</label>
            <input id="rep-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <span className="text-sm text-[hsl(var(--chk-text-dim))]">até</span>
            <label className="sr-only" htmlFor="rep-to">Data final</label>
            <input id="rep-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <button onClick={exportCSV} disabled={executions.length === 0} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5 shadow-sm hover:brightness-110 disabled:opacity-50">
              <Download className="h-4 w-4" /> CSV
            </button>
          </div>
        }
      />

      {isLoading ? (
        <ChkListSkeleton rows={5} />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <ChkKpiCard label="Total" value={totals.total || 0} />
            <ChkKpiCard label="Concluídas" value={totals.concluidas || 0} tone="ok" />
            <ChkKpiCard label="Pendentes" value={totals.pendentes || 0} tone="warn" />
            <ChkKpiCard label="Atrasadas" value={totals.atrasadas || 0} tone="danger" />
            <ChkKpiCard label="Score médio" value={`${totals.avg_score || 0}%`} tone="info" />
          </div>

          <ReportSection title="Por empresa" rows={byCompany} keyName="company_name" />
          <ReportSection title="Por colaborador" rows={byUser} keyName="user_name" />
          <ReportSection title="Por modelo" rows={byTemplate} keyName="template_title" />

          <section className="space-y-3">
            <p className="chk-eyebrow">Execuções ({executions.length})</p>
            <div className="card-elevated overflow-hidden">
              <div className="max-h-[520px] overflow-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="sticky top-0 z-10 backdrop-blur">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-semibold">Data</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Checklist</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Empresa</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Colaborador</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Duração</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Status</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--chk-border))]">
                    {executions.map((e: any) => (
                      <tr key={e.id}>
                        <td className="px-4 py-2.5 whitespace-nowrap text-xs text-[hsl(var(--chk-text-dim))] tabular-nums">{formatDateBR(e.target_date)}</td>
                        <td className="px-4 py-2.5 max-w-[260px] truncate font-medium">{e.template_title}</td>
                        <td className="px-4 py-2.5 max-w-[180px] truncate text-xs text-[hsl(var(--chk-text-dim))]">{e.company_name}</td>
                        <td className="px-4 py-2.5 max-w-[180px] truncate text-xs text-[hsl(var(--chk-text-dim))]">{e.user_name || "—"}</td>
                        <td className="px-4 py-2.5 text-right text-xs tabular-nums text-[hsl(var(--chk-text-dim))]">{formatDuration(e.started_at, e.completed_at, e.created_at)}</td>
                        <td className="px-4 py-2.5">
                          <ChkBadge tone={e.status === "concluida" ? "ok" : e.status === "atrasada" ? "danger" : "warn"}>{e.status}</ChkBadge>
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold tabular-nums text-[hsl(var(--chk-primary))]">
                          {e.score !== null ? `${e.score}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {executions.length === 0 && (
                <div className="p-8 text-center text-sm text-[hsl(var(--chk-text-dim))]">Nenhuma execução no período.</div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function ReportSection({ title, rows, keyName }: { title: string; rows: any[]; keyName: string }) {
  if (!rows || rows.length === 0) return null;
  return (
    <section className="space-y-3">
      <p className="chk-eyebrow">{title}</p>
      <div className="card-elevated divide-y divide-[hsl(var(--chk-border))] overflow-hidden">
        {rows.map((r: any, i: number) => {
          const pct = r.total > 0 ? Math.round((r.concluidas / r.total) * 100) : 0;
          return (
            <div key={i} className="chk-row px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex-1 text-sm font-medium truncate">{r[keyName] || "—"}</span>
                <span className="text-xs text-[hsl(var(--chk-text-dim))] tabular-nums whitespace-nowrap">
                  {r.concluidas}/{r.total} · score {r.avg_score || 0}%
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-[hsl(var(--chk-surface-3))] overflow-hidden">
                <div className="h-full rounded-full bg-[hsl(var(--chk-primary))] transition-[width] duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
