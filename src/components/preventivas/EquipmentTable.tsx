import { Monitor, Laptop, Printer, Server } from "lucide-react";
import { format } from "date-fns";

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
}

const typeIcons: Record<string, React.ReactNode> = {
  Desktop: <Monitor className="h-4 w-4" />,
  Notebook: <Laptop className="h-4 w-4" />,
  Impressora: <Printer className="h-4 w-4" />,
  Servidor: <Server className="h-4 w-4" />,
};

export default function EquipmentTable({ equipment }: Props) {
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
      {equipment.map((eq) => (
        <div key={eq.tag} className="p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              {typeIcons[eq.type] || <Monitor className="h-4 w-4" />}
            </div>
            <div>
              <p className="font-mono font-semibold text-foreground">{eq.tag}</p>
              <p className="text-xs text-muted-foreground">{eq.type}</p>
              {eq.sector && <p className="text-[11px] text-muted-foreground">Setor: {eq.sector}</p>}
              {eq.responsible && <p className="text-[11px] text-muted-foreground">Resp: {eq.responsible}</p>}
            </div>
          </div>
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
      ))}
    </div>
  );
}
