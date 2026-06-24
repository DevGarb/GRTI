import { useSprintMetrics } from "@/hooks/useSprintMetrics";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";

interface Props {
  sprintId: string;
  projectId?: string;
}

export default function SprintMetricsPanel({ sprintId, projectId }: Props) {
  const { data, isLoading } = useSprintMetrics(sprintId, projectId);

  if (isLoading || !data) {
    return <div className="text-xs text-muted-foreground py-4 text-center">Carregando métricas...</div>;
  }

  if (data.totalPoints === 0 && data.burndown.length === 0) {
    return <div className="text-xs text-muted-foreground py-4 text-center">Sem dados para gráficos.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded bg-muted/50 p-2">
          Pts totais<br /><strong className="text-sm">{data.totalPoints}</strong>
        </div>
        <div className="rounded bg-muted/50 p-2">
          Concluídos<br /><strong className="text-sm text-emerald-600">{data.completedPoints}</strong>
        </div>
        <div className="rounded bg-muted/50 p-2">
          Velocidade méd.<br /><strong className="text-sm">{data.avgVelocity}</strong>
        </div>
      </div>

      <div>
        <div className="text-xs font-medium mb-1">Burndown</div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.burndown}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line
                type="monotone"
                dataKey="ideal"
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                dot={false}
                name="Ideal"
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 2 }}
                name="Real"
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {data.velocity.length > 0 && (
        <div>
          <div className="text-xs font-medium mb-1">Velocidade (sprints anteriores)</div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.velocity}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="sprint" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="points" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
