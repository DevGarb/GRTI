import { useProjectTickets, useUnlinkTicket, useUpdateTicketSprint, useUpdateTicketPoints } from "@/hooks/useProjectTickets";
import { useProjectTasks, useDeleteProjectTask, useUpdateProjectTask } from "@/hooks/useProjectTasks";
import { useSprints } from "@/hooks/useSprints";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ticket as TicketIcon, ListTodo, Trash2, ExternalLink } from "lucide-react";

interface Props {
  projectId: string;
  sprintId: string | null; // null = backlog
}

const RESOLVED = ["Resolvido", "Aprovado", "Aguardando Aprovação", "Fechado"];

export default function SprintItems({ projectId, sprintId }: Props) {
  const { data: tickets = [] } = useProjectTickets(projectId, sprintId);
  const { data: tasks = [] } = useProjectTasks(projectId, sprintId);
  const { data: sprints = [] } = useSprints(projectId);
  const unlinkTicket = useUnlinkTicket();
  const moveTicket = useUpdateTicketSprint();
  const updatePoints = useUpdateTicketPoints();
  const updateTask = useUpdateProjectTask();
  const deleteTask = useDeleteProjectTask();

  if (tickets.length === 0 && tasks.length === 0) {
    return <div className="p-6 text-center text-sm text-muted-foreground">Nenhum item nesta sprint.</div>;
  }

  return (
    <div className="divide-y divide-border">
      {tickets.map((t) => (
        <div key={t.id} className="p-3 flex items-center gap-3 text-sm">
          <TicketIcon className="h-4 w-4 text-blue-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{t.title}</span>
              <Badge variant="outline" className="text-[10px]">{t.priority}</Badge>
              <Badge
                variant="outline"
                className={`text-[10px] ${RESOLVED.includes(t.status) ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : ""}`}
              >
                {t.status}
              </Badge>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {t.assignedName || "Não atribuído"} · #{t.id.slice(0, 8)}
            </div>
          </div>
          <Input
            type="number"
            min={1}
            value={t.story_points ?? 1}
            onChange={(e) => updatePoints.mutate({ ticketId: t.id, points: Number(e.target.value) })}
            className="h-7 w-14 text-xs"
          />
          <Select
            value={t.sprint_id || "backlog"}
            onValueChange={(v) => moveTicket.mutate({ ticketId: t.id, sprintId: v === "backlog" ? null : v })}
          >
            <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="backlog">Backlog</SelectItem>
              {sprints.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => window.open(`/chamados?ticket=${t.id}`, "_blank")}
            title="Abrir no helpdesk"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => {
              if (confirm("Remover chamado do projeto?")) unlinkTicket.mutate(t.id);
            }}
            title="Remover do projeto"
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ))}

      {tasks.map((task) => (
        <div key={task.id} className="p-3 flex items-center gap-3 text-sm">
          <ListTodo className="h-4 w-4 text-purple-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{task.title}</span>
              <Select
                value={task.status}
                onValueChange={(v) => updateTask.mutate({ id: task.id, status: v })}
              >
                <SelectTrigger className="h-6 w-24 text-[10px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">A fazer</SelectItem>
                  <SelectItem value="doing">Em andamento</SelectItem>
                  <SelectItem value="done">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {task.description && (
              <div className="text-[11px] text-muted-foreground line-clamp-1">{task.description}</div>
            )}
          </div>
          <Input
            type="number"
            min={1}
            value={task.story_points}
            onChange={(e) => updateTask.mutate({ id: task.id, story_points: Number(e.target.value) })}
            className="h-7 w-14 text-xs"
          />
          <Select
            value={task.sprint_id || "backlog"}
            onValueChange={(v) => updateTask.mutate({ id: task.id, sprint_id: v === "backlog" ? null : v })}
          >
            <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="backlog">Backlog</SelectItem>
              {sprints.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => {
              if (confirm("Excluir tarefa?")) deleteTask.mutate(task.id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
}
