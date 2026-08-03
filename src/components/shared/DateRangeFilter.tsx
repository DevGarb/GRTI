import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

// Filtro de período por data inicial/final (YYYY-MM-DD).
// Campos vazios = sem limite, permitindo visualização independente da data.

/** Data inicial padrão do sistema: 01/01/1990 (histórico completo). */
export function currentMonthStart() {
  return "1990-01-01";
}

export function todayStr() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

/** Verifica se um timestamp/date ISO está dentro do intervalo (limites opcionais). */
export function inDateRange(value: string | null | undefined, from: string, to: string) {
  if (!value) return !from && !to;
  const d = value.slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

interface Props {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onClear?: () => void;
  className?: string;
  showLabels?: boolean;
}

export default function DateRangeFilter({
  from, to, onFromChange, onToChange, onClear, className, showLabels = true,
}: Props) {
  return (
    <div className={"flex items-end gap-2 " + (className ?? "")}>
      <div>
        {showLabels && <Label className="text-xs">De</Label>}
        <Input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} className="w-[150px]" />
      </div>
      <div>
        {showLabels && <Label className="text-xs">Até</Label>}
        <Input type="date" value={to} onChange={(e) => onToChange(e.target.value)} className="w-[150px]" />
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => (onClear ? onClear() : (onFromChange(""), onToChange("")))}
        title="Limpar período (mostrar tudo)"
      >
        <X className="h-3 w-3 mr-1" /> Tudo
      </Button>
    </div>
  );
}
