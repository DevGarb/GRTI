import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SprintWithProgress, useActivateSprint, useDeleteSprint, useUpdateSprint, isSprintEffectivelyDone } from "@/hooks/useSprints";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  Play,
  CheckCircle2,
  Trash2,
  Pencil,
  Plus,
  RotateCcw,
  History,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SprintItems from "./SprintItems";
import NewSprintModal from "./NewSprintModal";
import AddTicketsToSprintModal from "./AddTicketsToSprintModal";
import { formatDateBR, formatDateTimeFullBR } from "@/lib/dateFormat";

interface Props {
  sprint: SprintWithProgress;
  projectId: string;
}

const statusColor: Record<string, string> = {
  planejada: "bg-muted text-muted-foreground",
  ativa: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  concluida: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  cancelada: "bg-rose-500/20 text-rose-700 dark:text-rose-300",
};

export default function SprintCard({ sprint, projectId }: Props) {
  const [open, setOpen] = useState(sprint.status === "ativa");
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [histOpen, setHistOpen] = useState(false);
  const activate = useActivateSprint();
  const update = useUpdateSprint();
  const del = useDeleteSprint();

  const total = sprint.ticketCount + sprint.taskCount;
  const done = sprint.completedTickets + sprint.completedTasks;
  const canAdd = sprint.status === "planejada" || sprint.status === "ativa";
  const fullyDone = isSprintEffectivelyDone(sprint.status, total, sprint.donePct);
  const isOfficial = sprint.status === "concluida";
  const badgeStatus = isOfficial
    ? "concluida"
    : fullyDone
      ? "concluída (100%)"
      : sprint.status;

  const history = useQuery({
    queryKey: ["sprint-history", sprint.id, histOpen],
    enabled: histOpen,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sprint_history")
        .select("*")
        .eq("sprint_id", sprint.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="card-elevated">
      <div className="p-4 flex items-start gap-3">
        <button onClick={() => setOpen((o) => !o)} className="mt-1 text-muted-foreground hover:text-foreground">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold">{sprint.name}</h3>
            <Badge
              className={cn(
                "text-[10px] capitalize",
                fullyDone
                  ? statusColor.concluida
                  : statusColor[sprint.status] || statusColor.planejada
              )}
            >
              {badgeStatus}
            </Badge>
            {sprint.start_date && (
              <span className="text-[11px] text-muted-foreground">
                {formatDateBR(sprint.start_date)}
                {sprint.end_date && ` → ${formatDateBR(sprint.end_date)}`}
              </span>
            )}
          </div>
          {sprint.goal && <p className="text-[12px] text-muted-foreground mt-0.5">{sprint.goal}</p>}

          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                {sprint.ticketCount} chamados · {sprint.taskCount} tarefas
              </span>
              <span>
                {done}/{total} concluídos ({sprint.donePct}%)
              </span>
            </div>
            <Progress value={sprint.donePct} className="h-1.5 [&>div]:bg-emerald-500" />
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
            <Button
              asChild
              size="sm"
              className={fullyDone ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              title="Encerrar sprint com checklist de qualidade e evidências"
            >
              <Link to="/projetos/sprints">
                <ShieldCheck className="h-3 w-3 mr-1" />
                {fullyDone ? "Oficializar encerramento" : "Encerrar (checklist)"}
              </Link>
            </Button>
          )}
          {sprint.status === "concluida" && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                if (
                  !confirm(
                    "Reabrir esta sprint irá remover o encerramento anterior: o chamado-crédito gerado e o checklist de qualidade serão apagados. Deseja continuar?"
                  )
                )
                  return;
                const { error } = await (supabase as any).rpc("reopen_sprint_and_clear_credit", {
                  _sprint_id: sprint.id,
                });
                if (error) {
                  const { toast } = await import("sonner");
                  toast.error("Erro ao reabrir: " + error.message);
                  return;
                }
                const { toast } = await import("sonner");
                toast.success("Sprint reaberta");
                update.mutate({ id: sprint.id, status: "ativa" } as any);
              }}
            >
              <RotateCcw className="h-3 w-3 mr-1" /> Reabrir
            </Button>
          )}
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3 w-3" />
            </Button>
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
          </div>
        </div>
      </div>

      {open && (
        <div className="border-t bg-muted/20">
          <SprintItems projectId={projectId} sprintId={sprint.id} />
        </div>
      )}

      <div className="border-t px-4 py-2">
        <Collapsible open={histOpen} onOpenChange={setHistOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground">
              <History className="h-3 w-3" />
              Histórico da sprint
              <ChevronDown className={cn("h-3 w-3 transition-transform", histOpen && "rotate-180")} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 space-y-1 text-[11px]">
              {history.isLoading && <p className="text-muted-foreground">Carregando…</p>}
              {!history.isLoading && (history.data?.length || 0) === 0 && (
                <p className="text-muted-foreground">Sem eventos registrados.</p>
              )}
              {(history.data || []).map((h: any) => (
                <div key={h.id} className="flex items-start gap-2 py-0.5">
                  <span className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px] uppercase">
                    {h.action}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-foreground/80 truncate">
                      {h.from_status ? `${h.from_status} → ` : ""}
                      <strong>{h.to_status}</strong>
                      {h.quality_score != null && ` · qualidade ${h.quality_score}%`}
                    </div>
                    <div className="text-muted-foreground">
                      {formatDateTimeFullBR(h.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>


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
