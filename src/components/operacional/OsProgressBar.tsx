import { cn } from "@/lib/utils";
import { checklistProgress } from "@/lib/oficinaStages";

interface Props {
  items: { done: boolean }[];
  /** classe de cor da barra (ex.: "bg-sky-500") */
  barClass?: string;
  className?: string;
  compact?: boolean;
}

/** Barra de progresso do checklist de serviço da OS. */
export default function OsProgressBar({ items, barClass = "bg-primary", className, compact }: Props) {
  const { done, total, percent } = checklistProgress(items);
  if (!total) return null;
  return (
    <div className={cn("space-y-1", className)}>
      <div className={cn("w-full rounded-full bg-muted overflow-hidden", compact ? "h-1.5" : "h-2")}>
        <div
          className={cn("h-full rounded-full transition-all", percent === 100 ? "bg-emerald-500" : barClass)}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className={cn("text-muted-foreground tabular-nums", compact ? "text-[10px]" : "text-[11px]")}>
        {done}/{total} · {percent}% concluído
      </div>
    </div>
  );
}
