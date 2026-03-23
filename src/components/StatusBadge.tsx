import { cn } from "@/lib/utils";

type Status = string;
type Priority = string;

export function StatusBadge({ status }: { status: Status }) {
  const styles: Record<string, string> = {
    "Aberto": "status-open",
    "Em Andamento": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    "Aguardando Aprovação": "status-waiting",
    "Aprovado": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    "Fechado": "status-closed",
  };

  return (
    <span className={cn("status-badge", styles[status] || "bg-muted text-muted-foreground")}>
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border",
        priority === "Urgente" && "text-priority-urgent border-priority-urgent/30 bg-status-open-bg",
        priority === "Alta" && "text-priority-high border-priority-high/30 bg-status-waiting-bg",
        priority === "Média" && "text-priority-medium border-priority-medium/30 bg-[hsl(45_93%_95%)]",
        priority === "Baixa" && "text-priority-low border-priority-low/30 bg-muted"
      )}
    >
      {priority}
    </span>
  );
}
