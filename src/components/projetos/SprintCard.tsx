import { useState } from "react";
import { SprintWithProgress, useActivateSprint, useDeleteSprint, useUpdateSprint } from "@/hooks/useSprints";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronDown,
  ChevronRight,
  Play,
  CheckCircle2,
  Trash2,
  Pencil,
  Plus,
  Lock,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SprintItems from "./SprintItems";
import NewSprintModal from "./NewSprintModal";
import AddTicketsToSprintModal from "./AddTicketsToSprintModal";
import SprintHistoryTimeline from "./SprintHistoryTimeline";

interface Props {
  sprint: SprintWithProgress;
  projectId: string;
}

const statusColor: Record<string, string> = {
  planejada: "bg-muted text-muted-foreground",
  ativa: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  concluida: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  fechada: "bg-slate-500/30 text-slate-100 dark:text-slate-200",
  cancelada: "bg-rose-500/20 text-rose-700 dark:text-rose-300",
};

export default function SprintCard({ sprint, projectId }: Props) {
  const [open, setOpen] = useState(sprint.status === "ativa");
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const activate = useActivateSprint();
  const update = useUpdateSprint();
  const del = useDeleteSprint();

  const pct = sprint.capacity_points > 0 ? Math.min(100, Math.round((sprint.totalPoints / sprint.capacity_points) * 100)) : 0;
  const donePct = sprint.totalPoints > 0 ? Math.round((sprint.completedPoints / sprint.totalPoints) * 100) : 0;
  const exceeded = sprint.capacity_points > 0 && sprint.totalPoints > sprint.capacity_points;
  const isLocked = sprint.status === "fechada";
  const canAdd = sprint.status === "planejada" || sprint.status === "ativa";

  function closeSprint() {
    if (
      confirm(
        `Fechar a sprint "${sprint.name}"?\n\nIsso é IRREVERSÍVEL. O escopo será trancado, ninguém poderá adicionar/remover chamados ou alterar pontos. As métricas finais serão registradas.`
      )
    ) {
      update.mutate({ id: sprint.id, status: "fechada" } as any);
    }
  }

  return (
    <div className="card-elevated">
      <div className="p-4 flex items-start gap-3">
        <button onClick={() => setOpen((o) => !o)} className="mt-1 text-muted-foreground hover:text-foreground">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold">{sprint.name}</h3>
            <Badge className={cn("text-[10px] capitalize", statusColor[sprint.status] || statusColor.planejada)}>
              {sprint.status}
              {isLocked && <Lock className="h-2.5 w-2.5 ml-0.5 inline" />}
            </Badge>
            {sprint.start_date && (
              <span className="text-[11px] text-muted-foreground">
                {new Date(sprint.start_date).toLocaleDateString("pt-BR")}
                {sprint.end_date && ` → ${new Date(sprint.end_date).toLocaleDateString("pt-BR")}`}
              </span>
            )}
          </div>
          {sprint.goal && <p className="text-[12px] text-muted-foreground mt-0.5">{sprint.goal}</p>}

          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">
                Capacidade: {sprint.totalPoints} / {sprint.capacity_points || "∞"} pts
                {exceeded && <span className="ml-2 text-destructive">excedida!</span>}
              </span>
              <span className="text-muted-foreground">
                Concluído: {sprint.completedPoints} pts ({donePct}%)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Progress value={pct} className={cn("h-1.5", exceeded && "[&>div]:bg-destructive")} />
              <Progress value={donePct} className="h-1.5 [&>div]:bg-emerald-500" />
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>{sprint.ticketCount} chamados</span>
              <span>{sprint.taskCount} tarefas</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1 items-end">
          {canAdd && (
            <Button size="sm" onClick={() => setAddOpen(true)} title="Adicionar chamados a esta sprint">
              <Plus className="h-3 w-3 mr-1" /> Chamados
            </Button>
          )}
          {sprint.status === "planejada" && (
            <Button size="sm" variant="outline" onClick={() => activate.mutate({ id: sprint.id, projectId })}>
              <Play className="h-3 w-3 mr-1" /> Ativar
            </Button>
          )}
          {sprint.status === "ativa" && (
            <Button size="sm" variant="outline" onClick={() => update.mutate({ id: sprint.id, status: "concluida" } as any)}>
              <CheckCircle2 className="h-3 w-3 mr-1" /> Concluir
            </Button>
          )}
          {sprint.status === "concluida" && (
            <>
              <Button size="sm" variant="outline" onClick={() => update.mutate({ id: sprint.id, status: "ativa" } as any)}>
                <RotateCcw className="h-3 w-3 mr-1" /> Reabrir
              </Button>
              <Button size="sm" variant="destructive" onClick={closeSprint}>
                <Lock className="h-3 w-3 mr-1" /> Fechar
              </Button>
            </>
          )}
          <div className="flex gap-1">
            {!isLocked && (
              <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            {!isLocked && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (confirm("Excluir sprint? Os chamados/tarefas voltam para o backlog.")) {
                    del.mutate({ id: sprint.id, projectId });
                  }
                }}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {open && (
        <div className="border-t bg-muted/20">
          <Tabs defaultValue="items">
            <TabsList className="mx-3 mt-2">
              <TabsTrigger value="items" className="text-xs">Itens</TabsTrigger>
              <TabsTrigger value="history" className="text-xs">Histórico</TabsTrigger>
            </TabsList>
            <TabsContent value="items">
              <SprintItems projectId={projectId} sprintId={sprint.id} />
            </TabsContent>
            <TabsContent value="history">
              <SprintHistoryTimeline sprintId={sprint.id} />
            </TabsContent>
          </Tabs>
        </div>
      )}

      <NewSprintModal open={editOpen} onOpenChange={setEditOpen} projectId={projectId} sprint={sprint} />
      <AddTicketsToSprintModal
        open={addOpen}
        onOpenChange={setAddOpen}
        projectId={projectId}
        defaultSprintId={sprint.id}
      />
    </div>
  );
}
