import { AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";
import type { OverdueEquipment } from "@/hooks/usePreventivas";

interface Props {
  overdueEquipment: OverdueEquipment[];
  onNewPreventiva: () => void;
}

export default function OverdueAlerts({ overdueEquipment, onNewPreventiva }: Props) {
  if (overdueEquipment.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 space-y-3">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
        <AlertTriangle className="h-5 w-5" />
        <span className="text-sm font-semibold">
          {overdueEquipment.length} equipamento{overdueEquipment.length > 1 ? "s" : ""} com preventiva vencida
        </span>
      </div>
      <div className="grid gap-2">
        {overdueEquipment.map((eq) => (
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
                {eq.days_since}/{eq.interval_days} dias
              </span>
              <button onClick={onNewPreventiva} className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90">
                Nova Preventiva
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
