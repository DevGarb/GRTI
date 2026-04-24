import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateSprint, useUpdateSprint, Sprint } from "@/hooks/useSprints";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  sprint?: Sprint | null;
}

export default function NewSprintModal({ open, onOpenChange, projectId, sprint }: Props) {
  const createMut = useCreateSprint();
  const updateMut = useUpdateSprint();
  const isEdit = !!sprint;
  const [name, setName] = useState(sprint?.name || "");
  const [goal, setGoal] = useState(sprint?.goal || "");
  const [startDate, setStartDate] = useState(sprint?.start_date || "");
  const [endDate, setEndDate] = useState(sprint?.end_date || "");
  const [capacity, setCapacity] = useState<number>(sprint?.capacity_points ?? 100);

  async function submit() {
    if (!name.trim()) return;
    if (isEdit && sprint) {
      await updateMut.mutateAsync({
        id: sprint.id,
        name: name.trim(),
        goal: goal.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        capacity_points: Number(capacity) || 0,
      });
    } else {
      await createMut.mutateAsync({
        project_id: projectId,
        name: name.trim(),
        goal: goal.trim() || undefined,
        start_date: startDate || null,
        end_date: endDate || null,
        capacity_points: Number(capacity) || 0,
      });
    }
    onOpenChange(false);
    if (!isEdit) { setName(""); setGoal(""); setStartDate(""); setEndDate(""); setCapacity(100); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar sprint" : "Nova sprint"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome*</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sprint 1" />
          </div>
          <div>
            <Label>Objetivo</Label>
            <Textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Início</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>Fim</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Capacidade (pontos)</Label>
            <Input type="number" min={0} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={createMut.isPending || updateMut.isPending}>
            {isEdit ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
