import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useCreateProject, useUpdateProject, Project } from "@/hooks/useProjects";
import { Shield } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project?: Project | null;
}

export default function NewProjectModal({ open, onOpenChange, project }: Props) {
  const createMut = useCreateProject();
  const updateMut = useUpdateProject();
  const isEdit = !!project;
  const [name, setName] = useState(project?.name || "");
  const [code, setCode] = useState(project?.code || "");
  const [description, setDescription] = useState(project?.description || "");
  const [goal, setGoal] = useState(project?.goal || "");
  const [startDate, setStartDate] = useState(project?.start_date || "");
  const [endDate, setEndDate] = useState(project?.end_date || "");
  const [target, setTarget] = useState<number>(project?.total_points_target ?? 0);
  const [enforceCapacity, setEnforceCapacity] = useState<boolean>(project?.enforce_capacity ?? false);
  const [maxCritical, setMaxCritical] = useState<number>(project?.max_critical_per_sprint ?? 5);

  const reset = () => {
    if (!isEdit) {
      setName(""); setCode(""); setDescription(""); setGoal(""); setStartDate(""); setEndDate(""); setTarget(0);
    }
  };

  async function submit() {
    if (!name.trim()) return;
    const payload: any = {
      name: name.trim(),
      code: code.trim() || undefined,
      description: description.trim() || undefined,
      goal: goal.trim() || undefined,
      start_date: startDate || null,
      end_date: endDate || null,
      total_points_target: Number(target) || 0,
      enforce_capacity: enforceCapacity,
      max_critical_per_sprint: Number(maxCritical) || 5,
    };
    if (isEdit && project) {
      await updateMut.mutateAsync({ id: project.id, ...payload });
    } else {
      await createMut.mutateAsync(payload);
    }
    onOpenChange(false);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar projeto" : "Novo projeto"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome*</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Código</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="INFRA-26" />
            </div>
            <div>
              <Label>Meta de pontos</Label>
              <Input type="number" min={0} value={target} onChange={(e) => setTarget(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <Label>Objetivo</Label>
            <Input value={goal} onChange={(e) => setGoal(e.target.value)} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
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

          <div className="rounded-md border p-3 space-y-3 bg-muted/30">
            <div className="flex items-center gap-2 text-xs font-medium">
              <Shield className="h-3.5 w-3.5" /> Regras de execução
            </div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label className="text-xs">Bloquear quando exceder capacidade da sprint</Label>
                <p className="text-[10px] text-muted-foreground">
                  Se desligado, sistema apenas avisa.
                </p>
              </div>
              <Switch checked={enforceCapacity} onCheckedChange={setEnforceCapacity} />
            </div>
            <div>
              <Label className="text-xs">Máx. de chamados Críticos por sprint</Label>
              <Input
                type="number"
                min={0}
                value={maxCritical}
                onChange={(e) => setMaxCritical(Number(e.target.value))}
                className="h-8 mt-1"
              />
            </div>
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
