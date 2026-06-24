import { useMemo, useState } from "react";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ListTodo,
  Package,
  RotateCcw,
  TrendingUp,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { useProjetosDashboard } from "@/hooks/useProjetosDashboard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

function KpiCard({
  icon: Icon,
  title,
  value,
  suffix,
  hint,
  tone = "default",
}: {
  icon: any;
  title: string;
  value: number | string;
  suffix?: string;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad" | "primary";
}) {
  const toneClass = {
    default: "text-foreground",
    good: "text-emerald-600 dark:text-emerald-400",
    warn: "text-amber-600 dark:text-amber-400",
    bad: "text-destructive",
    primary: "text-primary",
  }[tone];
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${toneClass}`}>
              {value}
              {suffix && <span className="text-sm font-medium ml-0.5">{suffix}</span>}
            </p>
            {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
          </div>
          <Icon className={`h-5 w-5 shrink-0 ${toneClass}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function useMonthlyTrend(orgId: string | null) {
  return useQuery({
    queryKey: ["monthly-trend", orgId],
    queryFn: async () => {
      const months: { label: string; from: Date; to: Date }[] = [];
      for (let i = 5; i >= 0; i--) {
        const m = subMonths(new Date(), i);
        months.push({
          label: format(m, "MMM/yy", { locale: ptBR }),
          from: startOfMonth(m),
          to: endOfMonth(m),
        });
      }
      const results = await Promise.all(
        months.map((m) =>
          (supabase as any).rpc("get_projects_dashboard", {
            _organization_id: orgId,
            _from: m.from.toISOString(),
            _to: m.to.toISOString(),
          })
        )
      );
      return months.map((m, i) => ({
        mes: m.label,
        entregas: results[i].data?.month_deliveries ?? 0,
        retrabalhos: results[i].data?.month_reworks ?? 0,
        eficiencia: results[i].data?.op_efficiency ?? 0,
        qualidade: results[i].data?.tech_quality ?? 0,
        mvp: results[i].data?.final_mvp ?? 0,
      }));
    },
  });
}

export default function ProjetosDashboard() {
  const { profile } = useAuth();
  const [period, setPeriod] = useState("current");

  const { from, to } = useMemo(() => {
    if (period === "current") return { from: startOfMonth(new Date()), to: endOfMonth(new Date()) };
    if (period === "last3") return { from: startOfMonth(subMonths(new Date(), 2)), to: endOfMonth(new Date()) };
    return { from: startOfMonth(subMonths(new Date(), 5)), to: endOfMonth(new Date()) };
  }, [period]);

  const { data, isLoading } = useProjetosDashboard(from, to);
  const { data: trend = [] } = useMonthlyTrend(profile?.organization_id ?? null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Dashboard de Projetos</h1>
          <p className="text-sm text-muted-foreground">
            Visão executiva de entregas, qualidade e eficiência —{" "}
            {format(from, "dd/MM", { locale: ptBR })} a {format(to, "dd/MM/yyyy", { locale: ptBR })}
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Mês atual</SelectItem>
            <SelectItem value="last3">Últimos 3 meses</SelectItem>
            <SelectItem value="last6">Últimos 6 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard icon={Activity} title="Projetos Ativos" value={data?.active_projects ?? 0} tone="primary" />
        <KpiCard icon={CheckCircle2} title="Projetos Concluídos" value={data?.done_projects ?? 0} tone="good" />
        <KpiCard icon={AlertTriangle} title="Projetos Atrasados" value={data?.late_projects ?? 0} tone="bad" />
        <KpiCard icon={Zap} title="Sprints em Andamento" value={data?.active_sprints ?? 0} />
        <KpiCard icon={ListTodo} title="Backlog Pendente" value={data?.pending_backlog ?? 0} />
        <KpiCard icon={Package} title="Entregas do Mês" value={data?.month_deliveries ?? 0} tone="good" />
        <KpiCard icon={RotateCcw} title="Retrabalhos do Mês" value={data?.month_reworks ?? 0} tone="warn" />
        <KpiCard icon={TrendingUp} title="Eficiência Operacional" value={data?.op_efficiency ?? 0} suffix="%" />
        <KpiCard icon={ShieldCheck} title="Qualidade Técnica" value={data?.tech_quality ?? 0} suffix="%" />
        <KpiCard
          icon={Trophy}
          title="Eficiência MVP"
          value={data?.final_mvp ?? 0}
          suffix="%"
          tone={(data?.final_mvp ?? 0) >= 100 ? "good" : (data?.final_mvp ?? 0) >= 90 ? "primary" : "default"}
          hint="(Prazo × Qualidade) × (1 − Retrabalho)"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Entregas e retrabalhos por mês</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Bar dataKey="entregas" fill="hsl(var(--primary))" name="Entregas" />
                <Bar dataKey="retrabalhos" fill="hsl(var(--destructive))" name="Retrabalhos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Evolução mensal dos indicadores</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis className="text-xs" domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="eficiencia" stroke="#10b981" name="Eficiência" />
                <Line type="monotone" dataKey="qualidade" stroke="#3b82f6" name="Qualidade" />
                <Line type="monotone" dataKey="mvp" stroke="#f59e0b" name="MVP Final" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando indicadores...</p>}
    </div>
  );
}
