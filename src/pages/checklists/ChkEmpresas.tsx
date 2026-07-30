import { useState } from "react";
import { Building, Plus, Pencil, Trash2 } from "lucide-react";
import { useChkCompanies, useSaveChkCompany, useDeleteChkCompany, useChkSectors } from "@/hooks/useChecklists";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ChkPageHeader, ChkEmptyState, ChkListSkeleton } from "@/components/checklists/ChkUI";

export default function ChkEmpresas() {
  const { data: companies = [], isLoading } = useChkCompanies();
  const { data: sectors = [] } = useChkSectors();
  const save = useSaveChkCompany();
  const del = useDeleteChkCompany();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", sector_id: "", document: "", contact: "" });
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);

  const openNew = () => { setEditing(null); setForm({ name: "", sector_id: "", document: "", contact: "" }); setShowForm(true); };
  const openEdit = (c: any) => { setEditing(c); setForm({ name: c.name, sector_id: c.sector_id || "", document: c.document || "", contact: c.contact || "" }); setShowForm(true); };
  const submit = () => {
    if (!form.name.trim()) return;
    save.mutate(
      { id: editing?.id, name: form.name.trim(), sector_id: form.sector_id || null, document: form.document, contact: form.contact },
      { onSuccess: () => setShowForm(false) }
    );
  };

  return (
    <div className="space-y-6">
      <ChkPageHeader
        icon={Building}
        title="Empresas"
        subtitle="Empresas parceiras vinculadas a um setor"
        actions={
          <button onClick={openNew} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5 shadow-sm hover:brightness-110">
            <Plus className="h-4 w-4" /> Nova empresa
          </button>
        }
      />

      {showForm && (
        <div className="card-elevated p-5 space-y-3 animate-fade-in">
          <p className="chk-eyebrow">{editing ? "Editar empresa" : "Nova empresa"}</p>
          <input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" />
          <div className="grid gap-3 sm:grid-cols-2">
            <select value={form.sector_id} onChange={(e) => setForm({ ...form, sector_id: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm">
              <option value="">— Setor —</option>
              {sectors.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input placeholder="CNPJ (opcional)" value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" />
          </div>
          <input placeholder="Contato (opcional)" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm" />
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium rounded-lg border border-input hover:bg-muted">Cancelar</button>
            <button onClick={submit} disabled={save.isPending} className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground shadow-sm hover:brightness-110 disabled:opacity-50">Salvar</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <ChkListSkeleton rows={4} />
      ) : companies.length === 0 ? (
        <ChkEmptyState icon={Building} title="Nenhuma empresa cadastrada" hint="Cadastre as empresas parceiras para vincular checklists e execuções." />
      ) : (
        <div className="card-elevated divide-y divide-[hsl(var(--chk-border))] overflow-hidden">
          {companies.map((c: any) => (
            <div key={c.id} className="chk-row flex items-center gap-3 px-4 py-3.5 min-h-[58px]">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--chk-surface-3))] text-[hsl(var(--chk-text-dim))]">
                <Building className="h-4 w-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{c.name}</p>
                <p className="text-xs text-[hsl(var(--chk-text-dim))] truncate">
                  {c.chk_sectors?.name || "Sem setor"} {c.document ? `· ${c.document}` : ""}
                </p>
              </div>
              <button onClick={() => openEdit(c)} aria-label={`Editar ${c.name}`} className="p-2 rounded-lg hover:bg-[hsl(var(--chk-surface-3))] text-[hsl(var(--chk-text-dim))]"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => setToDelete({ id: c.id, name: c.name })} aria-label={`Remover ${c.name}`} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Remover empresa"
        description={toDelete ? `Remover "${toDelete.name}"?` : ""}
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
