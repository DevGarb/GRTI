import { useState } from "react";
import { Check, ListChecks, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import OsProgressBar from "./OsProgressBar";
import type { ServiceChecklistItem } from "@/hooks/useOficina";

interface Props {
  items: ServiceChecklistItem[];
  readOnly?: boolean;
  barClass?: string;
  onToggle?: (item: ServiceChecklistItem) => void;
  onAdd?: (label: string) => void;
  onRemove?: (id: string) => void;
  className?: string;
}

/** Checklist de etapas do serviço da OS, com barra de progresso. */
export default function OsChecklist({ items, readOnly, barClass, onToggle, onAdd, onRemove, className }: Props) {
  const [newLabel, setNewLabel] = useState("");

  return (
    <div className={cn("border rounded-md p-3 bg-muted/30 space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium flex items-center gap-1">
          <ListChecks className="h-4 w-4" /> Andamento do serviço
        </span>
      </div>

      <OsProgressBar items={items} barClass={barClass} />

      <div className="space-y-1">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum item de checklist nesta OS.</p>
        )}
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-2">
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
            <span className={cn("text-sm flex-1", it.done && "text-muted-foreground line-through")}>
              {it.label}
            </span>
            {it.done && it.done_at && (
              <span className="text-[10px] text-muted-foreground shrink-0">
                {new Date(it.done_at).toLocaleDateString("pt-BR")}
              </span>
            )}
            {!readOnly && onRemove && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemove(it.id)} aria-label="Remover item">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {!readOnly && onAdd && (
        <div className="flex items-center gap-2">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Novo item do checklist"
            className="h-8"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newLabel.trim()) { onAdd(newLabel); setNewLabel(""); }
            }}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => { if (newLabel.trim()) { onAdd(newLabel); setNewLabel(""); } }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Incluir
          </Button>
        </div>
      )}
    </div>
  );
}
