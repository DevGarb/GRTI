import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title?: string;
  subtitle?: string;
  targetLabel?: string;
  busy?: boolean;
  onSubmit: (rating: number, comment: string) => Promise<void> | void;
}

export default function OpRatingDialog({
  open, onOpenChange, title = "Avaliar atendimento",
  subtitle = "Como foi a execução dessa demanda?", targetLabel, busy, onSubmit,
}: Props) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (open) { setRating(0); setHover(0); setComment(""); }
  }, [open]);

  const submit = async () => {
    if (rating < 1) return;
    await onSubmit(rating, comment);
  };

  const active = hover || rating;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
            {targetLabel && (
              <p className="text-xs font-medium mt-1 text-foreground">{targetLabel}</p>
            )}
          </div>
          <div className="flex items-center justify-center gap-2 py-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                className="transition-transform hover:scale-110"
                aria-label={`${n} estrelas`}
              >
                <Star
                  className={cn(
                    "h-10 w-10 transition-colors",
                    n <= active ? "fill-amber-400 text-amber-400" : "text-slate-300",
                  )}
                />
              </button>
            ))}
          </div>
          <div className="text-center text-sm font-medium">
            {rating === 0 && <span className="text-muted-foreground">Toque em uma estrela</span>}
            {rating === 1 && <span className="text-rose-600">Muito insatisfeito</span>}
            {rating === 2 && <span className="text-orange-600">Insatisfeito</span>}
            {rating === 3 && <span className="text-amber-600">Regular</span>}
            {rating === 4 && <span className="text-lime-600">Bom</span>}
            {rating === 5 && <span className="text-emerald-600">Excelente</span>}
          </div>
          <div>
            <label className="text-sm font-medium">Observação (opcional)</label>
            <Textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Conte pra gente o que achou, sugestões, elogios..."
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Depois
          </Button>
          <Button onClick={submit} disabled={rating < 1 || busy}>
            {busy ? "Enviando..." : "Enviar avaliação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
