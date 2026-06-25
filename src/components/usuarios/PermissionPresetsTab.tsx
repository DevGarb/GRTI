import { useState } from "react";
import { Plus, Pencil, Trash2, KeyRound } from "lucide-react";
import { usePermissionPresets, type PermissionPreset } from "@/hooks/usePermissionPresets";
import PermissionPresetModal from "./PermissionPresetModal";

export default function PermissionPresetsTab() {
  const { presets, isLoading, remove } = usePermissionPresets();
  const [editing, setEditing] = useState<PermissionPreset | null>(null);
  const [showModal, setShowModal] = useState(false);

  const open = (p: PermissionPreset | null) => {
    setEditing(p);
    setShowModal(true);
  };

  const handleDelete = (p: PermissionPreset) => {
    if (!confirm(`Excluir o padrão "${p.name}"?`)) return;
    remove.mutate(p.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Padrões de Permissão</h2>
          <p className="text-xs text-muted-foreground">
            Crie conjuntos reutilizáveis de permissões e aplique nos usuários com um clique.
          </p>
        </div>
        <button
          onClick={() => open(null)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Novo Padrão
        </button>
      </div>

      {isLoading ? (
        <div className="card-elevated p-8 flex items-center justify-center">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : presets.length === 0 ? (
        <div className="card-elevated p-8 text-center">
          <KeyRound className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum padrão criado ainda.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {presets.map((p) => {
            const entries = Object.entries(p.overrides || {});
            const granted = entries.filter(([, v]) => v === "grant").length;
            const blocked = entries.filter(([, v]) => v === "block").length;
            return (
              <div key={p.id} className="card-elevated p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-foreground truncate">{p.name}</h3>
                    {p.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{p.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => open(p)}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 text-[11px]">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 font-medium">
                    {granted} liberado{granted !== 1 ? "s" : ""}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 font-medium">
                    {blocked} bloqueado{blocked !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <PermissionPresetModal preset={editing} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
