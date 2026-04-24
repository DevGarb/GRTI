import { Plus, ArrowRight, Ticket, ListTodo, Layers, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Project } from "@/hooks/useProjects";
import { SprintWithProgress } from "@/hooks/useSprints";
import { useProjectTickets } from "@/hooks/useProjectTickets";
import { useProjectTasks } from "@/hooks/useProjectTasks";

interface Props {
  project: Project;
  sprints: SprintWithProgress[];
  onAddToActive: () => void;
  onCreateSprint: () => void;
}

const RESOLVED_STATUSES = ["Resolvido", "Aprovado", "Aguardando Aprovação", "Fechado"];

const STATUS_BAR: Record<string, string> = {
  "Aberto": "bg-red-500",
  "Em Andamento": "bg-yellow-500",
  "Aguardando Aprovação": "bg-purple-500",
  "Aprovado": "bg-blue-500",
  "Resolvido": "bg-emerald-500",
  "Fechado": "bg-gray-400",
  "Disponível": "bg-red-500",
};

const STATUS_TEXT: Record<string, string> = {
  "Aberto": "text-red-700 dark:text-red-400",
  "Em Andamento": "text-yellow-700 dark:text-yellow-400",
  "Aguardando Aprovação": "text-purple-700 dark:text-purple-400",
  "Aprovado": "text-blue-700 dark:text-blue-400",
  "Resolvido": "text-emerald-700 dark:text-emerald-400",
  "Fechado": "text-gray-500 dark:text-gray-400",
  "Disponível": "text-red-700 dark:text-red-400",
};

const SPRINT_STATUS_COLOR: Record<string, string> = {
  planejada: "bg-muted text-muted-foreground",
  ativa: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  concluida: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  cancelada: "bg-rose-500/20 text-rose-700 dark:text-rose-300",
};

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="card-elevated p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <span className={cn("h-7 w-7 rounded-md flex items-center justify-center", accent)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span>{label}</span>
      </div>
      <div className="text-2xl font-semibold leading-tight">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

