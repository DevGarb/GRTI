import { useMemo, useState } from "react";
import { Check, ListChecks, Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  requestedPoints, maxOsPoints, isDuplicateLabel, formatPoints,
  type OsServiceItem,
} from "@/lib/oficinaScoring";
import type { ExtraService } from "@/hooks/useOficinaScoring";

interface Props {
  items: OsServiceItem[];
  availableExtras: ExtraService[];
  readOnly?: boolean;
  barClass?: string;
  onToggle?: (item: OsServiceItem) => void;
  onAddExtra?: (extra: ExtraService) => void;
  onAddCustom?: (label: string) => void;
  onRemove?: (item: OsServiceItem) => void;
  className?: string;
}

const TYPE_TAG: Record<string, { label: string; chip: string } | null> = {
  checklist: null,
  adicional: { label: "Adicional", chip: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  nao_cadastrado: { label: "Não cadastrado", chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
};

/** Checklist pontuado da OS: execução pelo mecânico + inclusão de serviços extras. */
export default function OsScoredChecklist({
  items, availableExtras, readOnly, barClass, onToggle, onAddExtra, onAddCustom, onRemove, className,
}: Props) {
  const [extraId, setExtraId] = useState("");
  const [customLabel, setCustomLabel] = useState("");

  const done = items.filter((i) => i.done).length;
  const requested = requestedPoints(items);
  const max = maxOsPoints(items);

  // Extras disponíveis excluindo os que já estão na OS (anti-duplicidade)
  const selectableExtras = useMemo(
    () => availableExtras.filter((e) => !isDuplicateLabel(items, e.name)),
    [availableExtras, items],
  );

  return (
    <div className={cn("border rounded-md p-3 bg-muted/30 space-y-3", className)}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm font-medium flex items-center gap-1">
          <ListChecks className="h-4 w-4" /> Serviços executados
        </span>
        <span className="text-xs text-muted-foreground">
          {done}/{items.length} · {formatPoints(requested)} pts solicitados de {formatPoints(max)}
        </span>
      </div>

      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", barClass || "bg-emerald-500")}
          style={{ width: `${items.length ? Math.round((done / items.length) * 100) : 0}%` }}
        />
      </div>

      <div className="space-y-1">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum serviço vinculado a esta OS.</p>
        )}
        {pending.length > 0 && (
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground pt-1">
            A realizar ({pending.length})
          </p>
        )}
        {[...pending, ...concluded].map((it, idx) => {
          const showDoneHeader = concluded.length > 0 && idx === pending.length;
          const tag = TYPE_TAG[it.item_type];
          return (
            <div key={it.id}>
            {showDoneHeader && (
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground pt-2">
                Concluídos ({concluded.length})
              </p>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={readOnly}
                onClick={() => onToggle?.(it)}
                className={cn(
                  "h-5 w-5 shrink-0 rounded border flex items-center justify-center transition",
                  it.done ? "bg-emerald-500 border-emerald-500 text-white" : "bg-background",
                  !readOnly && "hover:border-primary",
                )}
                aria-label={it.done ? `Desmarcar ${it.label}` : `Marcar ${it.label}`}
              >
                {it.done && <Check className="h-3.5 w-3.5" />}
              </button>
              <span className={cn("text-sm flex-1 min-w-0 truncate", it.done && "text-muted-foreground line-through")}>
                {it.label}
              </span>
              {tag && (
                <Badge variant="secondary" className={cn("text-[9px] px-1 py-0 shrink-0", tag.chip)}>{tag.label}</Badge>
              )}
              <span className="text-[10px] font-semibold text-primary shrink-0 tabular-nums">
                +{formatPoints(it.points)} pt
              </span>
              {it.done && it.done_at && (
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(it.done_at).toLocaleDateString("pt-BR")}
                </span>
              )}
              {!readOnly && onRemove && (
                <button
                  type="button"
                  title={`Excluir ${it.label}`}
                  aria-label={`Excluir ${it.label}`}
                  className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                  onClick={() => {
                    if (window.confirm(`Excluir o item "${it.label}" desta OS?`)) onRemove(it);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {!readOnly && (onAddExtra || onAddCustom) && (
        <div className="space-y-2 pt-1 border-t">
          {onAddExtra && selectableExtras.length > 0 && (
            <div className="flex items-center gap-2">
              <Select value={extraId} onValueChange={setExtraId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Serviço extra da biblioteca" />
                </SelectTrigger>
                <SelectContent>
                  {selectableExtras.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} (+{formatPoints(e.points)} pt)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm" variant="outline"
                disabled={!extraId}
                onClick={() => {
                  const extra = selectableExtras.find((e) => e.id === extraId);
                  if (extra) { onAddExtra(extra); setExtraId(""); }
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Incluir
              </Button>
            </div>
          )}
          {onAddCustom && (
            <div className="flex items-center gap-2">
              <Input
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="Serviço não cadastrado (admin define os pontos)"
                className="h-8 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customLabel.trim()) { onAddCustom(customLabel); setCustomLabel(""); }
                }}
              />
              <Button
                size="sm" variant="outline"
                onClick={() => { if (customLabel.trim()) { onAddCustom(customLabel); setCustomLabel(""); } }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Incluir
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
