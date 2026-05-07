import { useEffect, useMemo, useState } from "react";
import { Wrench, Plus, Pencil, Trash2, AlertTriangle, Building2, ListChecks, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useSites, useMaintenanceOrders, useChecklistTemplates,
  MAINT_CATEGORIES, MAINT_PRIORITIES, MAINT_STATUSES,
  type MaintenanceOrder, type Site, type ChecklistTemplate, type ChecklistItem, type MaintenancePhoto,
} from "@/hooks/useManutencao";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  "Aberta": "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  "Em execução": "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  "Concluída": "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  "Cancelada": "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
};
const PRIORITY_COLORS: Record<string, string> = {
  "Baixa": "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  "Média": "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  "Alta": "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  "Urgente": "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
};

function todayISO() { return new Date().toISOString().slice(0, 10); }

export default function OpManutencao() {
  const sites = useSites();
  const orders = useMaintenanceOrders();
  const tpls = useChecklistTemplates();

  const [activeMonth, setActiveMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [activeSite, setActiveSite] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [omOpen, setOmOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceOrder | null>(null);
  const [photoOmId, setPhotoOmId] = useState<string | null>(null);

  const [siteOpen, setSiteOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);

  const [tplOpen, setTplOpen] = useState(false);
  const [editingTpl, setEditingTpl] = useState<ChecklistTemplate | null>(null);

  const [execOpen, setExecOpen] = useState(false);
  const [execTpl, setExecTpl] = useState<ChecklistTemplate | null>(null);

  const today = todayISO();

  const filtered = useMemo(() => {
    return orders.items.filter(o => {
      if (!o.opened_at.startsWith(activeMonth)) return false;
      if (activeSite !== "all" && o.site_id !== activeSite) return false;
      if (categoryFilter !== "all" && o.category !== categoryFilter) return false;
      return true;
    });
  }, [orders.items, activeMonth, activeSite, categoryFilter]);

  const kpis = useMemo(() => {
    const overdue = filtered.filter(o => o.deadline && o.deadline < today && !["Concluída", "Cancelada"].includes(o.status)).length;
    return {
      abertas: filtered.filter(o => o.status === "Aberta").length,
      execucao: filtered.filter(o => o.status === "Em execução").length,
      concluidas: filtered.filter(o => o.status === "Concluída").length,
      total: filtered.length,
      atrasadas: overdue,
    };
  }, [filtered, today]);

  const siteName = (id: string | null) => sites.items.find(s => s.id === id)?.name || "—";

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Wrench className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Manutenção Predial</h1>
            <p className="text-sm text-muted-foreground">Ordens, sedes e checklists de inspeção</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Input type="month" value={activeMonth} onChange={e => setActiveMonth(e.target.value)} className="w-40" />
          <Button onClick={() => { setEditing(null); setOmOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Nova OM
          </Button>
        </div>
      </div>

      <Tabs defaultValue="ordens">
        <TabsList>
          <TabsTrigger value="ordens">Ordens de Manutenção</TabsTrigger>
          <TabsTrigger value="sedes"><Building2 className="h-4 w-4 mr-1 inline" />Sedes</TabsTrigger>
          <TabsTrigger value="checklists"><ListChecks className="h-4 w-4 mr-1 inline" />Checklists</TabsTrigger>
        </TabsList>

        {/* ORDENS */}
        <TabsContent value="ordens" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KpiCard label="Abertas" value={kpis.abertas} color="text-amber-600" />
            <KpiCard label="Em execução" value={kpis.execucao} color="text-blue-600" />
            <KpiCard label="Concluídas" value={kpis.concluidas} color="text-emerald-600" />
            <KpiCard label="Total no mês" value={kpis.total} />
            <KpiCard label="Atrasadas" value={kpis.atrasadas} color="text-rose-600" icon={<AlertTriangle className="h-4 w-4" />} />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {MAINT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={activeSite} onValueChange={setActiveSite}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all">Todas as sedes ({orders.items.filter(o => o.opened_at.startsWith(activeMonth)).length})</TabsTrigger>
              {sites.items.filter(s => s.is_active).map(s => {
                const c = orders.items.filter(o => o.site_id === s.id && o.opened_at.startsWith(activeMonth)).length;
                return <TabsTrigger key={s.id} value={s.id}>{s.name} ({c})</TabsTrigger>;
              })}
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            {orders.loading && <div className="text-center py-8 text-muted-foreground">Carregando...</div>}
            {!orders.loading && filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">Nenhuma ordem para os filtros atuais.</div>
            )}
            {filtered.map(om => {
              const overdue = om.deadline && om.deadline < today && !["Concluída", "Cancelada"].includes(om.status);
              return (
                <div key={om.id} className="border rounded-lg p-4 bg-card hover:shadow-md transition">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-[220px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs px-2 py-0.5 bg-muted rounded">OM #{om.om_number}</span>
                        <Badge className={cn(STATUS_COLORS[om.status])}>{om.status}</Badge>
                        <Badge variant="outline" className={cn(PRIORITY_COLORS[om.priority])}>{om.priority}</Badge>
                        <Badge variant="secondary">{om.category}</Badge>
                        {overdue && <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Atrasada</Badge>}
                      </div>
                      <div className="font-semibold mt-2">{om.title}</div>
                      {om.description && <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{om.description}</div>}
                      <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        <span><Building2 className="h-3 w-3 inline mr-1" />{siteName(om.site_id)}</span>
                        {om.responsible && <span>Resp: {om.responsible}</span>}
                        <span>Aberta: {om.opened_at}</span>
                        {om.deadline && <span className={cn(overdue && "text-rose-600 font-medium")}>Prazo: {om.deadline}</span>}
                        {om.finished_at && <span>Concluída: {om.finished_at}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Select value={om.status} onValueChange={v => orders.update(om.id, { status: v, finished_at: v === "Concluída" ? todayISO() : null })}>
                        <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{MAINT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button size="icon" variant="ghost" onClick={() => setPhotoOmId(om.id)} title="Fotos"><ImageIcon className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(om); setOmOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir esta OM?")) orders.remove(om.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* SEDES */}
        <TabsContent value="sedes" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingSite(null); setSiteOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Nova Sede</Button>
          </div>
          {sites.items.map(s => (
            <div key={s.id} className="border rounded-lg p-3 bg-card flex items-center justify-between">
              <div>
                <div className="font-semibold">{s.name} {!s.is_active && <Badge variant="outline">Inativa</Badge>}</div>
                <div className="text-sm text-muted-foreground">{s.address || "—"}</div>
                <div className="text-xs text-muted-foreground">{s.responsible} {s.phone && `• ${s.phone}`}</div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setEditingSite(s); setSiteOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir sede?")) sites.remove(s.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
          {sites.items.length === 0 && <div className="text-center py-8 text-muted-foreground">Nenhuma sede cadastrada.</div>}
        </TabsContent>

        {/* CHECKLISTS */}
        <TabsContent value="checklists" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingTpl(null); setTplOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Novo Modelo</Button>
          </div>
          {tpls.items.map(t => (
            <div key={t.id} className="border rounded-lg p-3 bg-card flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="font-semibold">{t.name}</div>
                <div className="text-xs text-muted-foreground">{siteName(t.site_id)} {t.description && `• ${t.description}`}</div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => { setExecTpl(t); setExecOpen(true); }}>Executar</Button>
                <Button size="icon" variant="ghost" onClick={() => { setEditingTpl(t); setTplOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir modelo?")) tpls.remove(t.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
          {tpls.items.length === 0 && <div className="text-center py-8 text-muted-foreground">Nenhum modelo de checklist.</div>}
        </TabsContent>
      </Tabs>

      <OmModal open={omOpen} onOpenChange={setOmOpen} editing={editing} sites={sites.items} onSave={async (input) => {
        if (editing) await orders.update(editing.id, input);
        else await orders.add(input);
        setOmOpen(false);
      }} />

      <SiteModal open={siteOpen} onOpenChange={setSiteOpen} editing={editingSite} onSave={async (input) => {
        if (editingSite) await sites.update(editingSite.id, input);
        else await sites.add(input);
        setSiteOpen(false);
      }} />

      <TemplateModal open={tplOpen} onOpenChange={setTplOpen} editing={editingTpl} sites={sites.items} hook={tpls} />

      <ExecuteModal open={execOpen} onOpenChange={setExecOpen} template={execTpl} sites={sites.items} hook={tpls} />

      <PhotosModal open={!!photoOmId} onClose={() => setPhotoOmId(null)} omId={photoOmId} hook={orders} />
    </div>
  );
}

function KpiCard({ label, value, color, icon }: { label: string; value: number; color?: string; icon?: React.ReactNode }) {
  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</div>
      <div className={cn("text-2xl font-bold mt-1", color)}>{value}</div>
    </div>
  );
}

function OmModal({ open, onOpenChange, editing, sites, onSave }: {
  open: boolean; onOpenChange: (b: boolean) => void; editing: MaintenanceOrder | null; sites: Site[];
  onSave: (input: Partial<MaintenanceOrder>) => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<MaintenanceOrder>>({});
  useEffect(() => {
    if (open) {
      setForm(editing || { category: "Outros", priority: "Média", status: "Aberta", opened_at: todayISO() });
    }
  }, [open, editing]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? `Editar OM #${editing.om_number}` : "Nova OM"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Título *</Label>
            <Input value={form.title || ""} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Sede</Label>
            <Select value={form.site_id || ""} onValueChange={v => setForm({ ...form, site_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MAINT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Prioridade</Label>
            <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MAINT_PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MAINT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Responsável</Label>
            <Input value={form.responsible || ""} onChange={e => setForm({ ...form, responsible: e.target.value })} />
          </div>
          <div>
            <Label>Aberta em</Label>
            <Input type="date" value={form.opened_at || ""} onChange={e => setForm({ ...form, opened_at: e.target.value })} />
          </div>
          <div>
            <Label>Prazo</Label>
            <Input type="date" value={form.deadline || ""} onChange={e => setForm({ ...form, deadline: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Descrição</Label>
            <Textarea rows={3} value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Observações</Label>
            <Textarea rows={2} value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={!form.title}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SiteModal({ open, onOpenChange, editing, onSave }: {
  open: boolean; onOpenChange: (b: boolean) => void; editing: Site | null;
  onSave: (input: Partial<Site>) => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<Site>>({});
  useEffect(() => { if (open) setForm(editing || { is_active: true }); }, [open, editing]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Editar Sede" : "Nova Sede"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome *</Label><Input value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Endereço</Label><Input value={form.address || ""} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Responsável</Label><Input value={form.responsible || ""} onChange={e => setForm({ ...form, responsible: e.target.value })} /></div>
            <div><Label>Telefone</Label><Input value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.is_active !== false} onCheckedChange={v => setForm({ ...form, is_active: !!v })} /> Ativa
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={!form.name}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplateModal({ open, onOpenChange, editing, sites, hook }: {
  open: boolean; onOpenChange: (b: boolean) => void; editing: ChecklistTemplate | null;
  sites: Site[]; hook: ReturnType<typeof useChecklistTemplates>;
}) {
  const [form, setForm] = useState<Partial<ChecklistTemplate>>({});
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newItem, setNewItem] = useState("");

  useEffect(() => {
    if (open) {
      setForm(editing || { is_active: true });
      if (editing) hook.listItems(editing.id).then(setItems); else setItems([]);
    }
  }, [open, editing]);

  const handleSave = async () => {
    let tplId = editing?.id;
    if (editing) {
      await hook.update(editing.id, form);
    } else {
      const created = await hook.add(form);
      tplId = (created as any)?.id;
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{editing ? "Editar Modelo" : "Novo Modelo de Checklist"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome *</Label><Input value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div>
            <Label>Sede</Label>
            <Select value={form.site_id || ""} onValueChange={v => setForm({ ...form, site_id: v })}>
              <SelectTrigger><SelectValue placeholder="Geral / sem sede específica" /></SelectTrigger>
              <SelectContent>{sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Descrição</Label><Textarea rows={2} value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} /></div>

          {editing && (
            <div className="border rounded p-3 space-y-2">
              <Label>Itens do Checklist</Label>
              {items.map(it => (
                <div key={it.id} className="flex items-center justify-between text-sm bg-muted/30 rounded px-2 py-1">
                  <span>{it.label}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={async () => { await hook.removeItem(it.id); setItems(items.filter(i => i.id !== it.id)); }}><X className="h-3 w-3" /></Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input placeholder="Novo item..." value={newItem} onChange={e => setNewItem(e.target.value)} />
                <Button size="sm" onClick={async () => {
                  if (!newItem.trim() || !editing) return;
                  await hook.addItem(editing.id, newItem.trim(), items.length);
                  const updated = await hook.listItems(editing.id);
                  setItems(updated); setNewItem("");
                }}>Adicionar</Button>
              </div>
            </div>
          )}
          {!editing && <div className="text-xs text-muted-foreground">Salve o modelo primeiro para adicionar itens.</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={handleSave} disabled={!form.name}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExecuteModal({ open, onOpenChange, template, sites, hook }: {
  open: boolean; onOpenChange: (b: boolean) => void; template: ChecklistTemplate | null;
  sites: Site[]; hook: ReturnType<typeof useChecklistTemplates>;
}) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [responses, setResponses] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [siteId, setSiteId] = useState<string>("");

  useEffect(() => {
    if (open && template) {
      hook.listItems(template.id).then(setItems);
      setResponses({}); setNotes(""); setSiteId(template.site_id || "");
    }
  }, [open, template]);

  if (!template) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Executar: {template.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Sede</Label>
            <Select value={siteId} onValueChange={setSiteId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="border rounded p-3 space-y-2">
            {items.length === 0 && <div className="text-sm text-muted-foreground">Nenhum item neste modelo.</div>}
            {items.map(it => (
              <label key={it.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={!!responses[it.id]} onCheckedChange={v => setResponses({ ...responses, [it.id]: !!v })} />
                {it.label}
              </label>
            ))}
          </div>
          <div><Label>Observações</Label><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={async () => {
            await hook.saveExecution({ template_id: template.id, site_id: siteId || null, responses, notes });
            onOpenChange(false);
          }}>Salvar Execução</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PhotosModal({ open, onClose, omId, hook }: {
  open: boolean; onClose: () => void; omId: string | null; hook: ReturnType<typeof useMaintenanceOrders>;
}) {
  const [photos, setPhotos] = useState<MaintenancePhoto[]>([]);
  const [type, setType] = useState<"antes" | "depois">("antes");
  const [uploading, setUploading] = useState(false);

  const load = async () => { if (omId) setPhotos(await hook.listPhotos(omId)); };
  useEffect(() => { if (open) load(); }, [open, omId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !omId) return;
    setUploading(true);
    await hook.uploadPhoto(omId, file, type);
    await load();
    setUploading(false);
    e.target.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Fotos da OM</DialogTitle></DialogHeader>
        <div className="flex gap-2 items-center">
          <Select value={type} onValueChange={(v: any) => setType(v)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="antes">Antes</SelectItem>
              <SelectItem value="depois">Depois</SelectItem>
            </SelectContent>
          </Select>
          <Input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {photos.map(p => (
            <div key={p.id} className="relative group">
              <img src={p.photo_url} alt={p.photo_type} className="w-full h-32 object-cover rounded border" />
              <Badge className="absolute top-1 left-1">{p.photo_type}</Badge>
              <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={async () => { await hook.removePhoto(p.id); load(); }}><X className="h-3 w-3" /></Button>
            </div>
          ))}
          {photos.length === 0 && <div className="col-span-3 text-center py-6 text-sm text-muted-foreground">Sem fotos.</div>}
        </div>
        <DialogFooter><Button onClick={onClose}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
