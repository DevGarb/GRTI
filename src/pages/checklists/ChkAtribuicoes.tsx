import { useState } from "react";
import { UserCheck, Plus, ToggleLeft, ToggleRight, Pencil, Trash2 } from "lucide-react";
import { useChkAssignments, useSaveChkAssignment, useSaveChkAssignmentsBulk, useToggleChkAssignment, useDeleteChkAssignment, useChkTemplates, useChkCompanies, useChkOrgUsers, type ChkFrequency } from "@/hooks/useChecklists";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ChkPageHeader, ChkEmptyState, ChkListSkeleton, ChkBadge } from "@/components/checklists/ChkUI";
import { formatDateBR } from "@/lib/dateFormat";

type FormState = {
  id?: string;
  template_id: string;
  company_id: string;
  company_ids: string[];
  assigned_user_id: string;
  frequency: ChkFrequency;
  start_date: string;
  end_date: string;
  notes: string;
};

const emptyForm = (): FormState => ({
  template_id: "", company_id: "", company_ids: [], assigned_user_id: "", frequency: "unica",
  start_date: new Date().toISOString().slice(0, 10), end_date: "", notes: "",
});

export default function ChkAtribuicoes() {
  const { data: assigns = [], isLoading } = useChkAssignments();
  const { data: templates = [] } = useChkTemplates();
  const { data: companies = [] } = useChkCompanies();
  const { data: users = [] } = useChkOrgUsers();
  const save = useSaveChkAssignment();
  const saveBulk = useSaveChkAssignmentsBulk();
  const toggle = useToggleChkAssignment();
  const del = useDeleteChkAssignment();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [toDelete, setToDelete] = useState<any | null>(null);
  const [pendingDup, setPendingDup] = useState<null | (() => void)>(null);

  const isEdit = !!form.id;

  const openNew = () => { setForm(emptyForm()); setShowForm(true); };
  const openEdit = (a: any) => {
    setForm({
      id: a.id,
      template_id: a.template_id,
      company_id: a.company_id,
      company_ids: [a.company_id],
      assigned_user_id: a.assigned_user_id,
      frequency: a.frequency,
      start_date: a.start_date,
      end_date: a.end_date || "",
      notes: a.notes || "",
    });
    setShowForm(true);
  };

  const toggleCompany = (cid: string) => setForm((f) => ({
    ...f,
    company_ids: f.company_ids.includes(cid) ? f.company_ids.filter((x) => x !== cid) : [...f.company_ids, cid],
  }));

  const doSaveEdit = () => {
    save.mutate({
      id: form.id,
      template_id: form.template_id, company_id: form.company_id, assigned_user_id: form.assigned_user_id,
      frequency: form.frequency, start_date: form.start_date, end_date: form.end_date || null, notes: form.notes,
    }, { onSuccess: () => { setShowForm(false); setForm(emptyForm()); } });
  };

  const doCreate = (companyIds: string[]) => {
    if (companyIds.length === 1) {
      save.mutate({
        template_id: form.template_id, company_id: companyIds[0], assigned_user_id: form.assigned_user_id,
        frequency: form.frequency, start_date: form.start_date, end_date: form.end_date || null, notes: form.notes,
      }, { onSuccess: () => { setShowForm(false); setForm(emptyForm()); } });
    } else {
      saveBulk.mutate({
        template_id: form.template_id, company_ids: companyIds, assigned_user_id: form.assigned_user_id,
        frequency: form.frequency, start_date: form.start_date, end_date: form.end_date || null, notes: form.notes,
      }, { onSuccess: () => { setShowForm(false); setForm(emptyForm()); } });
    }
  };

  const submit = () => {
    if (!form.template_id || !form.assigned_user_id) return;
    if (isEdit) {
      if (!form.company_id) return;
      doSaveEdit();
      return;
    }
    if (form.company_ids.length === 0) return;

    // Duplicate check per company
    const dupCompanyIds = form.company_ids.filter((cid) =>
      assigns.some((a: any) =>
        a.is_active &&
        a.template_id === form.template_id &&
        a.company_id === cid &&
        a.assigned_user_id === form.assigned_user_id,
      )
    );
    if (dupCompanyIds.length > 0) {
      setPendingDup(() => () => doCreate(form.company_ids));
      return;
    }
    doCreate(form.company_ids);
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
            {isEdit ? (
              <select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
                <option value="">— Empresa —</option>
                {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : <div />}
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
          {!isEdit && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">Empresas ({form.company_ids.length} selecionada{form.company_ids.length === 1 ? "" : "s"})</label>
                <div className="flex gap-2 text-xs">
                  <button type="button" onClick={() => setForm({ ...form, company_ids: companies.map((c: any) => c.id) })} className="text-primary hover:underline">Todas</button>
                  <button type="button" onClick={() => setForm({ ...form, company_ids: [] })} className="text-muted-foreground hover:underline">Limpar</button>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto border border-input rounded-lg p-2 grid grid-cols-1 md:grid-cols-2 gap-1">
                {companies.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">Nenhuma empresa cadastrada.</p>
                ) : companies.map((c: any) => (
                  <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                    <input type="checkbox" checked={form.company_ids.includes(c.id)} onChange={() => toggleCompany(c.id)} className="rounded" />
                    <span className="truncate">{c.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <textarea placeholder="Observações (opcional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setForm(emptyForm()); }} className="px-4 py-2 text-sm rounded-lg border border-input hover:bg-muted">Cancelar</button>
            <button onClick={submit} disabled={save.isPending || saveBulk.isPending} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {isEdit ? "Salvar alterações" : form.company_ids.length > 1 ? `Criar ${form.company_ids.length} atribuições` : "Criar"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <ChkListSkeleton rows={5} />
      ) : assigns.length === 0 ? (
        <ChkEmptyState icon={UserCheck} title="Nenhuma atribuição criada" hint="Vincule um modelo a uma empresa e a um colaborador para gerar execuções." />
      ) : (
        <div className="card-elevated divide-y divide-[hsl(var(--chk-border))] overflow-hidden">
          {assigns.map((a: any) => (
            <div key={a.id} className="chk-row flex items-center gap-3 px-4 py-3.5 min-h-[60px]">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{a.chk_templates?.title}</p>
                <p className="text-xs text-[hsl(var(--chk-text-dim))] truncate mt-0.5">
                  {a.chk_companies?.name} · {a.profiles?.full_name} · {a.frequency} · desde {formatDateBR(a.start_date)}
                </p>
              </div>
              <ChkBadge tone={a.is_active ? "ok" : "neutral"}>{a.is_active ? "Ativa" : "Pausada"}</ChkBadge>
              <div className="flex shrink-0 items-center gap-0.5">
                <button onClick={() => toggle.mutate({ id: a.id, is_active: !a.is_active })} title={a.is_active ? "Pausar" : "Ativar"} className="p-2 rounded-lg hover:bg-[hsl(var(--chk-surface-3))] text-[hsl(var(--chk-text-dim))]">
                  {a.is_active ? <ToggleRight className="h-5 w-5 text-[hsl(var(--chk-primary))]" /> : <ToggleLeft className="h-5 w-5" />}
                </button>
                <button onClick={() => openEdit(a)} title="Editar" className="p-2 rounded-lg hover:bg-[hsl(var(--chk-surface-3))] text-[hsl(var(--chk-text-dim))]">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(a)} title="Excluir" disabled={del.isPending} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive disabled:opacity-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
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