export default function ProjectOverview({ project, sprints, onAddToActive, onCreateSprint }: Props) {
  const { data: tickets = [] } = useProjectTickets(project.id);
  const { data: tasks = [] } = useProjectTasks(project.id);

  // KPIs
  const totalTickets = tickets.length;
  const completedTickets = tickets.filter((t) => RESOLVED_STATUSES.includes(t.status)).length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const totalSprints = sprints.length;
  const sprintsByStatus = {
    ativa: sprints.filter((s) => s.status === "ativa").length,
    planejada: sprints.filter((s) => s.status === "planejada").length,
    concluida: sprints.filter((s) => s.status === "concluida").length,
  };
  const totalItems = totalTickets + totalTasks;
  const doneItems = completedTickets + completedTasks;
  const overallPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  // Status dos chamados
  const statusCounts = tickets.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});
  const statusEntries = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);

  const activeSprint = sprints.find((s) => s.status === "ativa");
  const nextPlanned = sprints.filter((s) => s.status === "planejada").slice(-1)[0];

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon={Ticket}
          label="Chamados"
          value={totalTickets}
          hint={`${completedTickets} concluídos`}
          accent="bg-blue-500/15 text-blue-600 dark:text-blue-300"
        />
        <KpiCard
          icon={ListTodo}
          label="Tarefas"
          value={totalTasks}
          hint={`${completedTasks} concluídas`}
          accent="bg-purple-500/15 text-purple-600 dark:text-purple-300"
        />
        <KpiCard
          icon={Layers}
          label="Sprints"
          value={totalSprints}
          hint={`${sprintsByStatus.ativa} ativa · ${sprintsByStatus.planejada} planejada · ${sprintsByStatus.concluida} concluída`}
          accent="bg-amber-500/15 text-amber-600 dark:text-amber-300"
        />
        <KpiCard
          icon={TrendingUp}
          label="Progresso geral"
          value={`${overallPct}%`}
          hint={
            <div className="mt-1">
              <Progress value={overallPct} className="h-1.5 [&>div]:bg-emerald-500" />
              <div className="mt-1">{doneItems}/{totalItems} itens concluídos</div>
            </div>
          }
          accent="bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
        />
      </div>

      {/* Sprint ativa */}
      {activeSprint ? (
        <div className="card-elevated p-5 border-l-4 border-l-blue-500">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px]">
                  Sprint ativa
                </Badge>
                <h3 className="font-semibold text-sm">{activeSprint.name}</h3>
                {activeSprint.start_date && (
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(activeSprint.start_date).toLocaleDateString("pt-BR")}
                    {activeSprint.end_date && ` → ${new Date(activeSprint.end_date).toLocaleDateString("pt-BR")}`}
                  </span>
                )}
              </div>
              {activeSprint.goal && (
                <p className="text-xs text-muted-foreground mt-1">{activeSprint.goal}</p>
              )}
            </div>
            <Button size="sm" onClick={onAddToActive}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar chamados
            </Button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {activeSprint.ticketCount} chamados · {activeSprint.taskCount} tarefas
              </span>
              <span>
                {activeSprint.completedTickets + activeSprint.completedTasks}/
                {activeSprint.ticketCount + activeSprint.taskCount} concluídos ({activeSprint.donePct}%)
              </span>
            </div>
            <Progress value={activeSprint.donePct} className="h-1.5 [&>div]:bg-emerald-500" />
          </div>
          {nextPlanned && (
            <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Badge variant="outline" className="text-[10px]">Próxima</Badge>
                <span className="font-medium text-foreground">{nextPlanned.name}</span>
                <span>· {nextPlanned.ticketCount + nextPlanned.taskCount} itens</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          )}
        </div>
      ) : (
        <div className="card-elevated p-5 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Nenhuma sprint ativa. Crie uma sprint para começar.
          </p>
          <Button size="sm" onClick={onCreateSprint}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Nova sprint
          </Button>
        </div>
      )}

      {/* Mini-dashboards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Status dos chamados */}
        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold mb-3">Status dos chamados</h4>
          {statusEntries.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum chamado vinculado a este projeto.</p>
          ) : (
            <div className="space-y-2.5">
              {statusEntries.map(([status, count]) => {
                const pct = totalTickets > 0 ? (count / totalTickets) * 100 : 0;
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={cn("font-medium", STATUS_TEXT[status] || "text-foreground")}>
                        {status}
                      </span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", STATUS_BAR[status] || "bg-muted-foreground")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Distribuição por sprint */}
        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold mb-3">Distribuição por sprint</h4>
          {sprints.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma sprint criada ainda.</p>
          ) : (
            <div className="space-y-3">
              {sprints.slice(0, 6).map((s) => {
                const total = s.ticketCount + s.taskCount;
                const done = s.completedTickets + s.completedTasks;
                return (
                  <div key={s.id}>
                    <div className="flex items-center justify-between gap-2 text-xs mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{s.name}</span>
                        <Badge
                          className={cn(
                            "text-[9px] capitalize",
                            SPRINT_STATUS_COLOR[s.status] || SPRINT_STATUS_COLOR.planejada
                          )}
                        >
                          {s.status}
                        </Badge>
                      </div>
                      <span className="text-muted-foreground whitespace-nowrap">
                        {done}/{total} ({s.donePct}%)
                      </span>
                    </div>
                    <Progress value={s.donePct} className="h-1.5 [&>div]:bg-emerald-500" />
                  </div>
                );
              })}
              {sprints.length > 6 && (
                <p className="text-[11px] text-muted-foreground text-center pt-1">
                  +{sprints.length - 6} sprints. Veja todas na aba Sprints.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sobre o projeto */}
      {(project.description || project.start_date || project.end_date) && (
        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold mb-2">Sobre o projeto</h4>
          {project.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.description}</p>
          )}
          {(project.start_date || project.end_date) && (
            <p className="text-xs text-muted-foreground mt-3">
              {project.start_date && new Date(project.start_date).toLocaleDateString("pt-BR")}
              {" → "}
              {project.end_date && new Date(project.end_date).toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
