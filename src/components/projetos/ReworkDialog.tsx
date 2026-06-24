import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const REWORK_CATEGORIES = [
  "Erro funcional",
  "Regra de negócio",
  "Integração",
  "Frontend/UI",
  "Documentação",
  "Homologação reprovada",
];

interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: (data: { category: string; reason: string; notes: string }) => void;
  taskTitle?: string;
}

export default function ReworkDialog({ open, onCancel, onConfirm, taskTitle }: Props) {
  const [category, setCategory] = useState(REWORK_CATEGORIES[0]);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const submit = () => {
    if (!reason.trim()) return;
    onConfirm({ category, reason, notes });
    setReason("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar retrabalho</DialogTitle>
        </DialogHeader>
        {taskTitle && (
          <p className="text-sm text-muted-foreground">Tarefa: <span className="font-medium text-foreground">{taskTitle}</span></p>
        )}
        <div className="space-y-3">
          <div>
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REWORK_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Motivo *</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Descreva o que precisa ser corrigido" />
          </div>
          <div>
            <Label>Observação</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={submit} disabled={!reason.trim()}>Confirmar retrabalho</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
