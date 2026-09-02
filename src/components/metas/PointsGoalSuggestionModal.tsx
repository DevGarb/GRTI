import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { usePointsGoalSuggestion, useApprovePointsGoals, type PointsSuggestionRow } from "@/hooks/usePointsGoalSuggestion";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  year: number;
  month: number;
  technicians: { user_id: string; full_name: string }[];
}

const TREND_META = {
  crescente: { label: "Crescente", icon: TrendingUp, cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  estavel: { label: "Estável", icon: Minus, cls: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  queda: { label: "Queda", icon: TrendingDown, cls: "bg-red-500/10 text-red-600 border-red-500/30" },
} as const;

export default function PointsGoalSuggestionModal({ open, onOpenChange, year, month, technicians }: Props) {
  const suggest = usePointsGoalSuggestion(year, month);
  const approve = useApprovePointsGoals(year, month);
  const [rows, setRows] = useState<PointsSuggestionRow[]>([]);

  useEffect(() => {
    if (!open) {
      setRows([]);
      return;
    }
    suggest.mutate(technicians, { onSuccess: (r) => setRows(r) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleApprove = async () => {
    await approve.mutateAsync(rows.map((r) => ({ userId: r.userId, name: r.name, suggested: r.suggested })));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Sugestão de meta de pontuação
          </DialogTitle>
          <DialogDescription>
            Sugestões geradas por IA a partir da evolução dos últimos 6 meses de cada técnico. Você pode ajustar os
            valores antes de aprovar.
          </DialogDescription>
        </DialogHeader>

        {suggest.isPending ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Analisando o histórico e calculando as metas…</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma sugestão disponível. Verifique se existem técnicos na organização e tente novamente.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                  <th className="text-left py-2 pr-3">Técnico</th>
                  {rows[0].history.map((h) => (
                    <th key={h.label} className="text-center py-2 px-1.5 font-medium">{h.label}</th>
                  ))}
                  <th className="text-center py-2 px-2">Média</th>
                  <th className="text-center py-2 px-2">Meta atual</th>
                  <th className="text-center py-2 px-2">Sugerida</th>
                  <th className="text-left py-2 pl-3">Justificativa</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => {
                  const trend = TREND_META[r.trend] ?? TREND_META.estavel;
                  const TrendIcon = trend.icon;
                  return (
                    <tr key={r.userId} className="border-b border-border/60 align-top">
                      <td className="py-2.5 pr-3">
                        <div className="font-medium text-foreground">{r.name}</div>
                        <Badge variant="outline" className={`mt-1 gap-1 text-[10px] ${trend.cls}`}>
                          <TrendIcon className="h-3 w-3" /> {trend.label}
                        </Badge>
                      </td>
                      {r.history.map((h) => (
                        <td key={h.label} className="text-center py-2.5 px-1.5 tabular-nums text-muted-foreground">
                          {h.points.toFixed(0)}
                        </td>
                      ))}
                      <td className="text-center py-2.5 px-2 tabular-nums font-medium">{r.average.toFixed(0)}</td>
                      <td className="text-center py-2.5 px-2 tabular-nums text-muted-foreground">
                        {r.currentGoal ?? "—"}
                      </td>
                      <td className="text-center py-2.5 px-2">
                        <Input
                          type="number"
                          min={0}
                          value={r.suggested}
                          onChange={(e) => {
                            const v = Math.max(0, Math.round(Number(e.target.value) || 0));
                            setRows((prev) => prev.map((p, i) => (i === idx ? { ...p, suggested: v } : p)));
                          }}
                          className="h-8 w-20 text-center tabular-nums"
                        />
                      </td>
                      <td className="py-2.5 pl-3 text-xs text-muted-foreground max-w-[280px]">{r.rationale}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={approve.isPending}>
            Fechar
          </Button>
          <Button onClick={handleApprove} disabled={rows.length === 0 || suggest.isPending || approve.isPending}>
            {approve.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Aprovar e definir metas
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
