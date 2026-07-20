import { useState } from "react";
import { Building, Plus, Pencil, Trash2 } from "lucide-react";
import { useChkCompanies, useSaveChkCompany, useDeleteChkCompany, useChkSectors } from "@/hooks/useChecklists";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Building className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Empresas</h1>
            <p className="text-sm text-muted-foreground">Empresas parceiras vinculadas a um setor</p>
          </div>
        </div>
        <button onClick={openNew} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5 hover:opacity-90">
          <Plus className="h-4 w-4" /> Nova empresa
        </button>
      </div>

      {showForm && (
        <div className="card-elevated p-4 space-y-3">
          <input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          <select value={form.sector_id} onChange={(e) => setForm({ ...form, sector_id: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
            <option value="">— Setor —</option>
            {sectors.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input placeholder="CNPJ (opcional)" value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          <input placeholder="Contato (opcional)" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm rounded-lg border border-input hover:bg-muted">Cancelar</button>
            <button onClick={submit} disabled={save.isPending} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">Salvar</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="card-elevated p-12 flex justify-center"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : companies.length === 0 ? (
        <div className="card-elevated p-12 text-center text-sm text-muted-foreground">Nenhuma empresa cadastrada.</div>
      ) : (
        <div className="card-elevated divide-y divide-border">
          {companies.map((c: any) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3">
              <Building className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.chk_sectors?.name || "Sem setor"} {c.document ? `· ${c.document}` : ""}</p>
              </div>
              <button onClick={() => openEdit(c)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => setToDelete({ id: c.id, name: c.name })} className="p-1.5 rounded-md hover:bg-muted text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
