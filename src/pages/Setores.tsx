import { useState } from "react";
import { Building2, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { useSectors, useCreateSector, useUpdateSector, useDeleteSector } from "@/hooks/useSectors";
import { useAuth } from "@/contexts/AuthContext";

export default function Setores() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id || null;
  const { data: sectors = [], isLoading } = useSectors(orgId);
  const createSector = useCreateSector();
  const updateSector = useUpdateSector();
  const deleteSector = useDeleteSector();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleCreate = () => {
    if (!newName.trim()) return;
    createSector.mutate({ name: newName.trim(), organization_id: orgId }, {
      onSuccess: () => setNewName(""),
    });
  };

  const handleUpdate = (id: string) => {
    if (!editName.trim()) return;
    updateSector.mutate({ id, name: editName.trim() }, {
      onSuccess: () => setEditingId(null),
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Remover o setor "${name}"?`)) return;
    deleteSector.mutate(id);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Setores</h1>
          <p className="text-sm text-muted-foreground">Gerencie os setores da organização</p>
        </div>
      </div>

      {/* Create */}
      <div className="card-elevated p-4">
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Nome do novo setor..."
            className="flex-1 px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || createSector.isPending}
            className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="card-elevated p-12 flex items-center justify-center">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sectors.length === 0 ? (
        <div className="card-elevated p-12 text-center text-sm text-muted-foreground">
          Nenhum setor cadastrado ainda.
        </div>
      ) : (
        <div className="card-elevated divide-y divide-border">
          {sectors.map((sector) => (
            <div key={sector.id} className="flex items-center gap-3 px-4 py-3">
              {editingId === sector.id ? (
                <>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUpdate(sector.id)}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                    autoFocus
                  />
                  <button onClick={() => handleUpdate(sector.id)} className="p-1.5 rounded-md hover:bg-muted text-primary">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-sm text-foreground">{sector.name}</span>
                  <button
                    onClick={() => { setEditingId(sector.id); setEditName(sector.name); }}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(sector.id, sector.name)}
                    className="p-1.5 rounded-md hover:bg-muted text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
