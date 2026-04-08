import { CalendarIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface MonthSelectorProps {
  value: string; // format: "YYYY-MM"
  onChange: (value: string) => void;
  /** How many past years to show (default 2) */
  yearRange?: number;
}

function generateOptions(yearRange: number) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const options: { label: string; value: string }[] = [];

  for (let y = currentYear; y >= currentYear - yearRange; y--) {
    const maxMonth = y === currentYear ? now.getMonth() : 11;
    for (let m = maxMonth; m >= 0; m--) {
      options.push({
        label: `${MONTH_NAMES[m]} ${y}`,
        value: `${y}-${String(m + 1).padStart(2, "0")}`,
      });
    }
  }
  return options;
}

export function getCurrentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getMonthDateRange(value: string) {
  const [year, month] = value.split("-").map(Number);
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0, 23, 59, 59, 999);
  return { from, to };
}

export default function MonthSelector({ value, onChange, yearRange = 2 }: MonthSelectorProps) {
  const options = generateOptions(yearRange);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px]">
        <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
        <SelectValue placeholder="Selecione o mês" />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
