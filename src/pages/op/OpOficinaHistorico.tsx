import { useEffect, useMemo, useState } from "react";
import { Search, Download, Bike, ChevronDown, ChevronRight, History } from "lucide-react";
import OficinaNav from "@/pages/op/OficinaNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DateRangeFilter, { currentMonthStart, todayStr } from "@/components/shared/DateRangeFilter";
import { useOficinaHistorico, normalizePlate } from "@/hooks/useOficinaHistorico";
import { useMechanics, type ServiceOrder } from "@/hooks/useOficina";
import { useCompanies } from "@/hooks/useOperacional";
import { stageInfo, daysInWorkshop, STAGE_ENTREGUE } from "@/lib/oficinaStages";
import { cn } from "@/lib/utils";
import "./cearagps.css";

const DAY = 86400000;
const RETORNO_DIAS = 30;

const fmtDate = (v?: string | null) => (v ? new Date(`${v.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—");
const fmtMoney = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function OpOficinaHistorico() {
  const [term, setTerm] = useState("");
  const [from, setFrom] = useState(currentMonthStart());
  const [to, setTo] = useState(todayStr());
  const [selected, setSelected] = useState<string | null>(null);
  const [openOs, setOpenOs] = useState<string | null>(null);

  const { loading, orders, partsByOs, photosByOs, search, groupByPlate } = useOficinaHistorico();
  const { items: mechanics } = useMechanics();
  const { items: companies } = useCompanies();

  const mechName = (id: string | null) => mechanics.find((m) => m.id === id)?.name || "Sem mecânico";
  const companyName = (id: string | null) => companies.find((c) => c.id === id)?.name || "Sem empresa";

  useEffect(() => { search("", from, to); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const doSearch = () => { setSelected(null); search(term, from, to); };

  const groups = useMemo(() => groupByPlate(orders), [orders]); // eslint-disable-line react-hooks/exhaustive-deps
  const current = groups.find((g) => g.plate === selected) || null;

  const partsTotal = (osId: string) =>
    (partsByOs[osId] || []).reduce((s, p) => s + Number(p.quantity || 0) * Number(p.unit_price || 0), 0);

  const osCost = (o: ServiceOrder) => Number(o.total_cost || 0) || partsTotal(o.id);

  const resumo = useMemo(() => {
    if (!current) return null;
    const list = [...current.orders].sort((a, b) => a.opened_at.localeCompare(b.opened_at));
    const abertas = list.filter((o) => o.stage !== STAGE_ENTREGUE && o.status !== "Finalizado" && o.status !== "Cancelada");
    const finalizadas = list.filter((o) => o.finished_at);
    const mediaDias = finalizadas.length
      ? Math.round(finalizadas.reduce((s, o) => s + daysInWorkshop(o.opened_at, o.finished_at), 0) / finalizadas.length)
      : 0;
    let retornos = 0;
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1];
      const base = prev.finished_at || prev.opened_at;
      const gap = (new Date(list[i].opened_at).getTime() - new Date(base).getTime()) / DAY;
      if (gap >= 0 && gap <= RETORNO_DIAS) retornos++;
    }
    const last = current.orders[0];
    return {
      total: list.length,
      abertas: abertas.length,
      mediaDias,
      retornos,
      custo: list.reduce((s, o) => s + osCost(o), 0),
      ultimo: finalizadas.length ? finalizadas[finalizadas.length - 1].finished_at : null,
      modelo: last?.vehicle_model,
      cor: last?.vehicle_color,
      ano: last?.vehicle_year,
      empresa: companyName(last?.company_id ?? null),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, partsByOs, companies]);

  const exportCsv = () => {
    if (!current) return;
    const head = ["OS", "Placa", "Modelo", "Empresa", "Mecanico", "Etapa", "Status", "Abertura", "Finalizacao", "Dias na oficina", "Problema", "Diagnostico", "Encerramento", "Pecas", "Valor"];
    const rows = current.orders.map((o) => [
      o.os_number,
      o.vehicle_plate || "",
      o.vehicle_model || "",
      companyName(o.company_id),
      mechName(o.mechanic_id),
      stageInfo(o.stage).label,
      o.status,
      fmtDate(o.opened_at),
      fmtDate(o.finished_at),
      daysInWorkshop(o.opened_at, o.finished_at),
      (o.description || "").replace(/[\r\n;]/g, " "),
      (o.diagnosis || "").replace(/[\r\n;]/g, " "),
      (o.closure_summary || "").replace(/[\r\n;]/g, " "),
      (partsByOs[o.id] || []).map((p) => `${p.part_name} x${p.quantity}`).join(" | "),
      osCost(o).toFixed(2).replace(".", ","),
    ]);
    const csv = "\uFEFF" + [head, ...rows].map((r) => r.join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `historico_${current.plate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <OficinaNav />
      <div className="p-4 md:p-6 max-w-[1100px] mx-auto space-y-4">
        <section className="bg-card border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <History className="h-4 w-4 text-muted-foreground" /> Histórico de manutenção por placa
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label className="text-xs text-muted-foreground">Placa</label>
              <div className="flex gap-2">
                <Input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && doSearch()}
                  placeholder="Ex.: ABC1D23"
                  className="uppercase"
                />
                <Button onClick={doSearch} disabled={loading}>
                  <Search className="h-4 w-4 mr-1" /> Buscar
                </Button>
              </div>
            </div>
            <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
          </div>
          <p className="text-xs text-muted-foreground">
            {loading ? "Carregando..." : `${groups.length} placa(s) · ${orders.length} OS no período`}
          </p>
        </section>

        <div className="grid md:grid-cols-[280px_1fr] gap-4">
          {/* Lista de placas */}
          <section className="bg-card border rounded-xl p-3 h-fit max-h-[70vh] overflow-auto">
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground p-2">Nenhuma placa encontrada.</p>
            ) : (
              <div className="space-y-1">
                {groups.map((g) => (
                  <button
                    key={g.plate}
                    onClick={() => { setSelected(g.plate); setOpenOs(null); }}
                    className={cn(
                      "w-full text-left rounded-lg px-3 py-2 hover:bg-accent/60 transition flex items-center gap-2",
                      selected === g.plate && "bg-accent"
                    )}
                  >
                    <Bike className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm">{g.plate}</div>
                      <div className="text-xs text-muted-foreground truncate">{g.orders[0]?.vehicle_model || "—"}</div>
                    </div>
                    <Badge variant="secondary" className="shrink-0">{g.orders.length}</Badge>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Detalhe */}
          <section className="space-y-4">
            {!current || !resumo ? (
              <div className="bg-card border rounded-xl p-8 text-center text-sm text-muted-foreground">
                Selecione uma placa para ver o histórico completo.
              </div>
            ) : (
              <>
                <div className="bg-card border rounded-xl p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-2xl font-bold">{current.plate}</div>
                      <div className="text-sm text-muted-foreground">
                        {[resumo.modelo, resumo.cor, resumo.ano].filter(Boolean).join(" · ") || "—"} · {resumo.empresa}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={exportCsv}>
                      <Download className="h-4 w-4 mr-1" /> Exportar CSV
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                    <Stat label="Total de OS" value={String(resumo.total)} />
                    <Stat label="OS em aberto" value={String(resumo.abertas)} />
                    <Stat label="Tempo médio" value={`${resumo.mediaDias}d`} />
                    <Stat label="Último serviço" value={fmtDate(resumo.ultimo)} />
                    <Stat label="Custo acumulado" value={fmtMoney(resumo.custo)} />
                    <Stat label={`Retornos (${RETORNO_DIAS}d)`} value={String(resumo.retornos)} />
                  </div>
                </div>

                <div className="bg-card border rounded-xl p-5">
                  <div className="font-semibold mb-3">Linha do tempo</div>
                  <div className="space-y-2">
                    {current.orders.map((o) => {
                      const info = stageInfo(o.stage);
                      const isOpen = openOs === o.id;
                      const parts = partsByOs[o.id] || [];
                      const photos = photosByOs[o.id] || [];
                      return (
                        <div key={o.id} className="border rounded-lg">
                          <button
                            onClick={() => setOpenOs(isOpen ? null : o.id)}
                            className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-accent/40 transition"
                          >
                            {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                            <span className={cn("h-2 w-2 rounded-full shrink-0", info.dot)} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">OS {o.os_number}</span>
                                <span className={cn("text-[11px] rounded-full px-2 py-0.5", info.chip)}>{info.label}</span>
                                <span className="text-xs text-muted-foreground">{o.status}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {fmtDate(o.opened_at)} → {fmtDate(o.finished_at)} · {daysInWorkshop(o.opened_at, o.finished_at)}d ·{" "}
                                {companyName(o.company_id)} · {mechName(o.mechanic_id)}
                              </div>
                            </div>
                            <span className="text-sm font-semibold tabular-nums shrink-0">{fmtMoney(osCost(o))}</span>
                          </button>

                          {isOpen && (
                            <div className="border-t px-3 py-3 space-y-3 text-sm">
                              <Field label="Problema relatado" value={o.description} />
                              <Field label="Diagnóstico" value={o.diagnosis} />
                              <Field label="Resumo de encerramento" value={o.closure_summary} />
                              <div>
                                <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Peças</div>
                                {parts.length === 0 ? (
                                  <p className="text-muted-foreground text-sm">Nenhuma peça registrada.</p>
                                ) : (
                                  <div className="space-y-1">
                                    {parts.map((p) => (
                                      <div key={p.id} className="flex items-center gap-2 text-sm">
                                        <span className="flex-1 truncate">{p.part_name}</span>
                                        <span className="text-muted-foreground tabular-nums">x{p.quantity}</span>
                                        <span className="tabular-nums w-24 text-right">
                                          {fmtMoney(Number(p.quantity || 0) * Number(p.unit_price || 0))}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {photos.length > 0 && (
                                <div>
                                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">Fotos</div>
                                  <div className="flex flex-wrap gap-2">
                                    {photos.map((f) => (
                                      <a key={f.id} href={f.photo_url} target="_blank" rel="noreferrer" title={f.photo_type}>
                                        <img
                                          src={f.photo_url}
                                          alt={`Foto ${f.photo_type} da OS ${o.os_number}`}
                                          loading="lazy"
                                          className="h-20 w-20 object-cover rounded-md border"
                                        />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-lg font-bold leading-none">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground uppercase mb-0.5">{label}</div>
      <p className="whitespace-pre-wrap">{value}</p>
    </div>
  );
}
