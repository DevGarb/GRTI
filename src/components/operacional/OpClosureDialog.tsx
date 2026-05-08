import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface ClosurePayload {
  closure_summary: string;
  closed_at: string;
  total_cost?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  title?: string;
  showCost?: boolean;
  hideDate?: boolean;
  confirmLabel?: string;
  placeholder?: string;
  initialCost?: number;
  onConfirm: (payload: ClosurePayload) => Promise<void> | void;
}

export default function OpClosureDialog({
  open, onOpenChange, title = "Concluir", showCost, hideDate,
  confirmLabel = "Concluir", placeholder = "Descreva brevemente a conclusão...",
  initialCost, onConfirm,
}: Props) {
  const [summary, setSummary] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [cost, setCost] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setSummary("");
      setDate(new Date().toISOString().slice(0, 10));
      setCost(initialCost != null ? String(initialCost) : "");
    }
  }, [open, initialCost]);

  const submit = async () => {
    if (!summary.trim()) return;
    setBusy(true);
    try {
      await onConfirm({
        closure_summary: summary.trim(),
        closed_at: date,
        total_cost: showCost ? Number(cost || 0) : undefined,
      });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {!hideDate && (
            <div>
              <Label>Data de conclusão</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          )}
          <div>
            <Label>Descrição *</Label>
            <Textarea rows={4} value={summary} onChange={e => setSummary(e.target.value)} placeholder={placeholder} />
          </div>
          {showCost && (
            <div>
              <Label>Custo final (R$)</Label>
              <Input type="number" step="0.01" min="0" value={cost} onChange={e => setCost(e.target.value)} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button onClick={submit} disabled={!summary.trim() || busy}>{busy ? "Salvando..." : confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
