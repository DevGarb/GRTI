import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";
import { CheckCircle2, XCircle, TrendingUp, Calendar } from "lucide-react";
import type { Preventiva } from "@/hooks/usePreventivas";

interface Props {
  preventivas: Preventiva[];
  monthLabel: string;
  year: number;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(160, 60%, 45%)",
  "hsl(30, 80%, 55%)",
  "hsl(270, 50%, 55%)",
];

export default function MonthlyReport({ preventivas, monthLabel, year }: Props) {
  const { byType, byTechnician, byDay, completionRate, checklistStats } = useMemo(() => {
    // By equipment type
    const typeMap = new Map<string, number>();
    preventivas.forEach((p) => {
      typeMap.set(p.equipment_type, (typeMap.get(p.equipment_type) || 0) + 1);
    });
    const byType = [...typeMap.entries()].map(([name, value]) => ({ name, value }));

    // By technician
    const techMap = new Map<string, number>();
    preventivas.forEach((p) => {
      const name = p.creatorName || "Desconhecido";
      techMap.set(name, (techMap.get(name) || 0) + 1);
    });
    const byTechnician = [...techMap.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    // By day of month
    const dayMap = new Map<number, number>();
    preventivas.forEach((p) => {
      const day = new Date(p.execution_date).getDate();
      dayMap.set(day, (dayMap.get(day) || 0) + 1);
    });
    const byDay = [...dayMap.entries()]
      .map(([day, count]) => ({ day: `${day}`, count }))
      .sort((a, b) => Number(a.day) - Number(b.day));

    // Completion rate
    let totalComplete = 0;
    let totalItems = 0;
    let totalChecked = 0;
    preventivas.forEach((p) => {
      const vals = Object.values(p.checklist);
      const checked = vals.filter(Boolean).length;
      totalItems += vals.length;
      totalChecked += checked;
      if (vals.length > 0 && vals.every(Boolean)) totalComplete++;
    });
    const completionRate = preventivas.length > 0 ? Math.round((totalComplete / preventivas.length) * 100) : 0;

    // Checklist item stats
    const itemMap = new Map<string, { done: number; total: number }>();
    preventivas.forEach((p) => {
      Object.entries(p.checklist).forEach(([item, done]) => {
        const existing = itemMap.get(item) || { done: 0, total: 0 };
        existing.total++;
        if (done) existing.done++;
        itemMap.set(item, existing);
      });
    });
    const checklistStats = [...itemMap.entries()]
      .map(([name, { done, total }]) => ({ name, done, total, rate: Math.round((done / total) * 100) }))
      .sort((a, b) => a.rate - b.rate);

    return { byType, byTechnician, byDay, completionRate, checklistStats };
  }, [preventivas]);

  if (preventivas.length === 0) {
    return (
      <div className="p-12 flex flex-col items-center justify-center rounded-xl border border-border bg-card gap-2">
        <Calendar className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Nenhuma preventiva neste período para gerar relatório.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-xs text-muted-foreground mb-1">Período</p>
          <p className="text-lg font-bold text-foreground">{monthLabel} {year}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-xs text-muted-foreground mb-1">Total Realizadas</p>
          <p className="text-2xl font-bold text-foreground">{preventivas.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-xs text-muted-foreground mb-1">Taxa Conclusão</p>
          <p className={`text-2xl font-bold ${completionRate >= 80 ? "text-emerald-600 dark:text-emerald-400" : completionRate >= 50 ? "text-amber-600 dark:text-amber-400" : "text-destructive"}`}>
            {completionRate}%
          </p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-xs text-muted-foreground mb-1">Equipamentos Únicos</p>
          <p className="text-2xl font-bold text-foreground">{new Set(preventivas.map((p) => p.asset_tag)).size}</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Equipment Type - Bar */}
        <div className="p-5 rounded-xl border border-border bg-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Manutenções por Tipo de Equipamento</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={byType} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Bar dataKey="value" name="Manutenções" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* By Type - Pie */}
        <div className="p-5 rounded-xl border border-border bg-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Distribuição por Tipo</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {byType.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Timeline + Technician */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily timeline */}
        <div className="p-5 rounded-xl border border-border bg-card">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-primary" /> Manutenções por Dia
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={byDay} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Line type="monotone" dataKey="count" name="Manutenções" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* By technician */}
        <div className="p-5 rounded-xl border border-border bg-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Manutenções por Técnico</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={byTechnician} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Bar dataKey="total" name="Total" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Checklist item compliance */}
      {checklistStats.length > 0 && (
        <div className="p-5 rounded-xl border border-border bg-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Taxa de Conformidade por Item do Checklist</h3>
          <div className="space-y-2.5">
            {checklistStats.map((item) => (
              <div key={item.name} className="flex items-center gap-3">
                <div className="w-40 text-xs text-foreground truncate shrink-0">{item.name}</div>
                <div className="flex-1 h-2 bg-muted rounded-full">
                  <div
                    className={`h-full rounded-full transition-all ${item.rate >= 80 ? "bg-emerald-500" : item.rate >= 50 ? "bg-amber-500" : "bg-destructive"}`}
                    style={{ width: `${item.rate}%` }}
                  />
                </div>
                <span className={`text-xs font-medium w-12 text-right ${item.rate >= 80 ? "text-emerald-600 dark:text-emerald-400" : item.rate >= 50 ? "text-amber-600 dark:text-amber-400" : "text-destructive"}`}>
                  {item.rate}%
                </span>
                <span className="text-[10px] text-muted-foreground w-14 text-right">{item.done}/{item.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
