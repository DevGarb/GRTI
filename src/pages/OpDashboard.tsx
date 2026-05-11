import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Wrench, Truck, HardHat, AlertTriangle, CheckCircle2, Clock, Activity } from "lucide-react";
import MonthSelector, { getCurrentMonthValue, getMonthDateRange } from "@/components/MonthSelector";
import { useServiceOrders } from "@/hooks/useOficina";
import { useMaintenanceOrders } from "@/hooks/useManutencao";
import { useDeliveries } from "@/hooks/useDeliveries";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const anim = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3 } }),
};

const COLORS = {
  Aberta: "hsl(38 92% 50%)",
  "Em execução": "hsl(217 91% 60%)",
  Pendente: "hsl(38 92% 50%)",
  "Em rota": "hsl(217 91% 60%)",
  Entregue: "hsl(142 71% 45%)",
  Concluída: "hsl(142 71% 45%)",
  Cancelada: "hsl(0 84% 60%)",
  "Não entregue": "hsl(0 84% 60%)",
};

function pickColor(s: string) {
  return (COLORS as any)[s] || "hsl(215 16% 47%)";
}

function statusGroup(s: string): "abertas" | "andamento" | "concluidas" | "canceladas" {
  if (["Aberta", "Pendente"].includes(s)) return "abertas";
  if (["Em execução", "Em rota"].includes(s)) return "andamento";
  if (["Concluída", "Entregue"].includes(s)) return "concluidas";
  return "canceladas";
}

function isOverdue(deadline: string | null | undefined, status: string) {
  if (!deadline) return false;
  if (["Concluída", "Entregue", "Cancelada", "Não entregue"].includes(status)) return false;
  return new Date(deadline) < new Date(new Date().toISOString().slice(0, 10));
}

