import { useProjectSprintMetrics } from "@/hooks/useSprintMetrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { Target, TrendingUp, Activity } from "lucide-react";

interface Props {
  projectId: string;
}

export default function EfficiencyDashboard({ projectId }: Props) {
  const { data: metrics = [] } = useProjectSprintMetrics(projectId);
  const closed = metrics.filter((m) => m.closed_at);

  if (closed.length === 0) {
    return (
      <div className="card-elevated p-6 text-center text-sm text-muted-foreground">
        Nenhuma sprint concluída ainda. Os indicadores aparecem aqui depois que sprints forem
        concluídas ou fechadas.
      </div>
    );
  }

  const chartData = closed.map((m) => ({
    name: m.sprintName,
    Planejado: m.planned_points,
    Entregue: m.delivered_points,
    Capacidade: m.capacity_at_close || 0,
  }));

  const last5 = closed.slice(-5);
  const avgVelocity =
    last5.reduce((s, m) => s + m.delivered_points, 0) / Math.max(1, last5.length);
  const avgEfficiency =
    last5.reduce((s, m) => s + (m.efficiency_pct || 0), 0) / Math.max(1, last5.length);
  const avgPredictability =
    last5.reduce((s, m) => s + (m.predictability_pct || 0), 0) / Math.max(1, last5.length);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <KpiCard
          icon={<Activity className="h-5 w-5 text-blue-500" />}
          label="Velocidade média (5 sprints)"
          value={`${avgVelocity.toFixed(1)} pts`}
        />
        <KpiCard
          icon={<Target className="h-5 w-5 text-emerald-500" />}
          label="Eficiência média"
          value={`${avgEfficiency.toFixed(0)}%`}
          hint="Entregue / Planejado"
        />
        <KpiCard
          icon={<TrendingUp className="h-5 w-5 text-amber-500" />}
          label="Previsibilidade média"
          value={`${avgPredictability.toFixed(0)}%`}
          hint="Entregue / Capacidade"
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Planejado vs Entregue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Planejado" fill="hsl(var(--muted-foreground))" />
                <Bar dataKey="Entregue" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Velocidade ao longo do tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="Entregue" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ icon, label, value, hint }: any) {
  return (
    <div className="card-elevated p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}
