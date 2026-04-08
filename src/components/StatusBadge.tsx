import { cn } from "@/lib/utils";

type Status = string;
type Priority = string;

export function StatusBadge({ status }: { status: Status }) {
  const styles: Record<string, string> = {
    "Aberto": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    "Em Andamento": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    "Aguardando Aprovação": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    "Aprovado": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    "Fechado": "bg-gray-100 text-gray-500 dark:bg-gray-800/30 dark:text-gray-400",
    "Disponível": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-300 dark:border-red-700",
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
