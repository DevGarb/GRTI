import { useState } from "react";
import type { MaintenanceInterval } from "@/hooks/usePreventivas";
import type { UseMutationResult } from "@tanstack/react-query";

interface Props {
  intervals: MaintenanceInterval[];
  updateInterval: UseMutationResult<void, Error, { id: string; interval_days: number }>;
}

const presets = [30, 60, 90, 120, 180];

export default function IntervalConfig({ intervals, updateInterval }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState(0);

  const startEdit = (interval: MaintenanceInterval) => {
    setEditing(interval.id);
    setTempValue(interval.interval_days);
  };

  const save = (id: string) => {
    updateInterval.mutate({ id, interval_days: tempValue });
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configure o intervalo máximo (em dias) entre preventivas para cada tipo de equipamento. Equipamentos que ultrapassarem esse prazo aparecerão como vencidos.
      </p>
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo de Equipamento</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Intervalo (dias)</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {intervals.map((interval) => (
              <tr key={interval.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">{interval.equipment_type}</td>
                <td className="px-4 py-3">
                  {editing === interval.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={tempValue}
                        onChange={(e) => setTempValue(Number(e.target.value))}
                        className="w-20 px-2 py-1.5 rounded border border-input bg-background text-sm text-foreground"
                      />
                      <div className="flex gap-1">
                        {presets.map((p) => (
                          <button
                            key={p}
                            onClick={() => setTempValue(p)}
                            className={`text-xs px-2 py-1 rounded border transition-colors ${
                              tempValue === p
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-input text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {p}d
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-foreground">
                      <span className="font-mono font-semibold">{interval.interval_days}</span>
                      <span className="text-muted-foreground">dias</span>
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {editing === interval.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setEditing(null)} className="text-xs px-3 py-1.5 rounded border border-input text-muted-foreground hover:text-foreground">
                        Cancelar
                      </button>
                      <button
                        onClick={() => save(interval.id)}
                        disabled={updateInterval.isPending}
                        className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                      >
                        Salvar
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(interval)} className="text-xs px-3 py-1.5 rounded border border-input text-muted-foreground hover:text-foreground">
                      Editar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
