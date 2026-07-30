import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, ShoppingCart, Gauge } from "lucide-react";
import OficinaNav from "@/pages/op/OficinaNav";
import { useServiceOrders, useMechanics, type ServiceOrder } from "@/hooks/useOficina";
import { useCompanies } from "@/hooks/useOperacional";
import { cn } from "@/lib/utils";
import {
  STAGES, STAGE_ENTREGUE, stageInfo, DIAS_ALERTA,
  daysInWorkshop, partsSlaRemaining,
} from "@/lib/oficinaStages";

const TERMINAL = "Finalizado";
const TERCEIRIZADA_STAGES = ["desempeno", "pintura"];

function isActive(o: ServiceOrder) {
  return o.stage !== STAGE_ENTREGUE && o.status !== TERMINAL && o.status !== "Cancelada";
}

export default function OpOficinaAcompanhamento() {
  const navigate = useNavigate();
  const { items, partsCountByOs } = useServiceOrders();
  const { items: mechanics } = useMechanics();
  const { items: companies } = useCompanies();

  const mechName = (id: string | null) => mechanics.find(m => m.id === id)?.name || "Sem mecânico";
  const companyName = (id: string | null) => companies.find(c => c.id === id)?.name || "Sem empresa";

  const ativos = useMemo(() => items.filter(isActive), [items]);

  const media = useMemo(() => {
    if (!ativos.length) return 0;
    return Math.round(ativos.reduce((s, o) => s + daysInWorkshop(o.opened_at), 0) / ativos.length);
  }, [ativos]);

  const mediaEntrega = useMemo(() => {
    const done = items.filter(o => !isActive(o) && o.finished_at);
    if (!done.length) return 0;
    return Math.round(done.reduce((s, o) => s + daysInWorkshop(o.opened_at, o.finished_at), 0) / done.length);
  }, [items]);

  const atrasadas = ativos.filter(o => daysInWorkshop(o.opened_at) >= DIAS_ALERTA);
  const slaEstourado = ativos.filter(o => {
    const r = partsSlaRemaining(o.parts_arrived_at);
    return r != null && r < 0;
  });
  const semMecanico = ativos.filter(o => !o.mechanic_id);
  const terceirizada = ativos.filter(o => TERCEIRIZADA_STAGES.includes(o.stage));

  const acionados = ativos.filter(o => o.supervisor_alert);

  const acaoAgora = useMemo(() => {
    const map = new Map<string, { os: ServiceOrder; tag: string; tone: string }>();
    acionados.forEach(o => map.set(o.id, { os: o, tag: o.supervisor_alert_reason || "Supervisor acionado", tone: "bg-amber-100 text-amber-800" }));
    slaEstourado.forEach(o => map.set(o.id, { os: o, tag: "SLA peça estourado", tone: "bg-rose-100 text-rose-700" }));
    atrasadas.forEach(o => { if (!map.has(o.id)) map.set(o.id, { os: o, tag: `${daysInWorkshop(o.opened_at)}d na oficina`, tone: "bg-rose-100 text-rose-700" }); });
    semMecanico.forEach(o => { if (!map.has(o.id)) map.set(o.id, { os: o, tag: "sem mecânico", tone: "bg-amber-100 text-amber-700" }); });
    return Array.from(map.values()).slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acionados, slaEstourado, atrasadas, semMecanico]);

  const porEmpresa = useMemo(() => {
    const m = new Map<string, { name: string; count: number; days: number }>();
    ativos.forEach(o => {
      const key = o.company_id || "none";
      const cur = m.get(key) || { name: companyName(o.company_id), count: 0, days: 0 };
      cur.count += 1;
      cur.days += daysInWorkshop(o.opened_at);
      m.set(key, cur);
    });
    return Array.from(m.values())
      .map(v => ({ ...v, avg: Math.round(v.days / v.count) }))
      .sort((a, b) => b.count - a.count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativos, companies]);

  const filaCompras = ativos.reduce((s, o) => s + (partsCountByOs[o.id] || 0), 0);

  const porEtapa = useMemo(() => {
    return STAGES.map(s => ({ ...s, count: ativos.filter(o => o.stage === s.id).length })).filter(s => s.count > 0);
  }, [ativos]);
  const maxEtapa = Math.max(1, ...porEtapa.map(s => s.count));

  const dotColors = ["bg-blue-500", "bg-orange-500", "bg-emerald-500", "bg-violet-500", "bg-rose-500", "bg-amber-500"];

  return (
    <>
      <OficinaNav />
      <div className="p-4 md:p-6 max-w-[900px] mx-auto space-y-4">
        {/* Tempo médio */}
        <section className="bg-card border rounded-xl p-5">
          <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-1">
            Tempo médio na oficina
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold text-emerald-600">{media}</span>
            <span className="text-sm text-muted-foreground">dias · meta: o menor possível</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {ativos.length} moto(s) na oficina · média de entrega {mediaEntrega}d
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <MiniStat value={atrasadas.length} label={`Atrasadas / ${DIAS_ALERTA}+ dias`} tone="rose" />
            <MiniStat value={slaEstourado.length} label="SLA de peça estourado" tone="rose" />
            <MiniStat value={semMecanico.length} label="Sem mecânico" tone="amber" />
            <MiniStat value={terceirizada.length} label="Na terceirizada" tone="violet" />
            <MiniStat value={acionados.length} label="Supervisor acionado" tone="amber" />
          </div>
        </section>

        {/* Ação agora */}
        <section className="bg-card border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 text-rose-600" /> Ação agora
            </div>
            <span className="text-xs text-muted-foreground">{acaoAgora.length} moto(s)</span>
          </div>
          {acaoAgora.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma pendência crítica no momento.</p>
          ) : (
            <div className="space-y-2">
              {acaoAgora.map(({ os, tag, tone }) => (
                <button
                  key={os.id}
                  onClick={() => navigate("/op/oficina")}
                  className="w-full text-left border rounded-lg px-3 py-2.5 flex items-center gap-3 hover:bg-accent/50 transition"
                >
                  <span className={cn("text-[11px] font-medium rounded-full px-2 py-1 shrink-0", tone)}>{tag}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{os.vehicle_plate || `OS ${os.os_number}`}</span>
                      <span className="text-[11px] rounded border px-1.5 py-0.5 text-muted-foreground">
                        {companyName(os.company_id)}
                      </span>
                      <span className="text-sm text-muted-foreground truncate">{os.vehicle_model || "—"}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {stageInfo(os.stage).label} · {mechName(os.mechanic_id)}
                    </div>
                    {os.supervisor_alert && os.supervisor_alert_note && (
                      <div className="text-xs text-amber-800 mt-1 line-clamp-2">{os.supervisor_alert_note}</div>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Por empresa */}
        <section className="bg-card border rounded-xl p-5">
          <div className="font-semibold mb-3">Por empresa</div>
          {porEmpresa.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem motos ativas.</p>
          ) : (
            <div className="space-y-2">
              {porEmpresa.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3 text-sm">
                  <span className={cn("h-2 w-2 rounded-full", dotColors[i % dotColors.length])} />
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="font-semibold tabular-nums">{c.count}</span>
                  <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">{c.avg}d</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Fila de compras */}
        <section className="bg-card border rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <ShoppingCart className="h-4 w-4 text-orange-600" /> Fila de compras
            </div>
            <span className="text-2xl font-bold tabular-nums">{filaCompras}</span>
          </div>
          <button
            onClick={() => navigate("/op/oficina/compras")}
            className="mt-2 text-sm text-orange-600 font-medium inline-flex items-center gap-1 hover:underline"
          >
            Abrir tela de compras <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </section>

        {/* Onde estão as motos */}
        <section className="bg-card border rounded-xl p-5">
          <div className="flex items-center gap-2 font-semibold mb-3">
            <Gauge className="h-4 w-4 text-muted-foreground" /> Onde estão as motos
          </div>
          {porEtapa.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem motos ativas.</p>
          ) : (
            <div className="space-y-2">
              {porEtapa.map(s => (
                <div key={s.id} className="flex items-center gap-3 text-sm">
                  <span className="w-36 shrink-0 truncate text-muted-foreground">{s.label}</span>
                  <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full rounded-full", s.bar)} style={{ width: `${(s.count / maxEtapa) * 100}%` }} />
                  </div>
                  <span className="font-semibold tabular-nums w-6 text-right">{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function MiniStat({ value, label, tone }: { value: number; label: string; tone: "rose" | "amber" | "violet" }) {
  const tones = {
    rose: "border-rose-200 bg-rose-50/60 text-rose-600",
    amber: "border-amber-200 bg-amber-50/60 text-amber-600",
    violet: "border-violet-200 bg-violet-50/60 text-violet-600",
  } as const;
  return (
    <div className={cn("rounded-lg border p-3", tones[tone])}>
      <div className="text-2xl font-bold leading-none">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-1 leading-tight">{label}</div>
    </div>
  );
}
