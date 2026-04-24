import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateProjectTask } from "@/hooks/useProjectTasks";
import { useSprints } from "@/hooks/useSprints";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  defaultSprintId?: string | null;
}

export default function NewTaskModal({ open, onOpenChange, projectId, defaultSprintId = null }: Props) {
  const create = useCreateProjectTask();
  const { data: sprints = [] } = useSprints(projectId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState<number>(1);
  const [sprintId, setSprintId] = useState<string>(defaultSprintId || "backlog");

  async function submit() {
    if (!title.trim()) return;
    await create.mutateAsync({
      project_id: projectId,
      title: title.trim(),
      description: description.trim() || undefined,
      story_points: Number(points) || 1,
      sprint_id: sprintId === "backlog" ? null : sprintId,
    });
    onOpenChange(false);
    setTitle(""); setDescription(""); setPoints(1);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nova tarefa</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título*</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Pontos</Label>
              <Input type="number" min={1} value={points} onChange={(e) => setPoints(Number(e.target.value))} />
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={create.isPending}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
