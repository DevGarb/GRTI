import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Wrench, Truck, HardHat, AlertTriangle, CheckCircle2, Clock, Activity,
  DollarSign, Calendar, ClipboardCheck, MapPin, Package,
} from "lucide-react";
import MonthSelector, { getCurrentMonthValue, getMonthDateRange } from "@/components/MonthSelector";
import { useServiceOrders, useMechanics } from "@/hooks/useOficina";
import { useMaintenanceOrders, useSites, useChecklistTemplates } from "@/hooks/useManutencao";
import { useDeliveries } from "@/hooks/useDeliveries";
import { useDrivers } from "@/hooks/useOperacional";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { formatDateBR } from "@/lib/dateFormat";

const anim = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3 } }),
};

const STATUS_COLOR: Record<string, string> = {
  // OS
  "Pendente": "hsl(38 92% 50%)",
  "Aguardando peças": "hsl(280 70% 55%)",
  "Em andamento": "hsl(217 91% 60%)",
  "Finalizado": "hsl(142 71% 45%)",
  "Cancelada": "hsl(0 84% 60%)",
  // OM
  "Aberta": "hsl(38 92% 50%)",
  "Em execução": "hsl(217 91% 60%)",
  "Concluída": "hsl(142 71% 45%)",
  // Entregas
  "Em rota": "hsl(217 91% 60%)",
  "Cancelado": "hsl(0 84% 60%)",
};
const pickColor = (s: string) => STATUS_COLOR[s] || "hsl(215 16% 47%)";

const FINAL_STATUSES = new Set(["Finalizado", "Concluída", "Cancelada", "Cancelado"]);
const OPEN_STATUSES = new Set(["Aberta", "Pendente"]);
const PROGRESS_STATUSES = new Set(["Em andamento", "Em execução", "Em rota", "Aguardando peças"]);

function isOverdue(deadline: string | null | undefined, status: string) {
  if (!deadline) return false;
  if (FINAL_STATUSES.has(status)) return false;
  return deadline < new Date().toISOString().slice(0, 10);
}

function fmtMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface KpiCardProps {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
}
const Kpi = ({ icon: Icon, label, value, sub, accent }: KpiCardProps) => (
  <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
    <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${accent}`}>
      <Icon className="h-5 w-5 text-white" />
    </div>
    <div className="min-w-0">
      <div className="text-xs text-muted-foreground truncate">{label}</div>
      <div className="text-2xl font-bold leading-tight">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground truncate">{sub}</div>}
    </div>
  </div>
);

interface PartUsage { name: string; qty: number; cost: number; }
interface ChecklistAgg { perSite: { name: string; value: number }[]; perTemplate: { name: string; value: number }[]; coverage: number; }

export default function DashboardOperacional() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id;

  const [month, setMonth] = useState(getCurrentMonthValue());
  const { from, to } = getMonthDateRange(month);

  const so = useServiceOrders();
  const mo = useMaintenanceOrders();
  const dl = useDeliveries();
  const { items: mechanics } = useMechanics();
  const { items: sites } = useSites();
  const { items: drivers } = useDrivers();
  const { items: templates } = useChecklistTemplates();

  const [mechFilter, setMechFilter] = useState<string>("all");
  const [siteFilter, setSiteFilter] = useState<string>("all");
  const [driverFilter, setDriverFilter] = useState<string>("all");

  const inRange = (iso: string) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d >= from && d <= to;
  };

  // ===== Filtered datasets =====
  const osP = useMemo(() => so.items.filter(o => inRange(o.opened_at) && (mechFilter === "all" || o.mechanic_id === mechFilter)), [so.items, month, mechFilter]);
  const omP = useMemo(() => mo.items.filter(o => inRange(o.opened_at) && (siteFilter === "all" || o.site_id === siteFilter)), [mo.items, month, siteFilter]);
  const dlP = useMemo(() => dl.items.filter(o => inRange(o.scheduled_date) && (driverFilter === "all" || o.driver_id === driverFilter)), [dl.items, month, driverFilter]);

  // ===== Macro KPIs =====
  const macro = useMemo(() => {
    const all = [
      ...osP.map(o => ({ status: o.status, deadline: (o as any).deadline ?? null, opened_at: o.opened_at, finished_at: o.finished_at })),
      ...omP.map(o => ({ status: o.status, deadline: o.deadline, opened_at: o.opened_at, finished_at: o.finished_at })),
      ...dlP.map(o => ({ status: o.status, deadline: o.scheduled_date, opened_at: o.scheduled_date, finished_at: FINAL_STATUSES.has(o.status) ? o.scheduled_date : null })),
    ];
    let abertas = 0, andamento = 0, concluidas = 0, atrasadas = 0, noPrazo = 0, comPrazo = 0;
    let execDays = 0, execCount = 0;
    for (const r of all) {
      if (OPEN_STATUSES.has(r.status)) abertas++;
      else if (PROGRESS_STATUSES.has(r.status)) andamento++;
      else if (["Finalizado", "Concluída"].includes(r.status)) {
        concluidas++;
        if (r.opened_at && r.finished_at) {
          const ms = +new Date(r.finished_at) - +new Date(r.opened_at);
          execDays += Math.max(0, ms / 86400000);
          execCount++;
        }
        if (r.deadline) {
          comPrazo++;
          if (r.finished_at && r.finished_at <= r.deadline) noPrazo++;
        }
      }
      if (isOverdue(r.deadline, r.status)) atrasadas++;
    }
    return {
      total: all.length,
      abertas, andamento, concluidas, atrasadas,
      pctConcl: all.length ? Math.round((concluidas / all.length) * 100) : 0,
      execAvgDays: execCount ? execDays / execCount : 0,
      cumprimento: comPrazo ? Math.round((noPrazo / comPrazo) * 100) : 0,
    };
  }, [osP, omP, dlP]);

  // ===== Oficina (OS) =====
  const osCost = useMemo(() => osP.reduce((s, o) => s + Number(o.total_cost || 0), 0), [osP]);
  const osAvgCost = osP.length ? osCost / osP.length : 0;

  const osByMechanic = useMemo(() => {
    const map = new Map<string, { total: number; finalizadas: number; atrasadas: number }>();
    for (const o of osP) {
      const name = mechanics.find(m => m.id === o.mechanic_id)?.name || "Sem mecânico";
      const cur = map.get(name) || { total: 0, finalizadas: 0, atrasadas: 0 };
      cur.total++;
      if (o.status === "Finalizado") cur.finalizadas++;
      if (isOverdue((o as any).deadline, o.status)) cur.atrasadas++;
      map.set(name, cur);
    }
    return [...map.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total);
  }, [osP, mechanics]);

  const osStatusDist = useMemo(() => statusDist(osP.map(o => o.status)), [osP]);

  // Peças mais usadas (query separada — depende de orgId + range)
  const [parts, setParts] = useState<PartUsage[]>([]);
  useEffect(() => {
    if (!orgId || osP.length === 0) { setParts([]); return; }
    const ids = osP.map(o => o.id);
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("op_service_order_parts")
        .select("part_name, quantity, unit_price, service_order_id")
        .in("service_order_id", ids);
      if (cancelled) return;
      const m = new Map<string, PartUsage>();
      for (const r of (data || []) as any[]) {
        const cur = m.get(r.part_name) || { name: r.part_name, qty: 0, cost: 0 };
        cur.qty += Number(r.quantity || 0);
        cur.cost += Number(r.quantity || 0) * Number(r.unit_price || 0);
        m.set(r.part_name, cur);
      }
      setParts([...m.values()].sort((a, b) => b.qty - a.qty).slice(0, 10));
    })();
    return () => { cancelled = true; };
  }, [orgId, month, mechFilter, osP.length]);

  // ===== Manutenção (OM) =====
  const omBySite = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of omP) {
      const name = sites.find(s => s.id === o.site_id)?.name || "Sem sede";
      map.set(name, (map.get(name) || 0) + 1);
    }
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [omP, sites]);

  const omByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of omP) map.set(o.category, (map.get(o.category) || 0) + 1);
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [omP]);

  const omByPriority = useMemo(() => {
    const order = ["Baixa", "Média", "Alta", "Urgente"];
    const map = new Map<string, number>();
    for (const o of omP) map.set(o.priority, (map.get(o.priority) || 0) + 1);
    return order.map(name => ({ name, value: map.get(name) || 0 }));
  }, [omP]);

  const omStatusDist = useMemo(() => statusDist(omP.map(o => o.status)), [omP]);

  // ===== Entregas =====
  const dlByDriver = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of dlP) {
      const name = drivers.find(x => x.id === d.driver_id)?.name || "Sem motorista";
      map.set(name, (map.get(name) || 0) + 1);
    }
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [dlP, drivers]);

  const dlByType = useMemo(() => {
    const order = ["Entrega", "Vistoria", "Retirada", "Outro"];
    const map = new Map<string, number>();
    for (const d of dlP) map.set(d.type, (map.get(d.type) || 0) + 1);
    return order.map(name => ({ name, value: map.get(name) || 0 }));
  }, [dlP]);

  const dlByPeriod = useMemo(() => {
    const order = ["Manhã", "Tarde", "Noite"];
    const map = new Map<string, number>();
    for (const d of dlP) map.set(d.period, (map.get(d.period) || 0) + 1);
    return order.map(name => ({ name, value: map.get(name) || 0 }));
  }, [dlP]);

  const dlStatusDist = useMemo(() => statusDist(dlP.map(o => o.status)), [dlP]);

  // ===== Checklists =====
  const [checklist, setChecklist] = useState<ChecklistAgg>({ perSite: [], perTemplate: [], coverage: 0 });
  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("op_checklist_executions")
        .select("template_id, site_id, executed_at")
        .eq("organization_id", orgId)
        .gte("executed_at", from.toISOString().slice(0, 10))
        .lte("executed_at", to.toISOString().slice(0, 10));
      if (cancelled) return;
      const perSiteMap = new Map<string, number>();
      const perTplMap = new Map<string, number>();
      const tplUsed = new Set<string>();
      for (const r of (data || []) as any[]) {
        const siteName = sites.find(s => s.id === r.site_id)?.name || "Sem sede";
        perSiteMap.set(siteName, (perSiteMap.get(siteName) || 0) + 1);
        const tplName = templates.find(t => t.id === r.template_id)?.name || "Sem modelo";
        perTplMap.set(tplName, (perTplMap.get(tplName) || 0) + 1);
        tplUsed.add(r.template_id);
      }
      const activeTpl = templates.filter(t => t.is_active).length;
      setChecklist({
        perSite: [...perSiteMap.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
        perTemplate: [...perTplMap.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8),
        coverage: activeTpl ? Math.round((tplUsed.size / activeTpl) * 100) : 0,
      });
    })();
    return () => { cancelled = true; };
  }, [orgId, month, sites, templates]);

  // ===== Daily volume =====
  const daily = useMemo(() => {
    const map: Record<string, { date: string; OS: number; OM: number; Entregas: number }> = {};
    const cursor = new Date(from);
    while (cursor <= to) {
      const d = cursor.toISOString().slice(0, 10);
      map[d] = { date: d.slice(8, 10), OS: 0, OM: 0, Entregas: 0 };
      cursor.setDate(cursor.getDate() + 1);
    }
    osP.forEach(o => { const k = o.opened_at.slice(0, 10); if (map[k]) map[k].OS++; });
    omP.forEach(o => { const k = o.opened_at.slice(0, 10); if (map[k]) map[k].OM++; });
    dlP.forEach(o => { const k = o.scheduled_date.slice(0, 10); if (map[k]) map[k].Entregas++; });
    return Object.values(map);
  }, [osP, omP, dlP, month]);

  const overdueList = useMemo(() => {
    return [
      ...osP.filter(o => isOverdue((o as any).deadline, o.status)).map(o => ({
        tipo: "OS", numero: String(o.os_number), titulo: o.description || o.vehicle_plate || "—",
        prazo: (o as any).deadline as string, status: o.status,
      })),
      ...omP.filter(o => isOverdue(o.deadline, o.status)).map(o => ({
        tipo: "OM", numero: String(o.om_number), titulo: o.title, prazo: o.deadline!, status: o.status,
      })),
      ...dlP.filter(o => isOverdue(o.scheduled_date, o.status)).map(o => ({
        tipo: "Entrega", numero: "—", titulo: o.associated_name || o.address || "—",
        prazo: o.scheduled_date, status: o.status,
      })),
    ].sort((a, b) => (a.prazo || "").localeCompare(b.prazo || "")).slice(0, 20);
  }, [osP, omP, dlP]);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Painel Operacional
          </h1>
          <p className="text-sm text-muted-foreground">Acompanhamento de OS, OM, Entregas e Checklists.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={mechFilter} onValueChange={setMechFilter}>
            <SelectTrigger className="h-9 w-[170px] text-xs"><SelectValue placeholder="Mecânico" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os mecânicos</SelectItem>
              {mechanics.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger className="h-9 w-[170px] text-xs"><SelectValue placeholder="Sede" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as sedes</SelectItem>
              {sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={driverFilter} onValueChange={setDriverFilter}>
            <SelectTrigger className="h-9 w-[170px] text-xs"><SelectValue placeholder="Motorista" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os motoristas</SelectItem>
              {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <MonthSelector value={month} onChange={setMonth} />
        </div>
      </div>

      {/* Macro KPIs */}
      <motion.div variants={anim} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Kpi icon={Activity} label="Total" value={macro.total} sub="OS+OM+Entregas" accent="bg-primary" />
        <Kpi icon={Clock} label="Em aberto" value={macro.abertas} sub="Aguardando início" accent="bg-amber-500" />
        <Kpi icon={Activity} label="Em andamento" value={macro.andamento} sub="Execução em curso" accent="bg-blue-500" />
        <Kpi icon={CheckCircle2} label="Concluídas" value={macro.concluidas} sub={`${macro.pctConcl}% do total`} accent="bg-emerald-600" />
        <Kpi icon={AlertTriangle} label="Atrasadas" value={macro.atrasadas} sub="Prazo vencido" accent="bg-rose-500" />
        <Kpi icon={Calendar} label="Tempo médio" value={macro.execAvgDays.toFixed(1) + "d"} sub="Da abertura ao fim" accent="bg-indigo-500" />
        <Kpi icon={CheckCircle2} label="No prazo" value={macro.cumprimento + "%"} sub="Concluídas no deadline" accent="bg-teal-600" />
      </motion.div>

      {/* Oficina */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <header className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><Wrench className="h-4 w-4 text-blue-600" /> Oficina (OS)</h2>
          <div className="text-xs text-muted-foreground">{osP.length} OS no período</div>
        </header>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi icon={DollarSign} label="Custo total" value={fmtMoney(osCost)} accent="bg-emerald-600" />
          <Kpi icon={DollarSign} label="Custo médio/OS" value={fmtMoney(osAvgCost)} accent="bg-emerald-500" />
          <Kpi icon={Wrench} label="Finalizadas" value={osP.filter(o => o.status === "Finalizado").length} accent="bg-blue-600" />
          <Kpi icon={AlertTriangle} label="Atrasadas" value={osP.filter(o => isOverdue((o as any).deadline, o.status)).length} accent="bg-rose-500" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard title="Status">
            <BarsChart data={osStatusDist} colorMap={STATUS_COLOR} />
          </ChartCard>
          <ChartCard title="OS por mecânico" className="lg:col-span-2">
            <RankingTable
              rows={osByMechanic.slice(0, 10).map(r => [r.name, String(r.total), String(r.finalizadas), String(r.atrasadas)])}
              header={["Mecânico", "Total", "Finalizadas", "Atrasadas"]}
            />
          </ChartCard>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Top peças usadas">
            {parts.length === 0 ? <EmptyHint label="Sem registros de peças no período." /> : (
              <RankingTable
                rows={parts.map(p => [p.name, p.qty.toFixed(0), fmtMoney(p.cost)])}
                header={["Peça", "Qtd", "Valor"]}
              />
            )}
          </ChartCard>
          <ChartCard title="OS atrasadas">
            <OverdueRows rows={overdueList.filter(r => r.tipo === "OS")} />
          </ChartCard>
        </div>
      </section>

      {/* Manutenção */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <header className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><HardHat className="h-4 w-4 text-amber-600" /> Manutenção Predial (OM)</h2>
          <div className="text-xs text-muted-foreground">{omP.length} OM no período</div>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Status"><BarsChart data={omStatusDist} colorMap={STATUS_COLOR} /></ChartCard>
          <ChartCard title="OM por sede">
            {omBySite.length === 0 ? <EmptyHint label="Sem OM no período." /> : <BarsChart data={omBySite} colorFor={() => "hsl(38 92% 50%)"} />}
          </ChartCard>
          <ChartCard title="Categoria"><PieDist data={omByCategory} /></ChartCard>
          <ChartCard title="Prioridade">
            <BarsChart data={omByPriority} colorFor={(n) => n === "Urgente" ? "hsl(0 84% 60%)" : n === "Alta" ? "hsl(20 90% 55%)" : n === "Média" ? "hsl(38 92% 50%)" : "hsl(217 91% 60%)"} />
          </ChartCard>
        </div>
        <ChartCard title="OM atrasadas">
          <OverdueRows rows={overdueList.filter(r => r.tipo === "OM")} />
        </ChartCard>
      </section>

      {/* Entregas */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <header className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><Truck className="h-4 w-4 text-emerald-600" /> Entregas</h2>
          <div className="text-xs text-muted-foreground">{dlP.length} entregas no período</div>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Status"><BarsChart data={dlStatusDist} colorMap={STATUS_COLOR} /></ChartCard>
          <ChartCard title="Entregas por motorista">
            {dlByDriver.length === 0 ? <EmptyHint label="Sem entregas no período." /> : <BarsChart data={dlByDriver} colorFor={() => "hsl(142 71% 45%)"} />}
          </ChartCard>
          <ChartCard title="Por tipo"><PieDist data={dlByType} /></ChartCard>
          <ChartCard title="Por período"><BarsChart data={dlByPeriod} colorFor={(n) => n === "Manhã" ? "hsl(48 95% 55%)" : n === "Tarde" ? "hsl(28 90% 55%)" : "hsl(240 50% 50%)"} /></ChartCard>
        </div>
        <ChartCard title="Entregas atrasadas">
          <OverdueRows rows={overdueList.filter(r => r.tipo === "Entrega")} />
        </ChartCard>
      </section>

      {/* Checklists */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <header className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-teal-600" /> Checklists</h2>
          <div className="text-xs text-muted-foreground">Cobertura: {checklist.coverage}% dos modelos ativos</div>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Execuções por sede">
            {checklist.perSite.length === 0 ? <EmptyHint label="Sem execuções no período." /> : <BarsChart data={checklist.perSite} colorFor={() => "hsl(178 70% 40%)"} />}
          </ChartCard>
          <ChartCard title="Execuções por modelo">
            {checklist.perTemplate.length === 0 ? <EmptyHint label="Sem execuções no período." /> : (
              <RankingTable rows={checklist.perTemplate.map(t => [t.name, String(t.value)])} header={["Modelo", "Execuções"]} />
            )}
          </ChartCard>
        </div>
      </section>

      {/* Daily volume */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold mb-3">Volume diário no período</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="OS" stackId="a" fill="hsl(217 91% 60%)" />
              <Bar dataKey="OM" stackId="a" fill="hsl(38 92% 50%)" />
              <Bar dataKey="Entregas" stackId="a" fill="hsl(142 71% 45%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

// ===== Helpers / Subcomponents =====
function statusDist(list: string[]) {
  const m = new Map<string, number>();
  list.forEach(s => m.set(s, (m.get(s) || 0) + 1));
  return [...m.entries()].map(([name, value]) => ({ name, value }));
}

function ChartCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-border bg-background/40 p-4 ${className}`}>
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}

