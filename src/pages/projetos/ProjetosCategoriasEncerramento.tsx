import { useState } from "react";
import { Tags, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import {
  useSprintClosureCategories,
  useCreateSprintClosureCategory,
  useUpdateSprintClosureCategory,
  useDeleteSprintClosureCategory,
} from "@/hooks/useSprintClosureCategories";

export default function ProjetosCategoriasEncerramento() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id || null;
  const { data: categories = [], isLoading } = useSprintClosureCategories(orgId);
  const createCat = useCreateSprintClosureCategory();
  const updateCat = useUpdateSprintClosureCategory();
  const deleteCat = useDeleteSprintClosureCategory();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleCreate = () => {
    if (!newName.trim()) return;
    createCat.mutate(
      { name: newName.trim(), organization_id: orgId },
      { onSuccess: () => setNewName("") }
    );
  };

  const handleUpdate = (id: string) => {
    if (!editName.trim()) return;
    updateCat.mutate({ id, name: editName.trim() }, { onSuccess: () => setEditingId(null) });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Remover a categoria "${name}"?`)) return;
    deleteCat.mutate(id);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Tags className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Categorias de Encerramento</h1>
          <p className="text-sm text-muted-foreground">
            Categorias exibidas no encerramento oficial de sprints.
          </p>
        </div>
      </div>

      <div className="card-elevated p-4">
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Nome da nova categoria..."
            className="flex-1 px-3 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || createCat.isPending}
            className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="card-elevated p-12 flex items-center justify-center">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <div className="card-elevated p-12 text-center text-sm text-muted-foreground">
          Nenhuma categoria cadastrada ainda.
        </div>
      ) : (
        <div className="card-elevated divide-y divide-border">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
              {editingId === cat.id ? (
                <>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUpdate(cat.id)}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                    autoFocus
                  />
                  <button onClick={() => handleUpdate(cat.id)} className="p-1.5 rounded-md hover:bg-muted text-primary">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <Tags className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className={`flex-1 text-sm ${cat.active ? "text-foreground" : "text-muted-foreground line-through"}`}>
                    {cat.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={cat.active}
                      onCheckedChange={(v) => updateCat.mutate({ id: cat.id, active: v })}
                    />
                    <span className="text-[11px] text-muted-foreground w-14">
                      {cat.active ? "Ativa" : "Inativa"}
                    </span>
                  </div>
                  <button
                    onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id, cat.name)}
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
