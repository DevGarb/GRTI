import { useState, useEffect } from "react";
import { FileText, Plus, Pencil, Trash2, Camera, X, GripVertical } from "lucide-react";
import { useChkTemplates, useChkTemplate, useSaveChkTemplate, useDeleteChkTemplate, useChkSectors, type ChkFrequency } from "@/hooks/useChecklists";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Item = { id?: string; _key?: string; title: string; observation?: string; weight: 1 | 2 | 3; requires_photo: boolean; sort_order: number };

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

  const addItem = () => setForm({ ...form, items: [...form.items, { _key: crypto.randomUUID(), title: "", observation: "", weight: 1, requires_photo: false, sort_order: form.items.length }] });
  const updateItem = (idx: number, patch: Partial<Item>) => setForm({ ...form, items: form.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) });
  const removeItem = (idx: number) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx).map((it, i) => ({ ...it, sort_order: i })) });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const itemKey = (it: Item, idx: number) => it.id || it._key || `idx-${idx}`;
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = form.items.findIndex((it, i) => itemKey(it, i) === active.id);
    const newIdx = form.items.findIndex((it, i) => itemKey(it, i) === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const items = arrayMove(form.items, oldIdx, newIdx).map((it, i) => ({ ...it, sort_order: i }));
    setForm({ ...form, items });
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
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={form.items.map((it, i) => itemKey(it, i))} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {form.items.map((it, idx) => (
                    <SortableItem key={itemKey(it, idx)} id={itemKey(it, idx)} item={it} idx={idx} onUpdate={updateItem} onRemove={removeItem} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
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
      <ChkPageHeader
        icon={FileText}
        title="Modelos de Checklist"
        subtitle="Crie modelos com itens ponderados (1 comum · 2 importante · 3 imprescindível)"
        actions={
          <button onClick={() => setEditorId("new")} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5 shadow-sm hover:brightness-110">
            <Plus className="h-4 w-4" /> Novo modelo
          </button>
        }
      />

      {isLoading ? (
        <ChkListSkeleton rows={4} />
      ) : templates.length === 0 ? (
        <ChkEmptyState icon={FileText} title="Nenhum modelo criado ainda" hint="Crie um modelo com itens ponderados para começar a gerar execuções." />
      ) : (
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((t: any) => (
            <div key={t.id} className="card-elevated chk-card-interactive p-4 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--chk-primary)/0.10)] text-[hsl(var(--chk-primary))] ring-1 ring-[hsl(var(--chk-primary)/0.16)]">
                <FileText className="h-4 w-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-snug">{t.title}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <ChkBadge tone="neutral">{t.chk_sectors?.name || "Sem setor"}</ChkBadge>
                  <ChkBadge tone="info">{t.frequency}</ChkBadge>
                  <ChkBadge tone="neutral">{t.chk_template_items?.length || 0} itens</ChkBadge>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <button onClick={() => setEditorId(t.id)} aria-label={`Editar ${t.title}`} className="p-2 rounded-lg hover:bg-[hsl(var(--chk-surface-3))] text-[hsl(var(--chk-text-dim))]"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => setToDelete({ id: t.id, title: t.title })} aria-label={`Remover ${t.title}`} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Remover modelo"
        description={toDelete ? `Remover "${toDelete.title}"?` : ""}
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

function SortableItem({ id, item, idx, onUpdate, onRemove }: {
  id: string; item: Item; idx: number;
  onUpdate: (idx: number, patch: Partial<Item>) => void;
  onRemove: (idx: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="border border-border rounded-lg p-3 space-y-2 bg-background">
      <div className="flex items-start gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          title="Arrastar para reordenar"
          className="p-1.5 rounded hover:bg-muted text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <input placeholder="Pergunta do item" value={item.title} onChange={(e) => onUpdate(idx, { title: e.target.value })} className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
        <button onClick={() => onRemove(idx)} className="p-2 rounded-md hover:bg-muted text-destructive"><Trash2 className="h-4 w-4" /></button>
      </div>
      <textarea placeholder="Observação padrão (opcional)" value={item.observation || ""} onChange={(e) => onUpdate(idx, { observation: e.target.value })} rows={1} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs text-muted-foreground">Peso:</label>
        {[1, 2, 3].map((w) => (
          <button key={w} onClick={() => onUpdate(idx, { weight: w as 1 | 2 | 3 })} className={`px-3 py-1 rounded-full text-xs font-medium border ${item.weight === w ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-muted"}`}>
            {w === 1 ? "1 · Comum" : w === 2 ? "2 · Importante" : "3 · Imprescindível"}
          </button>
        ))}
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto cursor-pointer">
          <input type="checkbox" checked={item.requires_photo} onChange={(e) => onUpdate(idx, { requires_photo: e.target.checked })} className="rounded" />
          <Camera className="h-3.5 w-3.5" /> Exige foto
        </label>
      </div>
    </div>
  );
}
