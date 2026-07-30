import { useMemo, useState } from "react";
import OficinaNav from "@/pages/op/OficinaNav";
import { useServiceOrders, useMechanics, type ServiceOrder } from "@/hooks/useOficina";
import { useCompanies } from "@/hooks/useOperacional";
import { filterOficinaCompanies } from "@/lib/oficinaCompanies";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import MonthSelector, { getCurrentMonthValue, getMonthDateRange } from "@/components/MonthSelector";
import { CheckCircle2, Send, RotateCcw, Download, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  STAGE_ENTREGUE, daysInWorkshop, osSlaInfo, suggestedAward,
  AWARD_STATUS_INFO, type AwardStatus,
} from "@/lib/oficinaStages";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const brDate = (d?: string | null) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("pt-BR") : "—";

function isFinished(o: ServiceOrder) {
  return !!o.finished_at && (o.stage === STAGE_ENTREGUE || o.status === "Finalizado" || o.status === "Entregue");
}

export default function OpOficinaPremiacoes() {
  const { user } = useAuth();
  const { items, update, refetch } = useServiceOrders();
  const { items: mechanics } = useMechanics();
  const { items: allCompanies } = useCompanies();
  const companies = useMemo(() => filterOficinaCompanies(allCompanies), [allCompanies]);

  const [month, setMonth] = useState(getCurrentMonthValue());
  const [mechFilter, setMechFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AwardStatus>("all");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const mechName = (id: string | null) => mechanics.find(m => m.id === id)?.name || "Sem mecânico";
  const companyName = (id: string | null) => companies.find(c => c.id === id)?.name || "Sem empresa";

  const rows = useMemo(() => {
    const { from, to } = getMonthDateRange(month);
    return items
      .filter(isFinished)
      .filter(o => {
        const d = new Date(`${o.finished_at}T12:00:00`);
        return d >= from && d <= to;
      })
      .filter(o => mechFilter === "all" || o.mechanic_id === mechFilter)
      .filter(o => companyFilter === "all" || (o.company_id || "none") === companyFilter)
      .filter(o => statusFilter === "all" || (o.award_status || "pendente") === statusFilter)
      .sort((a, b) => (b.finished_at || "").localeCompare(a.finished_at || ""));
  }, [items, month, mechFilter, companyFilter, statusFilter]);

  const totals = useMemo(() => {
    const sum = (list: ServiceOrder[]) => list.reduce((s, o) => s + Number(o.award_amount || 0), 0);
    const validadas = rows.filter(o => o.award_status === "validado");
    const enviadas = rows.filter(o => o.award_status === "enviado_dp");
    const pendentes = rows.filter(o => (o.award_status || "pendente") === "pendente");
    const noPrazo = rows.filter(o => osSlaInfo(o).onTime).length;
    return {
      count: rows.length,
      noPrazo,
      slaPercent: rows.length ? Math.round((noPrazo / rows.length) * 100) : 0,
      pendentes: pendentes.length,
      totalPendente: sum(pendentes),
      totalValidado: sum(validadas),
      totalEnviado: sum(enviadas),
      geral: sum(rows),
    };
  }, [rows]);

  const porMecanico = useMemo(() => {
    const m = new Map<string, { name: string; count: number; onTime: number; total: number; validado: number }>();
    rows.forEach(o => {
      const key = o.mechanic_id || "none";
      const cur = m.get(key) || { name: mechName(o.mechanic_id), count: 0, onTime: 0, total: 0, validado: 0 };
      cur.count += 1;
      if (osSlaInfo(o).onTime) cur.onTime += 1;
      cur.total += Number(o.award_amount || 0);
      if (o.award_status === "validado" || o.award_status === "enviado_dp") cur.validado += Number(o.award_amount || 0);
      m.set(key, cur);
    });
    return Array.from(m.values()).sort((a, b) => b.total - a.total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, mechanics]);

  const saveAmount = async (o: ServiceOrder, raw: string) => {
    const value = Number(String(raw).replace(",", "."));
    if (!Number.isFinite(value) || value < 0) return;
    if (value === Number(o.award_amount || 0)) return;
    await update(o.id, { award_amount: value, award_status: "pendente", award_validated_by: null, award_validated_at: null, award_sent_at: null } as Partial<ServiceOrder>);
  };

  const validar = (o: ServiceOrder) =>
    update(o.id, {
      award_status: "validado",
      award_validated_by: user?.id || null,
      award_validated_at: new Date().toISOString(),
    } as Partial<ServiceOrder>);

  const enviarDp = (o: ServiceOrder) =>
    update(o.id, { award_status: "enviado_dp", award_sent_at: new Date().toISOString() } as Partial<ServiceOrder>);

  const reabrir = (o: ServiceOrder) =>
    update(o.id, {
      award_status: "pendente",
      award_validated_by: null,
      award_validated_at: null,
      award_sent_at: null,
    } as Partial<ServiceOrder>);

  const validarTodas = async () => {
    const pend = rows.filter(o => (o.award_status || "pendente") === "pendente" && Number(o.award_amount || 0) > 0);
    for (const o of pend) await validar(o);
    refetch();
  };

  const exportCsv = () => {
    const head = ["OS", "Finalizada em", "Placa", "Modelo", "Empresa", "Mecânico", "Dias", "SLA", "Premiação", "Situação"];
    const lines = rows.map(o => {
      const sla = osSlaInfo(o);
      return [
        o.os_number, brDate(o.finished_at), o.vehicle_plate || "", o.vehicle_model || "",
        companyName(o.company_id), mechName(o.mechanic_id),
        daysInWorkshop(o.opened_at, o.finished_at), sla.onTime ? "No prazo" : "Fora do prazo",
        Number(o.award_amount || 0).toFixed(2).replace(".", ","),
        AWARD_STATUS_INFO[(o.award_status || "pendente") as AwardStatus].label,
      ].join(";");
    });
    const csv = "\uFEFF" + [head.join(";"), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `premiacoes-oficina-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <OficinaNav />
      <div className="p-4 md:p-6 max-w-[1200px] mx-auto space-y-4">
        <header className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Award className="h-5 w-5 text-orange-600" /> Premiações · OS finalizadas
            </h1>
            <p className="text-sm text-muted-foreground">
              Cada OS finalizada gera premiação ao mecânico. A gerência valida o valor antes do envio ao DP.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button size="sm" onClick={validarTodas} disabled={!totals.pendentes}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Validar pendentes
            </Button>
          </div>
        </header>

        {/* Filtros */}
        <section className="bg-card border rounded-xl p-4 grid gap-3 md:grid-cols-4">
          <div>
            <Label className="text-xs">Mês</Label>
            <MonthSelector value={month} onChange={setMonth} />
          </div>
          <div>
            <Label className="text-xs">Mecânico</Label>
            <Select value={mechFilter} onValueChange={setMechFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os mecânicos</SelectItem>
                {mechanics.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Empresas (Oficina)</Label>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                <SelectItem value="none">Sem empresa</SelectItem>
                {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Situação da premiação</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="validado">Validada</SelectItem>
                <SelectItem value="enviado_dp">Enviada ao DP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* Resumo */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="OS finalizadas no mês" value={String(totals.count)} sub={`${totals.noPrazo} no prazo · ${totals.slaPercent}% SLA`} />
          <Stat label="A validar" value={brl(totals.totalPendente)} sub={`${totals.pendentes} OS pendente(s)`} tone="amber" />
          <Stat label="Validado (aguardando DP)" value={brl(totals.totalValidado)} tone="sky" />
          <Stat label="Enviado ao DP" value={brl(totals.totalEnviado)} sub={`Total geral ${brl(totals.geral)}`} tone="emerald" />
        </section>

        {/* Por mecânico */}
        <section className="bg-card border rounded-xl p-4">
          <div className="font-semibold mb-3 text-sm">Por mecânico</div>
          {porMecanico.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma OS finalizada no período.</p>
          ) : (
            <div className="space-y-2">
              {porMecanico.map(m => (
                <div key={m.name} className="flex items-center gap-3 text-sm border-b last:border-0 pb-2 last:pb-0">
                  <span className="flex-1 truncate font-medium">{m.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{m.count} OS · {m.onTime} no prazo</span>
                  <span className="text-xs text-muted-foreground tabular-nums w-28 text-right">validado {brl(m.validado)}</span>
                  <span className="font-semibold tabular-nums w-24 text-right">{brl(m.total)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Tabela de OS */}
        <section className="bg-card border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold text-sm">OS finalizadas ({rows.length})</div>
          {rows.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Nenhuma OS finalizada com os filtros selecionados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">OS</th>
                    <th className="text-left px-3 py-2">Moto</th>
                    <th className="text-left px-3 py-2">Empresa</th>
                    <th className="text-left px-3 py-2">Mecânico</th>
                    <th className="text-left px-3 py-2">Finalizada</th>
                    <th className="text-left px-3 py-2">SLA</th>
                    <th className="text-left px-3 py-2">Premiação</th>
                    <th className="text-left px-3 py-2">Situação</th>
                    <th className="text-right px-3 py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(o => {
                    const sla = osSlaInfo(o);
                    const status = (o.award_status || "pendente") as AwardStatus;
                    const info = AWARD_STATUS_INFO[status];
                    const locked = status !== "pendente";
                    const draft = drafts[o.id] ?? String(Number(o.award_amount || 0));
                    return (
                      <tr key={o.id} className="border-t align-middle">
                        <td className="px-3 py-2 font-semibold tabular-nums">#{o.os_number}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{o.vehicle_plate || "—"}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[160px]">{o.vehicle_model || "—"}</div>
                        </td>
                        <td className="px-3 py-2 text-xs">{companyName(o.company_id)}</td>
                        <td className="px-3 py-2 text-xs">{mechName(o.mechanic_id)}</td>
                        <td className="px-3 py-2 text-xs tabular-nums">
                          {brDate(o.finished_at)}
                          <div className="text-[11px] text-muted-foreground">{daysInWorkshop(o.opened_at, o.finished_at)}d na oficina</div>
                        </td>
                        <td className="px-3 py-2">
                          <span className={cn("text-[11px] font-medium rounded-full px-2 py-1", sla.chip)}>{sla.label}</span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className="h-8 w-24"
                              disabled={locked}
                              value={draft}
                              onChange={(e) => setDrafts(p => ({ ...p, [o.id]: e.target.value }))}
                              onBlur={(e) => saveAmount(o, e.target.value)}
                            />
                            {!locked && Number(o.award_amount || 0) === 0 && (
                              <button
                                type="button"
                                className="text-[11px] text-orange-600 hover:underline whitespace-nowrap"
                                onClick={() => {
                                  const v = suggestedAward(sla.onTime);
                                  setDrafts(p => ({ ...p, [o.id]: String(v) }));
                                  saveAmount(o, String(v));
                                }}
                              >
                                sugerir {brl(suggestedAward(sla.onTime))}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <Badge className={cn("border-0", info.chip)}>{info.label}</Badge>
                          {o.award_sent_at && (
                            <div className="text-[11px] text-muted-foreground">
                              {new Date(o.award_sent_at).toLocaleDateString("pt-BR")}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-1">
                            {status === "pendente" && (
                              <Button size="sm" variant="outline" disabled={Number(o.award_amount || 0) <= 0} onClick={() => validar(o)}>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Validar
                              </Button>
                            )}
                            {status === "validado" && (
                              <Button size="sm" onClick={() => enviarDp(o)}>
                                <Send className="h-3.5 w-3.5 mr-1" /> Enviar ao DP
                              </Button>
                            )}
                            {locked && (
                              <Button size="sm" variant="ghost" onClick={() => reabrir(o)} title="Reabrir premiação">
                                <RotateCcw className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Stat({ label, value, sub, tone = "slate" }: { label: string; value: string; sub?: string; tone?: "slate" | "amber" | "sky" | "emerald" }) {
  const tones: Record<string, string> = {
    slate: "border-border",
    amber: "border-amber-200 bg-amber-50/60 dark:bg-amber-500/5",
    sky: "border-sky-200 bg-sky-50/60 dark:bg-sky-500/5",
    emerald: "border-emerald-200 bg-emerald-50/60 dark:bg-emerald-500/5",
  };
  return (
    <div className={cn("border rounded-xl p-4 bg-card", tones[tone])}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold tabular-nums mt-1">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
