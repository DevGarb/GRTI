import { useState } from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Eye, Camera } from "lucide-react";
import { format } from "date-fns";
import type { Preventiva } from "@/hooks/usePreventivas";

interface Props {
  preventivas: Preventiva[];
}

export default function PreventivasTable({ preventivas }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (preventivas.length === 0) {
    return (
      <div className="p-12 flex flex-col items-center justify-center rounded-xl border border-border bg-card gap-2">
        <CheckCircle2 className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Nenhuma preventiva registrada para este período.</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl overflow-x-auto bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Patrimônio</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Setor</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Responsável</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Checklist</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Técnico</th>
            <th className="w-10 px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {preventivas.map((p) => {
            const checked = Object.values(p.checklist).filter(Boolean).length;
            const total = Object.keys(p.checklist).length;
            const isComplete = checked === total && total > 0;
            const isExpanded = expandedId === p.id;

            return (
              <>
                <tr
                  key={p.id}
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-foreground">{format(new Date(p.execution_date), "dd/MM/yyyy")}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted text-foreground text-xs font-medium">
                      {p.equipment_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono font-medium text-foreground">{p.asset_tag}</td>
                  <td className="px-4 py-3 text-foreground text-xs">{p.sector || "—"}</td>
                  <td className="px-4 py-3 text-foreground text-xs">{p.responsible || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="relative group/checklist" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2 cursor-pointer">
                        <div className="flex-1 h-1.5 bg-muted rounded-full max-w-[80px]">
                          <div
                            className={`h-full rounded-full transition-all ${isComplete ? "bg-emerald-500" : "bg-amber-500"}`}
                            style={{ width: total > 0 ? `${(checked / total) * 100}%` : "0%" }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${isComplete ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                          {checked}/{total}
                        </span>
                      </div>
                      {/* Hover tooltip - positioned above */}
                      <div className="absolute left-0 bottom-full mb-2 z-50 hidden group-hover/checklist:block w-56 p-3 rounded-lg border border-border bg-popover shadow-lg">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Checklist</p>
                        <div className="space-y-1">
                          {Object.entries(p.checklist).map(([item, done]) => (
                            <div key={item} className="flex items-center gap-1.5 text-xs">
                              {done ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-400 shrink-0" />
                              )}
                              <span className={done ? "text-foreground" : "text-muted-foreground line-through"}>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground">{p.creatorName}</td>
                  <td className="px-4 py-3">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${p.id}-detail`}>
                    <td colSpan={8} className="px-6 py-4 bg-muted/20">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Checklist items */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Itens do Checklist</h4>
                          <div className="grid grid-cols-2 gap-1.5">
                            {Object.entries(p.checklist).map(([item, done]) => (
                              <div key={item} className="flex items-center gap-2 text-sm">
                                {done ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                                )}
                                <span className={done ? "text-foreground" : "text-muted-foreground"}>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Notes & photos */}
                        <div className="space-y-3">
                          {p.notes && (
                            <div>
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Observações</h4>
                              <p className="text-sm text-foreground whitespace-pre-wrap bg-background p-3 rounded-lg border border-border">{p.notes}</p>
                            </div>
                          )}
                          {(p as any).photos && (p as any).photos.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Camera className="h-3.5 w-3.5" /> Fotos
                              </h4>
                              <div className="flex gap-2 flex-wrap">
                                {(p as any).photos.map((url: string, i: number) => (
                                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                    <img src={url} alt={`Foto ${i + 1}`} className="h-20 w-20 object-cover rounded-lg border border-border" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
