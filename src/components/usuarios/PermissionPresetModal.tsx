import { useEffect, useState } from "react";
import { X, Check, Ban, Minus } from "lucide-react";
import { menuItems } from "@/config/menuItems";
import { usePermissionPresets, type PermissionPreset, type PresetOverride } from "@/hooks/usePermissionPresets";

type State = "default" | "grant" | "block";

interface Props {
  preset: PermissionPreset | null;
  onClose: () => void;
}

export default function PermissionPresetModal({ preset, onClose }: Props) {
  const { upsert } = usePermissionPresets();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [states, setStates] = useState<Record<string, State>>({});

  useEffect(() => {
    if (preset) {
      setName(preset.name);
      setDescription(preset.description || "");
      const map: Record<string, State> = {};
      Object.entries(preset.overrides || {}).forEach(([k, v]) => {
        map[k] = v as State;
      });
      setStates(map);
    } else {
      setName("");
      setDescription("");
      setStates({});
    }
  }, [preset]);

  const setState = (key: string, s: State) =>
    setStates((prev) => ({ ...prev, [key]: s }));

  const handleSave = () => {
    if (!name.trim()) return;
    const overrides: Record<string, PresetOverride> = {};
    Object.entries(states).forEach(([k, v]) => {
      if (v !== "default") overrides[k] = v;
    });
    upsert.mutate(
      { id: preset?.id, name: name.trim(), description: description.trim() || null, overrides },
      { onSuccess: () => onClose() }
    );
  };

  const grantedCount = Object.values(states).filter((s) => s === "grant").length;
  const blockedCount = Object.values(states).filter((s) => s === "block").length;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col shadow-lg">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold">{preset ? "Editar Padrão" : "Novo Padrão"}</h2>
            <p className="text-xs text-muted-foreground">
              {grantedCount} liberado(s) · {blockedCount} bloqueado(s)
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 border-b border-border space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground">Nome *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Técnico Hardware"
              className="mt-1 w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Descrição</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opcional"
              className="mt-1 w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-1">
          {menuItems.map((item) => {
            const current: State = states[item.key] || "default";
            return (
              <div key={item.key} className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted/40">
                <div className="flex items-center gap-2 min-w-0">
                  <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="text-sm font-medium truncate">{item.label}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {(["default", "grant", "block"] as State[]).map((s) => {
                    const labels = { default: "Padrão", grant: "Liberar", block: "Bloquear" };
                    const Icons = { default: Minus, grant: Check, block: Ban };
                    const Icon = Icons[s];
                    const active = current === s;
                    const colors = {
                      default: active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50",
                      grant: active ? "bg-emerald-500 text-white" : "text-muted-foreground hover:bg-emerald-500/10",
                      block: active ? "bg-red-500 text-white" : "text-muted-foreground hover:bg-red-500/10",
                    };
                    return (
                      <button
                        key={s}
                        onClick={() => setState(item.key, s)}
                        className={`text-[11px] px-2 py-1 rounded-md flex items-center gap-1 transition-colors ${colors[s]}`}
                      >
                        <Icon className="h-3 w-3" />
                        {labels[s]}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-muted">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={upsert.isPending || !name.trim()}
            className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {upsert.isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
