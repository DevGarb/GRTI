import { Plus, ArrowRight, Ticket, ListTodo, Layers, TrendingUp, User, Users, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Project } from "@/hooks/useProjects";
import { SprintWithProgress, isSprintEffectivelyDone } from "@/hooks/useSprints";
import { useProjectTickets } from "@/hooks/useProjectTickets";
import { useProjectTasks } from "@/hooks/useProjectTasks";
import { useProjectDelivery } from "@/hooks/useProjectDelivery";
import { formatDateBR } from "@/lib/dateFormat";

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
  const { data: delivery } = useProjectDelivery(project.id);

  const ownerIds = [project.owner_id, project.co_owner_id].filter(Boolean) as string[];
  const { data: ownerProfiles = [] } = useQuery({
    queryKey: ["project-owners", project.id, ownerIds.join(",")],
    queryFn: async () => {
      if (ownerIds.length === 0) return [] as Array<{ user_id: string; full_name: string }>;
      // 1) tenta direto em profiles
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ownerIds);
      const found = (data || []) as Array<{ user_id: string; full_name: string }>;
      const missing = ownerIds.filter((id) => !found.some((p) => p.user_id === id));
      if (missing.length === 0) return found;
      // 2) fallback via RPC (mesma org) caso o RLS de profiles esconda algum
      const { data: techs } = await (supabase as any).rpc("get_org_technicians");
      const extra = ((techs as any[]) || [])
        .filter((t: any) => missing.includes(t.user_id))
        .map((t: any) => ({ user_id: t.user_id, full_name: t.full_name }));
      return [...found, ...extra];
    },
    enabled: ownerIds.length > 0,
  });
  const ownerName = ownerProfiles.find((p: any) => p.user_id === project.owner_id)?.full_name;
  const coOwnerName = ownerProfiles.find((p: any) => p.user_id === project.co_owner_id)?.full_name;

  // KPIs
  const totalTickets = tickets.length;
  const completedTickets = tickets.filter((t) => RESOLVED_STATUSES.includes(t.status)).length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "Concluído" || t.status === "done").length;
  const totalSprints = sprints.length;
  const isSprintDone = (s: SprintWithProgress) =>
    isSprintEffectivelyDone(s.status, s.ticketCount + s.taskCount, s.donePct);
  const sprintsByStatus = {
    ativa: sprints.filter((s) => s.status === "ativa" && !isSprintDone(s)).length,
    planejada: sprints.filter((s) => s.status === "planejada" && !isSprintDone(s)).length,
    concluida: sprints.filter(isSprintDone).length,
  };
  const totalItems = totalTickets + totalTasks;
  const doneItems = completedTickets + completedTasks;
  const sprintProgressPct =
    totalSprints > 0 ? Math.round((sprintsByStatus.concluida / totalSprints) * 100) : 0;

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
          icon={TrendingUp}
          label="Progresso do projeto"
          value={`${delivery?.pctItems ?? 0}%`}
          hint={
            <div className="mt-1">
              <Progress value={delivery?.pctItems ?? 0} className="h-1.5 [&>div]:bg-emerald-500" />
              <div className="mt-1">
                {delivery?.doneTasks ?? 0}/{delivery?.totalTasks ?? 0} itens concluídos
              </div>
            </div>
          }
          accent="bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
        />
        <KpiCard
          icon={ListTodo}
          label="Backlog"
          value={delivery?.totalTasks ?? totalTasks}
          hint={`${delivery?.doneTasks ?? 0} concluídos · ${delivery?.inDevTasks ?? 0} em dev · ${delivery?.pendingTasks ?? 0} pendentes`}
          accent="bg-purple-500/15 text-purple-600 dark:text-purple-300"
        />
        <KpiCard
          icon={Layers}
          label="Sprints"
          value={totalSprints}
          hint={`${sprintsByStatus.ativa} ativas · ${sprintsByStatus.planejada} planejadas · ${sprintsByStatus.concluida} concluídas (${sprintProgressPct}%)`}
          accent="bg-amber-500/15 text-amber-600 dark:text-amber-300"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Pontos entregues"
          value={`${delivery?.donePoints ?? 0}/${delivery?.totalPoints ?? 0}`}
          hint={
            <div className="mt-1">
              <Progress value={delivery?.pctPoints ?? 0} className="h-1.5 [&>div]:bg-blue-500" />
              <div className="mt-1">{delivery?.pctPoints ?? 0}% dos story points</div>
            </div>
          }
          accent="bg-blue-500/15 text-blue-600 dark:text-blue-300"
        />
      </div>

      {/* Entregas por desenvolvedor */}
      <div className="card-elevated p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="h-7 w-7 rounded-md flex items-center justify-center bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
            <Users className="h-3.5 w-3.5" />
          </span>
          <h4 className="text-sm font-semibold">Entregas por desenvolvedor</h4>
          {(delivery?.byDev.length ?? 0) > 0 && (
            <span className="text-[11px] text-muted-foreground ml-auto">
              {delivery!.byDev.length} {delivery!.byDev.length === 1 ? "pessoa" : "pessoas"} ·{" "}
              {delivery!.doneTasks} itens · {delivery!.donePoints} pts
            </span>
          )}
        </div>
        {(delivery?.byDev.length ?? 0) === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum backlog concluído ainda.</p>
        ) : (
          <div className="space-y-1">
            <div className="hidden md:grid grid-cols-12 gap-3 px-2 pb-2 text-[10px] uppercase tracking-wide text-muted-foreground border-b">
              <div className="col-span-4">Desenvolvedor</div>
              <div className="col-span-2 text-right">Entregues</div>
              <div className="col-span-3">Participação</div>
              <div className="col-span-1 text-right">Em dev</div>
              <div className="col-span-2 text-right">Última / Lead</div>
            </div>
            {delivery!.byDev.map((d) => (
              <div
                key={d.userId ?? "none"}
                className="grid grid-cols-2 md:grid-cols-12 gap-3 items-center px-2 py-2.5 rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="col-span-2 md:col-span-4 flex items-center gap-2 min-w-0">
                  <span className="h-7 w-7 shrink-0 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center">
                    {(d.name.trim().charAt(0) || "?").toUpperCase()}
                  </span>
                  <span className="truncate text-xs font-medium">{d.name}</span>
                </div>
                <div className="md:col-span-2 md:text-right text-xs">
                  <span className="font-semibold">{d.items}</span>{" "}
                  <span className="text-muted-foreground">itens · {d.points} pts</span>
                </div>
                <div className="col-span-2 md:col-span-3 flex items-center gap-2">
                  <Progress value={d.pctItems} className="h-1.5 flex-1 [&>div]:bg-indigo-500" />
                  <span className="text-[10px] text-muted-foreground w-16 text-right shrink-0">
                    {d.pctItems}% · {d.pctPoints}% pts
                  </span>
                </div>
                <div className="md:col-span-1 md:text-right text-xs">
                  {d.inProgress > 0 ? (
                    <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px]">
                      {d.inProgress}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
                <div className="md:col-span-2 md:text-right text-[11px] text-muted-foreground">
                  {d.lastDeliveryAt ? formatDateBR(d.lastDeliveryAt) : "—"}
                  {d.avgLeadDays != null && <> · {d.avgLeadDays}d</>}
                </div>
              </div>
            ))}
          </div>
        )}
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
                    {formatDateBR(activeSprint.start_date)}
                    {activeSprint.end_date && ` → ${formatDateBR(activeSprint.end_date)}`}
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
      {(project.description || project.start_date || project.end_date || ownerName || coOwnerName) && (
        <div className="card-elevated p-5">
          <h4 className="text-sm font-semibold mb-2">Sobre o projeto</h4>
          {(ownerName || coOwnerName) && (
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {ownerName && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                  <User className="h-3.5 w-3.5" /> Responsável: {ownerName}
                </span>
              )}
              {coOwnerName && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-muted-foreground text-xs font-medium">
                  <Users className="h-3.5 w-3.5" /> Co-responsável: {coOwnerName}
                </span>
              )}
            </div>
          )}
          {project.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.description}</p>
          )}
          {(project.start_date || project.end_date) && (
            <p className="text-xs text-muted-foreground mt-3">
              {project.start_date && formatDateBR(project.start_date)}
              {" → "}
              {project.end_date && formatDateBR(project.end_date)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
