import { useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  DragOverlay,
  closestCenter,
} from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GripVertical, AlertCircle } from "lucide-react";
import { useState } from "react";
import { BacklogItem, TASK_STATUSES, TASK_PRIORITIES, useUpdateBacklogItem } from "@/hooks/useBacklog";
import ReworkDialog from "@/components/projetos/ReworkDialog";
import TaskAuthorBadge from "@/components/projetos/TaskAuthorBadge";
import { useTaskStatusAuthors, type TaskStatusAuthor } from "@/hooks/useTaskStatusAuthors";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_STYLES: Record<string, { bg: string; ring: string; label: string }> = {
  Pendente: { bg: "bg-slate-500/10", ring: "ring-slate-500/30", label: "text-slate-700 dark:text-slate-300" },
  "Em Desenvolvimento": { bg: "bg-blue-500/10", ring: "ring-blue-500/30", label: "text-blue-700 dark:text-blue-300" },
  "Em Homologação": { bg: "bg-amber-500/10", ring: "ring-amber-500/30", label: "text-amber-700 dark:text-amber-300" },
  Concluído: { bg: "bg-emerald-500/10", ring: "ring-emerald-500/30", label: "text-emerald-700 dark:text-emerald-300" },
  Retrabalho: { bg: "bg-red-500/10", ring: "ring-red-500/30", label: "text-red-700 dark:text-red-300" },
};

const PRIO_COLORS: Record<string, string> = {
  Baixa: "bg-slate-500/15 text-slate-700",
  Média: "bg-blue-500/15 text-blue-700",
  Alta: "bg-amber-500/15 text-amber-700",
  Crítica: "bg-red-500/15 text-red-700",
};

function TaskCard({ item, dragging, author }: { item: BacklogItem; dragging?: boolean; author?: TaskStatusAuthor }) {
  const update = useUpdateBacklogItem();
  return (
    <div
      className={`rounded-md border bg-card p-2.5 text-xs shadow-sm space-y-1.5 ${
        dragging ? "rotate-2 shadow-lg" : ""
      }`}
    >
      <div className="flex items-start gap-1">
        <GripVertical className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
        <div className="font-medium leading-tight flex-1">{item.title}</div>
        <div onPointerDown={(e) => e.stopPropagation()}>
          <TaskAuthorBadge author={author} />
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground truncate pl-4">
        {item.project_name || "Projeto"} · {item.assignee_name || "Não atribuído"}
      </div>
      <div className="flex items-center gap-1 pl-4 flex-wrap" onPointerDown={(e) => e.stopPropagation()}>
        <Select
          value={item.priority}
          onValueChange={(v) => update.mutate({ id: item.id, priority: v })}
        >
          <SelectTrigger className={`h-6 px-2 text-[10px] w-auto ${PRIO_COLORS[item.priority] || ""}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TASK_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-[10px]">
          {item.story_points} pts
        </Badge>
        {item.rework_count > 0 && (
          <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-700 gap-0.5">
            <AlertCircle className="h-2.5 w-2.5" />
            {item.rework_count}
          </Badge>
        )}
      </div>
    </div>
  );
}

function DraggableCard({ item }: { item: BacklogItem }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? "opacity-30" : ""}`}
    >
      <TaskCard item={item} />
    </div>
  );
}

function Column({ status, items }: { status: string; items: BacklogItem[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const style = STATUS_STYLES[status];
  const total = items.reduce((s, i) => s + (i.story_points || 0), 0);
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-lg border ${style.bg} ${
        isOver ? `ring-2 ${style.ring}` : ""
      } min-h-[400px] max-h-[calc(100vh-260px)]`}
    >
      <div className="px-3 py-2 border-b flex items-center justify-between sticky top-0 z-10 bg-inherit rounded-t-lg">
        <div className={`text-xs font-semibold ${style.label}`}>{status}</div>
        <div className="text-[10px] text-muted-foreground">
          {items.length} · {total}pts
        </div>
      </div>
      <div className="p-2 space-y-2 overflow-y-auto flex-1">
        {items.map((i) => (
          <DraggableCard key={i.id} item={i} />
        ))}
        {items.length === 0 && (
          <div className="text-[11px] text-muted-foreground text-center py-6">Sem tarefas</div>
        )}
      </div>
    </div>
  );
}

export default function BacklogKanban({ items }: { items: BacklogItem[] }) {
  const update = useUpdateBacklogItem();
  const { user } = useAuth();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reworkPending, setReworkPending] = useState<{ task: BacklogItem; newStatus: string } | null>(null);

  const grouped = useMemo(() => {
    const g: Record<string, BacklogItem[]> = {};
    TASK_STATUSES.forEach((s) => (g[s] = []));
    items.forEach((i) => {
      const s = TASK_STATUSES.includes(i.status) ? i.status : "Pendente";
      g[s].push(i);
    });
    return g;
  }, [items]);

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const taskId = String(e.active.id);
    const newStatus = e.over?.id ? String(e.over.id) : null;
    if (!newStatus || !TASK_STATUSES.includes(newStatus)) return;
    const item = items.find((i) => i.id === taskId);
    if (!item || item.status === newStatus) return;
    // Concluído → outro status exige registro de retrabalho
    if (item.status === "Concluído" && newStatus !== "Concluído") {
      setReworkPending({ task: item, newStatus });
      return;
    }
    update.mutate({ id: taskId, status: newStatus });
  };

  const activeItem = activeId ? items.find((i) => i.id === activeId) : null;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e) => setActiveId(String(e.active.id))}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          {TASK_STATUSES.map((s) => (
            <Column key={s} status={s} items={grouped[s]} />
          ))}
        </div>
        <DragOverlay>{activeItem ? <TaskCard item={activeItem} dragging /> : null}</DragOverlay>
      </DndContext>
      <ReworkDialog
        open={!!reworkPending}
        onCancel={() => setReworkPending(null)}
        taskTitle={reworkPending?.task.title}
        onConfirm={({ category, reason, notes }) => {
          if (!reworkPending) return;
          update.mutate({
            id: reworkPending.task.id,
            status: "Retrabalho",
            rework_category: category,
            rework_reason: reason,
            rework_notes: notes,
            rework_requested_by: user?.id,
          } as any);
          setReworkPending(null);
        }}
      />
    </>
  );
}