export default function OpDashboard() {
  const so = useServiceOrders();
  const mo = useMaintenanceOrders();
  const dl = useDeliveries();
  const [month, setMonth] = useState(getCurrentMonthValue());
  const { from, to } = getMonthDateRange(month);

  const inRange = (iso: string) => {
    const d = new Date(iso);
    return d >= from && d <= to;
  };

  const osP = useMemo(() => so.items.filter(o => inRange(o.opened_at)), [so.items, month]);
  const omP = useMemo(() => mo.items.filter(o => inRange(o.opened_at)), [mo.items, month]);
  const dlP = useMemo(() => dl.items.filter(o => inRange(o.scheduled_date)), [dl.items, month]);

  const stats = (list: any[], dateField: "opened_at" | "scheduled_date") => {
    const total = list.length;
    let abertas = 0, andamento = 0, concluidas = 0, canceladas = 0, atrasadas = 0;
    for (const it of list) {
      const g = statusGroup(it.status);
      if (g === "abertas") abertas++;
      else if (g === "andamento") andamento++;
      else if (g === "concluidas") concluidas++;
      else canceladas++;
      const deadline = (it as any).deadline ?? (dateField === "scheduled_date" ? it.scheduled_date : null);
      if (isOverdue(deadline, it.status)) atrasadas++;
    }
    return { total, abertas, andamento, concluidas, canceladas, atrasadas };
  };

  const osS = useMemo(() => stats(osP, "opened_at"), [osP]);
  const omS = useMemo(() => stats(omP, "opened_at"), [omP]);
  const dlS = useMemo(() => stats(dlP, "scheduled_date"), [dlP]);

  const totalAll = osS.total + omS.total + dlS.total;
  const concAll = osS.concluidas + omS.concluidas + dlS.concluidas;
  const atrAll = osS.atrasadas + omS.atrasadas + dlS.atrasadas;
  const andAll = osS.andamento + omS.andamento + dlS.andamento + osS.abertas + omS.abertas + dlS.abertas;

  // Daily activity (created per day in month)
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

  // Status distribution by module
  const statusPie = (list: any[]) => {
    const m: Record<string, number> = {};
    list.forEach(i => { m[i.status] = (m[i.status] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  };

  const loading = so.loading || mo.loading || dl.loading;

  const Kpi = ({ icon: Icon, label, value, accent, sub }: any) => (
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

  const ModuleCard = ({ title, icon: Icon, color, data, list }: any) => (
    <motion.div variants={anim} initial="hidden" animate="show" className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          <h3 className="font-semibold">{title}</h3>
        </div>
        <span className="text-2xl font-bold">{data.total}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs mb-4">
        <div className="rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 px-2 py-1.5 flex justify-between">
          <span>Abertas</span><b>{data.abertas}</b>
        </div>
        <div className="rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 px-2 py-1.5 flex justify-between">
          <span>Em andamento</span><b>{data.andamento}</b>
        </div>
        <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 px-2 py-1.5 flex justify-between">
          <span>Concluídas</span><b>{data.concluidas}</b>
        </div>
        <div className="rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 px-2 py-1.5 flex justify-between">
          <span>Atrasadas</span><b>{data.atrasadas}</b>
        </div>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={statusPie(list)} dataKey="value" nameKey="name" innerRadius={32} outerRadius={56} paddingAngle={2}>
              {statusPie(list).map((e, i) => (
                <Cell key={i} fill={pickColor(e.name)} />
              ))}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Painel Operacional
          </h1>
          <p className="text-sm text-muted-foreground">Acompanhamento consolidado de OS, OM e Entregas.</p>
        </div>
        <MonthSelector value={month} onChange={setMonth} />
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={Activity} label="Demandas no período" value={totalAll} accent="bg-primary" sub="OS + OM + Entregas" />
        <Kpi icon={Clock} label="Em aberto / andamento" value={andAll} accent="bg-blue-500" sub="Aguardando finalização" />
        <Kpi icon={CheckCircle2} label="Concluídas" value={concAll} accent="bg-emerald-600" sub={totalAll ? `${Math.round((concAll / totalAll) * 100)}% do total` : "—"} />
        <Kpi icon={AlertTriangle} label="Atrasadas" value={atrAll} accent="bg-rose-500" sub="Prazo vencido e não finalizadas" />
      </div>

      {/* Per module */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ModuleCard title="Oficina (OS)" icon={Wrench} color="bg-blue-600" data={osS} list={osP} />
        <ModuleCard title="Manutenção Predial (OM)" icon={HardHat} color="bg-amber-600" data={omS} list={omP} />
        <ModuleCard title="Entregas" icon={Truck} color="bg-emerald-600" data={dlS} list={dlP} />
      </div>

      {/* Daily activity */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold mb-3">Volume diário no período</h3>
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
      </div>

      {/* Overdue list */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-500" />
          Demandas atrasadas ({atrAll})
        </h3>
        {atrAll === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">Nenhuma demanda atrasada no período. 🎉</div>
        ) : (
          <div className="divide-y divide-border">
            {[
              ...osP.filter(o => isOverdue((o as any).deadline, o.status)).map(o => ({
                tipo: "OS", numero: o.os_number, titulo: o.description || o.vehicle_plate || "—", prazo: (o as any).deadline, status: o.status,
              })),
              ...omP.filter(o => isOverdue(o.deadline, o.status)).map(o => ({
                tipo: "OM", numero: o.om_number, titulo: o.title, prazo: o.deadline, status: o.status,
              })),
              ...dlP.filter(o => isOverdue(o.scheduled_date, o.status)).map(o => ({
                tipo: "Entrega", numero: "—", titulo: o.associated_name || o.address || "—", prazo: o.scheduled_date, status: o.status,
              })),
            ]
              .sort((a, b) => (a.prazo || "").localeCompare(b.prazo || ""))
              .slice(0, 20)
              .map((r, i) => (
                <div key={i} className="py-2 flex items-center gap-3 text-sm">
                  <span className="inline-flex w-16 justify-center text-[10px] font-bold uppercase rounded bg-muted px-1.5 py-0.5">
                    {r.tipo}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground w-14">#{r.numero}</span>
                  <span className="flex-1 truncate">{r.titulo}</span>
                  <span className="text-xs text-muted-foreground">{r.status}</span>
                  <span className="text-xs text-rose-600 font-medium">
                    {r.prazo ? new Date(r.prazo).toLocaleDateString("pt-BR") : "—"}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      {loading && <div className="text-center text-xs text-muted-foreground">Carregando dados...</div>}
    </div>
  );
}
