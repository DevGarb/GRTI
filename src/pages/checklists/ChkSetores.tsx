import { useState } from "react";
import { Building2, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { useChkSectors, useSaveChkSector, useDeleteChkSector } from "@/hooks/useChecklists";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function ChkSetores() {
  const { data: sectors = [], isLoading } = useChkSectors();
  const save = useSaveChkSector();
  const del = useDeleteChkSector();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Setores</h1>
          <p className="text-sm text-muted-foreground">Agrupe empresas e modelos por setor (Limpeza, Segurança, etc.)</p>
        </div>
      </div>

      <div className="card-elevated p-4">
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && newName.trim() && save.mutate({ name: newName.trim() }, { onSuccess: () => setNewName("") })}
            placeholder="Nome do novo setor..."
            className="flex-1 px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
          <button
            onClick={() => newName.trim() && save.mutate({ name: newName.trim() }, { onSuccess: () => setNewName("") })}
            disabled={!newName.trim() || save.isPending}
            className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> Adicionar
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="card-elevated p-12 flex items-center justify-center">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sectors.length === 0 ? (
        <div className="card-elevated p-12 text-center text-sm text-muted-foreground">Nenhum setor cadastrado ainda.</div>
      ) : (
        <div className="card-elevated divide-y divide-border">
          {sectors.map((s: any) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3">
              {editingId === s.id ? (
                <>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && save.mutate({ id: s.id, name: editName.trim() }, { onSuccess: () => setEditingId(null) })}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-input bg-background text-sm"
                    autoFocus
                  />
                  <button onClick={() => save.mutate({ id: s.id, name: editName.trim() }, { onSuccess: () => setEditingId(null) })} className="p-1.5 rounded-md hover:bg-muted text-primary"><Check className="h-4 w-4" /></button>
                  <button onClick={() => setEditingId(null)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-sm">{s.name}</span>
                  <button onClick={() => { setEditingId(s.id); setEditName(s.name); }} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setToDelete({ id: s.id, name: s.name })} className="p-1.5 rounded-md hover:bg-muted text-destructive"><Trash2 className="h-4 w-4" /></button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Remover setor"
        description={toDelete ? `Remover setor "${toDelete.name}"?` : ""}
        confirmLabel="Remover"
        destructive
        onConfirm={() => {
          if (toDelete) del.mutate(toDelete.id);
          setToDelete(null);
        }}
      />
    </div>
  );
}
