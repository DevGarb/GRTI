import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Priority = "baixa" | "media" | "alta" | "sem";
type Quadrant = 1 | 2 | 3 | 4 | null;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (input: {
    title: string;
    description?: string;
    priority: Priority;
    due_date?: string | null;
    eisenhower_quadrant?: Quadrant;
  }) => Promise<void> | void;
}

export const QUADRANT_LABEL: Record<1 | 2 | 3 | 4, string> = {
  1: "I — Urgente e Importante (Faça agora)",
  2: "II — Não Urgente e Importante (Planeje)",
  3: "III — Urgente e Não Importante (Delegue)",
  4: "IV — Não Urgente e Não Importante (Elimine)",
};

export default function NewTodoModal({ open, onOpenChange, onCreate }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("media");
  const [quadrant, setQuadrant] = useState<string>("none");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle(""); setDescription(""); setPriority("media"); setDueDate(""); setQuadrant("none");
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      due_date: dueDate || null,
      eisenhower_quadrant: quadrant === "none" ? null : (Number(quadrant) as 1 | 2 | 3 | 4),
    });
    setSaving(false);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo TODO</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="O que precisa ser feito?" />
          </div>
          <div>
            <Label>Descrição <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta prioridade</SelectItem>
                  <SelectItem value="media">Média prioridade</SelectItem>
                  <SelectItem value="baixa">Baixa prioridade</SelectItem>
                  <SelectItem value="sem">Sem prioridade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prazo <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Matriz de Eisenhower <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Select value={quadrant} onValueChange={setQuadrant}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem classificação</SelectItem>
                <SelectItem value="1">{QUADRANT_LABEL[1]}</SelectItem>
                <SelectItem value="2">{QUADRANT_LABEL[2]}</SelectItem>
                <SelectItem value="3">{QUADRANT_LABEL[3]}</SelectItem>
                <SelectItem value="4">{QUADRANT_LABEL[4]}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || !title.trim()}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
