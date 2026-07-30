import { useState } from "react";
import { Building2, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { useChkSectors, useSaveChkSector, useDeleteChkSector } from "@/hooks/useChecklists";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ChkPageHeader, ChkEmptyState, ChkListSkeleton } from "@/components/checklists/ChkUI";

export default function ChkSetores() {
  const { data: sectors = [], isLoading } = useChkSectors();
  const save = useSaveChkSector();
  const del = useDeleteChkSector();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);

  return (
    <div className="space-y-6">
      <ChkPageHeader
        icon={Building2}
        title="Setores"
        subtitle="Agrupe empresas e modelos por setor (Limpeza, Segurança, etc.)"
      />

      <div className="card-elevated p-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <label className="sr-only" htmlFor="novo-setor">Nome do novo setor</label>
          <input
            id="novo-setor"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && newName.trim() && save.mutate({ name: newName.trim() }, { onSuccess: () => setNewName("") })}
            placeholder="Nome do novo setor..."
            className="flex-1 px-3 py-2.5 rounded-lg border border-input bg-background text-sm"
          />
          <button
            onClick={() => newName.trim() && save.mutate({ name: newName.trim() }, { onSuccess: () => setNewName("") })}
            disabled={!newName.trim() || save.isPending}
            className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> Adicionar
          </button>
        </div>
      </div>

      {isLoading ? (
        <ChkListSkeleton rows={4} />
      ) : sectors.length === 0 ? (
        <ChkEmptyState icon={Building2} title="Nenhum setor cadastrado" hint="Crie o primeiro setor no campo acima para começar a organizar empresas e modelos." />
      ) : (
        <div className="card-elevated divide-y divide-[hsl(var(--chk-border))] overflow-hidden">
          {sectors.map((s: any) => (
            <div key={s.id} className="chk-row flex items-center gap-3 px-4 py-3 min-h-[56px]">
              {editingId === s.id ? (
                <>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && save.mutate({ id: s.id, name: editName.trim() }, { onSuccess: () => setEditingId(null) })}
                    className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
                    autoFocus
                  />
                  <button onClick={() => save.mutate({ id: s.id, name: editName.trim() }, { onSuccess: () => setEditingId(null) })} aria-label="Salvar" className="p-2 rounded-lg hover:bg-[hsl(var(--chk-surface-3))] text-[hsl(var(--chk-primary))]"><Check className="h-4 w-4" /></button>
                  <button onClick={() => setEditingId(null)} aria-label="Cancelar" className="p-2 rounded-lg hover:bg-[hsl(var(--chk-surface-3))] text-[hsl(var(--chk-text-dim))]"><X className="h-4 w-4" /></button>
                </>
              ) : (
                <>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--chk-surface-3))] text-[hsl(var(--chk-text-dim))]">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-sm font-medium truncate">{s.name}</span>
                  <button onClick={() => { setEditingId(s.id); setEditName(s.name); }} aria-label={`Editar ${s.name}`} className="p-2 rounded-lg hover:bg-[hsl(var(--chk-surface-3))] text-[hsl(var(--chk-text-dim))]"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setToDelete({ id: s.id, name: s.name })} aria-label={`Remover ${s.name}`} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4" /></button>
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