function EmptyHint({ label }: { label: string }) {
  return <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">{label}</div>;
}

function BarsChart({ data, colorMap, colorFor }: { data: { name: string; value: number }[]; colorMap?: Record<string, string>; colorFor?: (name: string) => string }) {
  if (!data || data.length === 0) return <EmptyHint label="Sem dados." />;
  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((e, i) => (
              <Cell key={i} fill={colorMap?.[e.name] || colorFor?.(e.name) || "hsl(217 91% 60%)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PieDist({ data }: { data: { name: string; value: number }[] }) {
  const filtered = data.filter(d => d.value > 0);
  if (filtered.length === 0) return <EmptyHint label="Sem dados." />;
  const palette = ["hsl(217 91% 60%)", "hsl(38 92% 50%)", "hsl(142 71% 45%)", "hsl(280 70% 55%)", "hsl(0 84% 60%)", "hsl(178 70% 40%)"];
  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={filtered} dataKey="value" nameKey="name" innerRadius={32} outerRadius={58} paddingAngle={2}>
            {filtered.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
          </Pie>
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function RankingTable({ rows, header }: { rows: string[][]; header: string[] }) {
  if (rows.length === 0) return <EmptyHint label="Sem dados." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            {header.map((h, i) => (
              <th key={h} className={`px-2 py-1.5 font-semibold text-muted-foreground ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/60 last:border-0">
              {r.map((cell, j) => (
                <td key={j} className={`px-2 py-1.5 ${j === 0 ? "text-left font-medium" : "text-right"}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OverdueRows({ rows }: { rows: { tipo: string; numero: string; titulo: string; prazo: string; status: string }[] }) {
  if (rows.length === 0) return <div className="text-xs text-muted-foreground py-4 text-center">Nenhum item atrasado 🎉</div>;
  return (
    <div className="divide-y divide-border">
      {rows.map((r, i) => (
        <div key={i} className="py-2 flex items-center gap-3 text-xs">
          <span className="inline-flex w-14 justify-center text-[10px] font-bold uppercase rounded bg-muted px-1.5 py-0.5">{r.tipo}</span>
          <span className="font-mono text-muted-foreground w-12">#{r.numero}</span>
          <span className="flex-1 truncate">{r.titulo}</span>
          <span className="text-muted-foreground hidden sm:block">{r.status}</span>
          <span className="text-rose-600 font-medium">{r.prazo ? formatDateBR(r.prazo) : "—"}</span>
        </div>
      ))}
    </div>
  );
}
