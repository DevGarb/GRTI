import { AlertTriangle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import type { OverdueEquipment } from "@/hooks/usePreventivas";

interface Props {
  overdueEquipment: OverdueEquipment[];
  onNewPreventiva: () => void;
}

export default function OverdueAlerts({ overdueEquipment, onNewPreventiva }: Props) {
  const overdue = overdueEquipment.filter((e) => e.status === "overdue");
  const warning = overdueEquipment.filter((e) => e.status === "warning");

  if (overdue.length === 0 && warning.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Overdue — red */}
      {overdue.length > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-4 space-y-3">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm font-semibold">
              {overdue.length} equipamento{overdue.length > 1 ? "s" : ""} com preventiva vencida
            </span>
          </div>
          <div className="grid gap-2">
            {overdue.map((eq) => (
              <div key={eq.asset_tag} className="flex items-center justify-between rounded-md bg-background/80 px-3 py-2 text-sm border border-border">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-medium text-foreground">{eq.asset_tag}</span>
                  <span className="text-muted-foreground">{eq.equipment_type}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground text-xs">
                    Última: {format(new Date(eq.last_date), "dd/MM/yyyy")}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                    <Clock className="h-3.5 w-3.5" />
                    Vencida há {Math.abs(eq.days_until_due)} dias
                  </span>
                  <button onClick={onNewPreventiva} className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90">
                    Nova Preventiva
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning — amber */}
      {warning.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm font-semibold">
              {warning.length} equipamento{warning.length > 1 ? "s" : ""} com preventiva próxima a vencer
            </span>
          </div>
          <div className="grid gap-2">
            {warning.map((eq) => (
              <div key={eq.asset_tag} className="flex items-center justify-between rounded-md bg-background/80 px-3 py-2 text-sm border border-border">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-medium text-foreground">{eq.asset_tag}</span>
                  <span className="text-muted-foreground">{eq.equipment_type}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground text-xs">
                    Última: {format(new Date(eq.last_date), "dd/MM/yyyy")}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <Clock className="h-3.5 w-3.5" />
                    Vence em {eq.days_until_due} dia{eq.days_until_due !== 1 ? "s" : ""}
                  </span>
                  <button onClick={onNewPreventiva} className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90">
                    Agendar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
