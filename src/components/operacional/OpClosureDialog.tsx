import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Camera, X } from "lucide-react";

export interface ClosurePayload {
  closure_summary: string;
  closed_at: string;
  total_cost?: number;
  photos?: File[];
}

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  title?: string;
  showCost?: boolean;
  hideDate?: boolean;
  allowPhotos?: boolean;
  confirmLabel?: string;
  placeholder?: string;
  initialCost?: number;
  onConfirm: (payload: ClosurePayload) => Promise<void> | void;
}

export default function OpClosureDialog({
  open, onOpenChange, title = "Concluir", showCost, hideDate, allowPhotos,
  confirmLabel = "Concluir", placeholder = "Descreva brevemente a conclusão...",
  initialCost, onConfirm,
}: Props) {
  const [summary, setSummary] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [cost, setCost] = useState<string>("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSummary("");
      setDate(new Date().toISOString().slice(0, 10));
      setCost(initialCost != null ? String(initialCost) : "");
      setPhotos([]);
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
        photos: allowPhotos ? photos : undefined,
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
          {allowPhotos && (
            <div>
              <Label>Fotos (opcional)</Label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setPhotos((prev) => [...prev, ...files]);
                  if (fileRef.current) fileRef.current.value = "";
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Camera className="h-4 w-4 mr-1" /> Adicionar fotos
              </Button>
              {photos.length > 0 && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {photos.map((f, i) => (
                    <div key={i} className="relative">
                      <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-20 object-cover rounded border" />
                      <button
                        type="button"
                        onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
