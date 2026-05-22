import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateProjectTask, useDeleteProjectTask, type ProjectTask } from "@/hooks/useProjectTasks";
import { useSprints } from "@/hooks/useSprints";
import { Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task: ProjectTask | null;
}

export default function TaskDetailModal({ open, onOpenChange, task }: Props) {
  const update = useUpdateProjectTask();
  const del = useDeleteProjectTask();
  const { data: sprints = [] } = useSprints(task?.project_id);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState<number>(1);
  const [status, setStatus] = useState<string>("todo");
  const [sprintId, setSprintId] = useState<string>("backlog");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setPoints(task.story_points);
      setStatus(task.status);
      setSprintId(task.sprint_id || "backlog");
    }
  }, [task]);

  if (!task) return null;

  async function save() {
    if (!task) return;
    await update.mutateAsync({
      id: task.id,
      title: title.trim() || task.title,
      description: description.trim() || null,
      story_points: Number(points) || 1,
      status,
      sprint_id: sprintId === "backlog" ? null : sprintId,
    });
    onOpenChange(false);
  }

  async function remove() {
    if (!task) return;
    if (!confirm("Excluir tarefa?")) return;
    await del.mutateAsync(task.id);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Detalhes da tarefa</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={10}
              className="font-mono text-xs whitespace-pre-wrap"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Pontos</Label>
              <Input type="number" min={1} value={points} onChange={(e) => setPoints(Number(e.target.value))} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">A fazer</SelectItem>
                  <SelectItem value="doing">Em andamento</SelectItem>
                  <SelectItem value="done">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sprint</Label>
              <Select value={sprintId} onValueChange={setSprintId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  {sprints.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Criada em {new Date(task.created_at).toLocaleString("pt-BR")}
          </div>
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={remove} disabled={del.isPending}>
            <Trash2 className="h-3.5 w-3.5 mr-1 text-destructive" /> Excluir
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={save} disabled={update.isPending}>Salvar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
