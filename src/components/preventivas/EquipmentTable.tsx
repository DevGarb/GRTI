import { Monitor, Laptop, Printer, Server, Clock, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import type { OverdueEquipment } from "@/hooks/usePreventivas";

interface Equipment {
  type: string;
  tag: string;
  count: number;
  lastDate: string;
  sector: string;
  responsible: string;
}

interface Props {
  equipment: Equipment[];
  statusData?: OverdueEquipment[];
}

const typeIcons: Record<string, React.ReactNode> = {
  Desktop: <Monitor className="h-4 w-4" />,
  Notebook: <Laptop className="h-4 w-4" />,
  Impressora: <Printer className="h-4 w-4" />,
  Servidor: <Server className="h-4 w-4" />,
};

function StatusBadge({ eq }: { eq: OverdueEquipment }) {
  if (eq.status === "overdue") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">
        <AlertTriangle className="h-3 w-3" />
        Vencida há {Math.abs(eq.days_until_due)}d
      </span>
    );
  }
  if (eq.status === "warning") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
        <AlertCircle className="h-3 w-3" />
        Vence em {eq.days_until_due}d
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
      <CheckCircle2 className="h-3 w-3" />
      {eq.days_until_due}d restantes
    </span>
  );
}

export default function EquipmentTable({ equipment, statusData }: Props) {
  const statusMap = new Map((statusData || []).map((s) => [s.asset_tag, s]));

  if (equipment.length === 0) {
    return (
      <div className="p-12 flex flex-col items-center justify-center rounded-xl border border-border bg-card gap-2">
        <Monitor className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Nenhum equipamento encontrado neste período.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {equipment.map((eq) => {
        const statusInfo = statusMap.get(eq.tag);
        const borderClass =
          statusInfo?.status === "overdue"
            ? "border-red-300 dark:border-red-800"
            : statusInfo?.status === "warning"
            ? "border-amber-300 dark:border-amber-700"
            : "border-border";

        return (
          <div key={eq.tag} className={`p-4 rounded-xl border ${borderClass} bg-card hover:shadow-md transition-shadow`}>
            <div className="flex items-start gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                {typeIcons[eq.type] || <Monitor className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono font-semibold text-foreground">{eq.tag}</p>
                <p className="text-xs text-muted-foreground">{eq.type}</p>
                {eq.sector && <p className="text-[11px] text-muted-foreground">Setor: {eq.sector}</p>}
                {eq.responsible && <p className="text-[11px] text-muted-foreground">Resp: {eq.responsible}</p>}
              </div>
            </div>

            {statusInfo && (
              <div className="mb-3">
                <StatusBadge eq={statusInfo} />
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Manutenções</p>
                <p className="font-semibold text-foreground">{eq.count}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground text-xs">Última</p>
                <p className="font-medium text-foreground">{format(new Date(eq.lastDate), "dd/MM/yyyy")}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
