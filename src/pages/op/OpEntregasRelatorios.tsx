import { useMemo, useState } from "react";
import { BarChart3, Download } from "lucide-react";
import { useDeliveries } from "@/hooks/useDeliveries";
import { useDrivers, useCompanies } from "@/hooks/useOperacional";
import { filterEntregasCompanies } from "@/lib/oficinaCompanies";
import { useDeliveryCategories } from "@/hooks/useDeliveryCategories";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatDateBR } from "@/lib/dateFormat";
import EntregasNav from "./EntregasNav";
import "./cearagps.css";

function todayISO() { return new Date().toISOString().slice(0, 10); }
function monthStartISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function OpEntregasRelatorios() {
  const { items, loading } = useDeliveries();
  const { items: drivers } = useDrivers();
  const { items: companies } = useCompanies();
  const { activeItems: categories } = useDeliveryCategories();

  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO());
  const [companyId, setCompanyId] = useState("all");
  const [driverId, setDriverId] = useState("all");

  // Demandas executadas = status Finalizado, pela data agendada dentro do período
  const rows = useMemo(() => {
    return items.filter(d => {
      if (d.status !== "Finalizado") return false;
      if (d.scheduled_date < from || d.scheduled_date > to) return false;
      if (companyId !== "all" && d.company_id !== companyId) return false;
      if (driverId !== "all" && d.driver_id !== driverId) return false;
      return true;
    });
  }, [items, from, to, companyId, driverId]);

  const companyName = (id: string | null | undefined) => companies.find(c => c.id === id)?.name || "Sem empresa";
  const driverName = (id: string | null | undefined) => drivers.find(dr => dr.id === id)?.name || "Sem motorista";
  const catName = (id: string | null | undefined) => categories.find(c => c.id === id)?.name || null;

  const groupBy = (keyFn: (d: any) => string) => {
    const map = new Map<string, number>();
    rows.forEach(d => map.set(keyFn(d), (map.get(keyFn(d)) || 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  };

  const byCompany = useMemo(() => groupBy(d => companyName(d.company_id)), [rows, companies]);
  const byDriver = useMemo(() => groupBy(d => driverName(d.driver_id)), [rows, drivers]);
  const byDate = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach(d => map.set(d.scheduled_date, (map.get(d.scheduled_date) || 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [rows]);

  const detail = useMemo(() =>
    [...rows].sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date)),
  [rows]);

  const exportCSV = () => {
    const headers = ["data", "empresa", "motorista", "categoria", "periodo", "solicitante", "endereco", "concluido_em"];
    const lines = [headers.join(";")];
    for (const d of detail) {
      lines.push([
        formatDateBR(d.scheduled_date),
        companyName(d.company_id),
        driverName(d.driver_id),
        catName(d.category_id) || d.type || "",
        d.period || "",
        d.requester_name || "",
        (d.address || "").replace(/\s+/g, " ").trim(),
        d.closed_at ? formatDateBR(d.closed_at.slice(0, 10)) : "",
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(";"));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `entregas_executadas_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="cgps-scope min-h-screen bg-[hsl(var(--cgps-muted))]">
      <EntregasNav />
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: "hsl(191 74% 20%)" }}>
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "hsl(191 74% 20%)" }}>Relatórios</h1>
              <p className="text-sm text-muted-foreground">Demandas executadas por data, empresa e motorista</p>
            </div>
          </div>
          <Button onClick={exportCSV} disabled={detail.length === 0}>
            <Download className="h-4 w-4 mr-1" /> Exportar CSV
          </Button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1" htmlFor="rel-from">Data inicial</label>
            <input id="rel-from" type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1" htmlFor="rel-to">Data final</label>
            <input id="rel-to" type="date" value={to} onChange={e => setTo(e.target.value)}
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Empresa</label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                {filterEntregasCompanies(companies as any[]).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Motorista</label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os motoristas</SelectItem>
                {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xs text-muted-foreground">Total executadas</div>
            <div className="text-3xl font-bold tabular-nums" style={{ color: "hsl(191 74% 20%)" }}>{rows.length}</div>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground py-12 text-center">Carregando…</div>
        ) : (
          <>
            {/* Agrupamentos */}
            <div className="grid md:grid-cols-3 gap-4">
              <GroupCard title="Por data" entries={byDate.map(([k, v]) => [formatDateBR(k), v])} total={rows.length} />
              <GroupCard title="Por empresa" entries={byCompany} total={rows.length} />
              <GroupCard title="Por motorista" entries={byDriver} total={rows.length} />
            </div>

            {/* Detalhe */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <span className="font-semibold text-sm">Detalhamento ({detail.length})</span>
              </div>
              <div className="max-h-[520px] overflow-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur">
                    <tr className="border-b">
                      <th className="px-4 py-2.5 text-left font-semibold">Data</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Empresa</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Motorista</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Categoria</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Período</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Solicitante</th>
                      <th className="px-4 py-2.5 text-left font-semibold">Concluída em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {detail.map(d => (
                      <tr key={d.id}>
                        <td className="px-4 py-2.5 whitespace-nowrap text-xs text-muted-foreground tabular-nums">{formatDateBR(d.scheduled_date)}</td>
                        <td className="px-4 py-2.5 font-medium max-w-[200px] truncate">{companyName(d.company_id)}</td>
                        <td className="px-4 py-2.5 max-w-[160px] truncate text-xs">{driverName(d.driver_id)}</td>
                        <td className="px-4 py-2.5 max-w-[160px] truncate text-xs">{catName(d.category_id) || d.type || "—"}</td>
                        <td className="px-4 py-2.5 text-xs">{d.period || "—"}</td>
                        <td className="px-4 py-2.5 max-w-[160px] truncate text-xs text-muted-foreground">{d.requester_name || "—"}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-xs text-muted-foreground tabular-nums">{d.closed_at ? formatDateBR(d.closed_at.slice(0, 10)) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {detail.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma entrega finalizada no período.</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function GroupCard({ title, entries, total }: { title: string; entries: [string, number][]; total: number }) {
  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="px-4 py-3 border-b">
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <div className="divide-y max-h-[320px] overflow-auto">
        {entries.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground text-center">Sem dados.</div>
        )}
        {entries.map(([label, count], i) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={i} className="px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className="flex-1 text-sm font-medium truncate">{label}</span>
                <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                  {count} · {pct}%
                </span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${pct}%`, background: "hsl(14 82% 51%)" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
