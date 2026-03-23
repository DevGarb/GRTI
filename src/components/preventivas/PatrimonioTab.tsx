import { useState } from "react";
import { Monitor, Laptop, Printer, Server, Search, Package, Calendar, User, MapPin } from "lucide-react";
import { format } from "date-fns";
import type { Preventiva } from "@/hooks/usePreventivas";

interface Props {
  preventivas: Preventiva[];
}

const typeIcons: Record<string, React.ReactNode> = {
  Desktop: <Monitor className="h-5 w-5" />,
  Notebook: <Laptop className="h-5 w-5" />,
  Impressora: <Printer className="h-5 w-5" />,
  Servidor: <Server className="h-5 w-5" />,
};

interface PatrimonioItem {
  tag: string;
  type: string;
  sector: string;
  responsible: string;
  totalMaintenances: number;
  lastDate: string;
  lastTechnician: string;
  checklistCompletion: number;
  history: Preventiva[];
}

export default function PatrimonioTab({ preventivas }: Props) {
  const [search, setSearch] = useState("");
  const [expandedTag, setExpandedTag] = useState<string | null>(null);

  // Build patrimonio map from all preventivas
  const patrimonioMap = new Map<string, PatrimonioItem>();
  preventivas.forEach((p) => {
    const existing = patrimonioMap.get(p.asset_tag);
    const vals = Object.values(p.checklist);
    const completion = vals.length > 0 ? (vals.filter(Boolean).length / vals.length) * 100 : 0;

    if (existing) {
      existing.totalMaintenances++;
      existing.history.push(p);
      if (p.execution_date > existing.lastDate) {
        existing.lastDate = p.execution_date;
        existing.lastTechnician = p.creatorName || "";
        existing.sector = p.sector || existing.sector;
        existing.responsible = p.responsible || existing.responsible;
      }
      existing.checklistCompletion =
        (existing.checklistCompletion * (existing.totalMaintenances - 1) + completion) /
        existing.totalMaintenances;
    } else {
      patrimonioMap.set(p.asset_tag, {
        tag: p.asset_tag,
        type: p.equipment_type,
        sector: p.sector || "",
        responsible: p.responsible || "",
        totalMaintenances: 1,
        lastDate: p.execution_date,
        lastTechnician: p.creatorName || "",
        checklistCompletion: completion,
        history: [p],
      });
    }
  });

  const allItems = [...patrimonioMap.values()].sort((a, b) => b.lastDate.localeCompare(a.lastDate));

  const filtered = search
    ? allItems.filter(
        (item) =>
          item.tag.toLowerCase().includes(search.toLowerCase()) ||
          item.type.toLowerCase().includes(search.toLowerCase()) ||
          item.sector.toLowerCase().includes(search.toLowerCase()) ||
          item.responsible.toLowerCase().includes(search.toLowerCase())
      )
    : allItems;

  if (allItems.length === 0) {
    return (
      <div className="p-12 flex flex-col items-center justify-center rounded-xl border border-border bg-card gap-2">
        <Package className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Nenhum patrimônio registrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar patrimônio, tipo, setor..."
          className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
        />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border border-border bg-card">
          <p className="text-xs text-muted-foreground">Total Patrimônios</p>
          <p className="text-xl font-bold text-foreground">{allItems.length}</p>
        </div>
        <div className="p-3 rounded-lg border border-border bg-card">
          <p className="text-xs text-muted-foreground">Desktops</p>
          <p className="text-xl font-bold text-foreground">{allItems.filter((i) => i.type === "Desktop").length}</p>
        </div>
        <div className="p-3 rounded-lg border border-border bg-card">
          <p className="text-xs text-muted-foreground">Notebooks</p>
          <p className="text-xl font-bold text-foreground">{allItems.filter((i) => i.type === "Notebook").length}</p>
        </div>
        <div className="p-3 rounded-lg border border-border bg-card">
          <p className="text-xs text-muted-foreground">Outros</p>
          <p className="text-xl font-bold text-foreground">
            {allItems.filter((i) => i.type !== "Desktop" && i.type !== "Notebook").length}
          </p>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map((item) => (
          <div key={item.tag} className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              onClick={() => setExpandedTag(expandedTag === item.tag ? null : item.tag)}
              className="w-full p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                {typeIcons[item.type] || <Monitor className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-mono font-semibold text-foreground">{item.tag}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{item.type}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  {item.sector && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {item.sector}
                    </span>
                  )}
                  {item.responsible && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {item.responsible}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-foreground">{item.totalMaintenances} manutenções</p>
                <p className="text-xs text-muted-foreground">
                  Última: {format(new Date(item.lastDate), "dd/MM/yyyy")}
                </p>
              </div>
              <div className="shrink-0 w-12">
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.round(item.checklistCompletion)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-0.5">
                  {Math.round(item.checklistCompletion)}%
                </p>
              </div>
            </button>

            {expandedTag === item.tag && (
              <div className="border-t border-border p-4 bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground mb-3">Histórico de Manutenções</p>
                <div className="space-y-2">
                  {item.history
                    .sort((a, b) => b.execution_date.localeCompare(a.execution_date))
                    .map((h) => {
                      const vals = Object.values(h.checklist);
                      const done = vals.filter(Boolean).length;
                      return (
                        <div key={h.id} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                          <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {format(new Date(h.execution_date), "dd/MM/yyyy")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Técnico: {h.creatorName || "—"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-foreground">
                              {done}/{vals.length} itens
                            </p>
                            {h.notes && (
                              <p className="text-xs text-muted-foreground max-w-[200px] truncate">
                                {h.notes.split("\n")[0]}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
