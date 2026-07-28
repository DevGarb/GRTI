import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Filtro padrão de mês/ano usado nas telas de Metas e MVP.
// Mantém a mesma lista de anos e o mesmo componente visual em todo o app.

export const PERIOD_YEARS = [2024, 2025, 2026, 2027];
export const PERIOD_MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2000, i, 1).toLocaleString("pt-BR", { month: "long" }),
}));

interface Props {
  year: number;
  month: number;
  onYearChange: (y: number) => void;
  onMonthChange: (m: number) => void;
  className?: string;
}

export default function PeriodFilter({ year, month, onYearChange, onMonthChange, className }: Props) {
  return (
    <div className={"flex items-center gap-2 " + (className ?? "")}>
      <Select value={String(month)} onValueChange={(v) => onMonthChange(Number(v))}>
        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          {PERIOD_MONTHS.map((m) => (
            <SelectItem key={m.value} value={String(m.value)} className="capitalize">
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(year)} onValueChange={(v) => onYearChange(Number(v))}>
        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
        <SelectContent>
          {PERIOD_YEARS.map((y) => (
            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
