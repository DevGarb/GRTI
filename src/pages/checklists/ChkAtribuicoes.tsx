import { useState } from "react";
import { UserCheck, Plus, ToggleLeft, ToggleRight, Pencil, Trash2 } from "lucide-react";
import { useChkAssignments, useSaveChkAssignment, useToggleChkAssignment, useDeleteChkAssignment, useChkTemplates, useChkCompanies, useChkOrgUsers, type ChkFrequency } from "@/hooks/useChecklists";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type FormState = {
  id?: string;
  template_id: string;
  company_id: string;
  assigned_user_id: string;
  frequency: ChkFrequency;
  start_date: string;
  end_date: string;
  notes: string;
};

const emptyForm = (): FormState => ({
  template_id: "", company_id: "", assigned_user_id: "", frequency: "unica",
  start_date: new Date().toISOString().slice(0, 10), end_date: "", notes: "",
});

export default function ChkAtribuicoes() {
  const { data: assigns = [], isLoading } = useChkAssignments();
  const { data: templates = [] } = useChkTemplates();
  const { data: companies = [] } = useChkCompanies();
  const { data: users = [] } = useChkOrgUsers();
  const save = useSaveChkAssignment();
  const toggle = useToggleChkAssignment();
  const del = useDeleteChkAssignment();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [toDelete, setToDelete] = useState<any | null>(null);
  const [pendingDup, setPendingDup] = useState<null | (() => void)>(null);

  const openNew = () => { setForm(emptyForm()); setShowForm(true); };
  const openEdit = (a: any) => {
    setForm({
      id: a.id,
      template_id: a.template_id,
      company_id: a.company_id,
      assigned_user_id: a.assigned_user_id,
      frequency: a.frequency,
      start_date: a.start_date,
      end_date: a.end_date || "",
      notes: a.notes || "",
    });
    setShowForm(true);
  };

  const doSave = () => {
    save.mutate({
      id: form.id,
      template_id: form.template_id, company_id: form.company_id, assigned_user_id: form.assigned_user_id,
      frequency: form.frequency, start_date: form.start_date, end_date: form.end_date || null, notes: form.notes,
    }, { onSuccess: () => { setShowForm(false); setForm(emptyForm()); } });
  };

  const submit = () => {
    if (!form.template_id || !form.company_id || !form.assigned_user_id) return;

    // Duplicate check (only on create)
    if (!form.id) {
      const dup = assigns.find((a: any) =>
        a.is_active &&
        a.template_id === form.template_id &&
        a.company_id === form.company_id &&
        a.assigned_user_id === form.assigned_user_id,
      );
      if (dup) {
        setPendingDup(() => doSave);
        return;
      }
    }

    doSave();
  };

  const handleDelete = (a: any) => setToDelete(a);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <UserCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Atribuições</h1>
            <p className="text-sm text-muted-foreground">Vincule um modelo a uma empresa e a um colaborador responsável</p>
          </div>
        </div>
        <button onClick={openNew} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5 hover:opacity-90">
          <Plus className="h-4 w-4" /> Nova atribuição
        </button>
      </div>

      {showForm && (
        <div className="card-elevated p-4 space-y-3">
          <p className="text-sm font-medium">{form.id ? "Editar atribuição" : "Nova atribuição"}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select value={form.template_id} onChange={(e) => setForm({ ...form, template_id: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <option value="">— Modelo —</option>
              {templates.map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            <select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <option value="">— Empresa —</option>
              {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={form.assigned_user_id} onChange={(e) => setForm({ ...form, assigned_user_id: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <option value="">— Colaborador —</option>
              {users.map((u: any) => <option key={u.user_id} value={u.user_id}>{u.full_name || u.email}</option>)}
            </select>
            <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as ChkFrequency })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <option value="unica">Única</option>
              <option value="diaria">Diária</option>
              <option value="semanal">Semanal</option>
              <option value="mensal">Mensal</option>
            </select>
            <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} placeholder="Fim (opcional)" className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          </div>
          <textarea placeholder="Observações (opcional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setForm(emptyForm()); }} className="px-4 py-2 text-sm rounded-lg border border-input hover:bg-muted">Cancelar</button>
            <button onClick={submit} disabled={save.isPending} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {form.id ? "Salvar alterações" : "Criar"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="card-elevated p-12 flex justify-center"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : assigns.length === 0 ? (
        <div className="card-elevated p-12 text-center text-sm text-muted-foreground">Nenhuma atribuição criada.</div>
      ) : (
        <div className="card-elevated divide-y divide-border">
          {assigns.map((a: any) => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1">
                <p className="text-sm font-medium">{a.chk_templates?.title}</p>
                <p className="text-xs text-muted-foreground">
                  {a.chk_companies?.name} · {a.profiles?.full_name} · {a.frequency} · desde {a.start_date}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${a.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                {a.is_active ? "Ativa" : "Pausada"}
              </span>
              <button onClick={() => toggle.mutate({ id: a.id, is_active: !a.is_active })} title={a.is_active ? "Pausar" : "Ativar"} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
                {a.is_active ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5" />}
              </button>
              <button onClick={() => openEdit(a)} title="Editar" className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => handleDelete(a)} title="Excluir" disabled={del.isPending} className="p-1.5 rounded-md hover:bg-muted text-destructive disabled:opacity-50">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir atribuição"
        description={
          toDelete
            ? `Excluir a atribuição "${toDelete.chk_templates?.title}" para ${toDelete.chk_companies?.name}?\n\nATENÇÃO: execuções vinculadas também serão removidas.`
            : ""
        }
        confirmLabel="Excluir"
        destructive
        onConfirm={() => {
          if (toDelete) del.mutate(toDelete.id);
          setToDelete(null);
        }}
      />

      <ConfirmDialog
        open={!!pendingDup}
        onOpenChange={(o) => !o && setPendingDup(null)}
        title="Atribuição duplicada"
        description="Já existe uma atribuição ativa deste modelo para esta empresa e colaborador. Isso pode duplicar execuções. Deseja criar mesmo assim?"
        confirmLabel="Criar mesmo assim"
        onConfirm={() => {
          const run = pendingDup;
          setPendingDup(null);
          run?.();
        }}
      />
    </div>
  );
}
