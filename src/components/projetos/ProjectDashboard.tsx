import { useMemo } from "react";
import { useProjectTickets } from "@/hooks/useProjectTickets";
import { useProjectTasks } from "@/hooks/useProjectTasks";
import { useSprints, SprintWithProgress } from "@/hooks/useSprints";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Project } from "@/hooks/useProjects";

const RESOLVED = ["Resolvido", "Aprovado", "Aguardando Aprovação", "Fechado"];

interface Props {
  project: Project;
}

export default function ProjectDashboard({ project }: Props) {
  const { data: tickets = [] } = useProjectTickets(project.id);
  const { data: tasks = [] } = useProjectTasks(project.id);
  const { data: sprints = [] } = useSprints(project.id);

  const activeSprint = sprints.find((s) => s.status === "ativa") || sprints[0];

  // origem dos pontos (chamados vs tarefas)
  const ticketPoints = tickets.reduce((s, t) => s + (t.story_points || 0), 0);
  const taskPoints = tasks.reduce((s, t) => s + (t.story_points || 0), 0);
  const originData = [
    { name: "Chamados", value: ticketPoints, color: "hsl(var(--primary))" },
    { name: "Tarefas", value: taskPoints, color: "hsl(265 80% 60%)" },
  ];

  // eficiência: chamados planejados (em sprint) que foram concluídos
  const ticketsInSprint = tickets.filter((t) => t.sprint_id);
  const completedInSprint = ticketsInSprint.filter((t) => RESOLVED.includes(t.status));
  const efficiency = ticketsInSprint.length > 0
    ? Math.round((completedInSprint.length / ticketsInSprint.length) * 100)
    : 0;

  // burndown da sprint ativa
  const burndown = useMemo(() => buildBurndown(activeSprint, tickets, tasks), [activeSprint, tickets, tasks]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Card label="Pontos totais" value={ticketPoints + taskPoints} />
        <Card label="Pontos concluídos" value={
          tickets.filter((t) => RESOLVED.includes(t.status)).reduce((s, t) => s + (t.story_points || 0), 0) +
          tasks.filter((t) => t.status === "done").reduce((s, t) => s + (t.story_points || 0), 0)
        } />
        <Card label="% via chamados" value={ticketPoints + taskPoints > 0
          ? Math.round((ticketPoints / (ticketPoints + taskPoints)) * 100) + "%"
          : "—"} />
        <Card label="Eficiência sprints" value={ticketsInSprint.length > 0 ? `${efficiency}%` : "—"}
          sub={`${completedInSprint.length}/${ticketsInSprint.length} concluídos`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-elevated p-4">
          <h3 className="text-sm font-semibold mb-2">Origem dos pontos</h3>
          {ticketPoints + taskPoints === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={originData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>
                  {originData.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card-elevated p-4">
          <h3 className="text-sm font-semibold mb-1">
            Burndown {activeSprint ? `— ${activeSprint.name}` : ""}
          </h3>
          {!activeSprint || burndown.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
              Nenhuma sprint ativa com datas configuradas.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={burndown}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="ideal" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" dot={false} />
                <Line type="monotone" dataKey="real" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, sub }: { label: string; value: any; sub?: string }) {
  return (
    <div className="card-elevated p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function buildBurndown(sprint: SprintWithProgress | undefined, tickets: any[], tasks: any[]) {
  if (!sprint || !sprint.start_date || !sprint.end_date) return [];
  const start = new Date(sprint.start_date);
  const end = new Date(sprint.end_date);
  const days: { day: string; ideal: number; real: number | null }[] = [];
  const items = [
    ...tickets.filter((t) => t.sprint_id === sprint.id).map((t) => ({
      points: t.story_points || 0,
      done: RESOLVED.includes(t.status) ? new Date(t.updated_at) : null,
    })),
    ...tasks.filter((t) => t.sprint_id === sprint.id).map((t) => ({
      points: t.story_points || 0,
      done: t.status === "done" ? new Date(t.updated_at) : null,
    })),
  ];
  const total = items.reduce((s, i) => s + i.points, 0);
  if (total === 0) return [];

  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  const today = new Date();
  for (let i = 0; i <= totalDays; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const ideal = Math.max(0, total - (total / totalDays) * i);
    let real: number | null = null;
    if (d <= today) {
      const completedByDay = items
        .filter((it) => it.done && it.done <= new Date(d.getTime() + 86400000 - 1))
        .reduce((s, it) => s + it.points, 0);
      real = total - completedByDay;
    }
    days.push({
      day: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      ideal: Math.round(ideal),
      real,
    });
  }
  return days;
}
