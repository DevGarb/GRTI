import { useState, useEffect } from "react";
import { FileText, Plus, Pencil, Trash2, Camera, ArrowUp, ArrowDown, X } from "lucide-react";
import { useChkTemplates, useChkTemplate, useSaveChkTemplate, useDeleteChkTemplate, useChkSectors, type ChkFrequency } from "@/hooks/useChecklists";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Item = { id?: string; title: string; observation?: string; weight: 1 | 2 | 3; requires_photo: boolean; sort_order: number };

export default function ChkModelos() {
  const { data: templates = [], isLoading } = useChkTemplates();
  const { data: sectors = [] } = useChkSectors();
  const save = useSaveChkTemplate();
  const del = useDeleteChkTemplate();
  const [editorId, setEditorId] = useState<string | "new" | null>(null);
  const { data: loaded } = useChkTemplate(editorId && editorId !== "new" ? editorId : undefined);
  const [toDelete, setToDelete] = useState<{ id: string; title: string } | null>(null);

  const [form, setForm] = useState<{ title: string; description: string; sector_id: string; frequency: ChkFrequency; items: Item[] }>({
    title: "", description: "", sector_id: "", frequency: "unica", items: [],
  });

  useEffect(() => {
    if (editorId === "new") {
      setForm({ title: "", description: "", sector_id: "", frequency: "unica", items: [] });
    } else if (loaded) {
      setForm({
        title: loaded.title,
        description: loaded.description || "",
        sector_id: loaded.sector_id || "",
        frequency: loaded.frequency,
        items: (loaded.chk_template_items || []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((it: any) => ({
          id: it.id, title: it.title, observation: it.observation || "", weight: it.weight as 1 | 2 | 3, requires_photo: it.requires_photo, sort_order: it.sort_order,
        })),
      });
    }
  }, [editorId, loaded]);

  const addItem = () => setForm({ ...form, items: [...form.items, { title: "", observation: "", weight: 1, requires_photo: false, sort_order: form.items.length }] });
  const updateItem = (idx: number, patch: Partial<Item>) => setForm({ ...form, items: form.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) });
  const removeItem = (idx: number) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx).map((it, i) => ({ ...it, sort_order: i })) });
  const moveItem = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= form.items.length) return;
    const items = [...form.items];
    [items[idx], items[next]] = [items[next], items[idx]];
    setForm({ ...form, items: items.map((it, i) => ({ ...it, sort_order: i })) });
  };

  const submit = () => {
    if (!form.title.trim()) return;
    save.mutate(
      {
        id: editorId !== "new" ? (editorId as string) : undefined,
        title: form.title.trim(), description: form.description, sector_id: form.sector_id || null, frequency: form.frequency,
        items: form.items.filter((it) => it.title.trim()),
      },
      { onSuccess: () => setEditorId(null) }
    );
  };

  if (editorId) {
    return (
      <div className="space-y-4 max-w-4xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{editorId === "new" ? "Novo modelo" : "Editar modelo"}</h1>
          <button onClick={() => setEditorId(null)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><X className="h-4 w-4" /> Fechar</button>
        </div>

        <div className="card-elevated p-4 space-y-3">
          <input placeholder="Título do checklist" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          <textarea placeholder="Descrição (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.sector_id} onChange={(e) => setForm({ ...form, sector_id: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <option value="">— Setor —</option>
              {sectors.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as ChkFrequency })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <option value="unica">Execução única</option>
              <option value="diaria">Diária</option>
              <option value="semanal">Semanal</option>
              <option value="mensal">Mensal</option>
            </select>
          </div>
        </div>

        <div className="card-elevated p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Itens do checklist</h2>
            <button onClick={addItem} className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground flex items-center gap-1 hover:opacity-90"><Plus className="h-4 w-4" /> Adicionar item</button>
          </div>
          {form.items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum item ainda. Adicione ao menos um.</p>
          ) : (
            <div className="space-y-3">
              {form.items.map((it, idx) => (
                <div key={idx} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col shrink-0">
                      <button onClick={() => moveItem(idx, -1)} disabled={idx === 0} title="Mover para cima" className="p-0.5 rounded hover:bg-muted text-muted-foreground disabled:opacity-30 disabled:hover:bg-transparent">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => moveItem(idx, 1)} disabled={idx === form.items.length - 1} title="Mover para baixo" className="p-0.5 rounded hover:bg-muted text-muted-foreground disabled:opacity-30 disabled:hover:bg-transparent">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <input placeholder="Pergunta do item" value={it.title} onChange={(e) => updateItem(idx, { title: e.target.value })} className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                    <button onClick={() => removeItem(idx)} className="p-2 rounded-md hover:bg-muted text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <textarea placeholder="Observação padrão (opcional)" value={it.observation || ""} onChange={(e) => updateItem(idx, { observation: e.target.value })} rows={1} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="text-xs text-muted-foreground">Peso:</label>
                    {[1, 2, 3].map((w) => (
                      <button key={w} onClick={() => updateItem(idx, { weight: w as 1 | 2 | 3 })} className={`px-3 py-1 rounded-full text-xs font-medium border ${it.weight === w ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-muted"}`}>
                        {w === 1 ? "1 · Comum" : w === 2 ? "2 · Importante" : "3 · Imprescindível"}
                      </button>
                    ))}
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto cursor-pointer">
                      <input type="checkbox" checked={it.requires_photo} onChange={(e) => updateItem(idx, { requires_photo: e.target.checked })} className="rounded" />
                      <Camera className="h-3.5 w-3.5" /> Exige foto
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={() => setEditorId(null)} className="px-4 py-2 text-sm rounded-lg border border-input hover:bg-muted">Cancelar</button>
          <button onClick={submit} disabled={save.isPending || !form.title.trim()} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">Salvar modelo</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Modelos de Checklist</h1>
            <p className="text-sm text-muted-foreground">Crie modelos com itens ponderados (1 comum · 2 importante · 3 imprescindível)</p>
          </div>
        </div>
        <button onClick={() => setEditorId("new")} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5 hover:opacity-90">
          <Plus className="h-4 w-4" /> Novo modelo
        </button>
      </div>

      {isLoading ? (
        <div className="card-elevated p-12 flex justify-center"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : templates.length === 0 ? (
        <div className="card-elevated p-12 text-center text-sm text-muted-foreground">Nenhum modelo criado ainda.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {templates.map((t: any) => (
            <div key={t.id} className="card-elevated p-4 flex items-start gap-3">
              <FileText className="h-5 w-5 text-primary mt-1" />
              <div className="flex-1">
                <p className="font-medium">{t.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t.chk_sectors?.name || "Sem setor"} · {t.frequency} · {t.chk_template_items?.length || 0} itens
                </p>
              </div>
              <button onClick={() => setEditorId(t.id)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => setToDelete({ id: t.id, title: t.title })} className="p-1.5 rounded-md hover:bg-muted text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
