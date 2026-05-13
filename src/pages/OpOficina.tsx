import { useMemo, useState } from "react";
import { Wrench, Plus, Search, Trash2, Upload, FileText, X, LayoutGrid, List, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useServiceOrders, useServiceOrderDetails, useMechanics, useParts, type ServiceOrder } from "@/hooks/useOficina";
import { useCompanies, useVehicles } from "@/hooks/useOperacional";
import OpKanbanBoard, { type KanbanColumn } from "@/components/operacional/OpKanbanBoard";
import OpClosureDialog from "@/components/operacional/OpClosureDialog";
import OpQuickActions from "@/components/operacional/OpQuickActions";
import OpNotesPanel from "@/components/operacional/OpNotesPanel";
import { cn } from "@/lib/utils";

const STATUS_LIST = ["Pendente", "Aguardando peças", "Em andamento", "Finalizado", "Cancelada"];
const TERMINAL = "Finalizado";

const statusColor: Record<string, string> = {
  "Pendente": "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  "Aguardando peças": "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  "Em andamento": "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  "Finalizado": "bg-green-500/10 text-green-700 dark:text-green-300",
  "Cancelada": "bg-red-500/10 text-red-700 dark:text-red-300",
};

// Kanban includes a derived "Em atraso" column (computed from deadline)
const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "Pendente", label: "Pendente", color: "bg-blue-500" },
  { id: "Aguardando peças", label: "Aguardando peças", color: "bg-purple-500" },
  { id: "Em andamento", label: "Em andamento", color: "bg-amber-500" },
  { id: "Em atraso", label: "Em atraso", color: "bg-rose-600" },
  { id: "Finalizado", label: "Finalizado", color: "bg-emerald-600" },
];

function fmtMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function todayISO() { return new Date().toISOString().slice(0, 10); }

function isOverdue(o: ServiceOrder): boolean {
  return !!o.deadline && o.deadline < todayISO() && o.status !== "Finalizado" && o.status !== "Cancelada";
}

export default function OpOficina() {
  const { user } = useAuth();
  const { items, partsCountByOs, add, update, remove } = useServiceOrders();
  const { items: mechanics } = useMechanics();
  const { items: companies } = useCompanies();
  const { items: vehicles } = useVehicles();

  const [view, setView] = useState<"lista" | "kanban">("kanban");
  const [hideFinalized, setHideFinalized] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [mechFilter, setMechFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Pendente" | "exec" | "atraso" | "Finalizado">("all");
  const [openNew, setOpenNew] = useState(false);
  const [selected, setSelected] = useState<ServiceOrder | null>(null);
  const [closing, setClosing] = useState<ServiceOrder | null>(null);

  const baseFiltered = useMemo(() => {
    return items.filter(o => {
      if (!o.opened_at.startsWith(month)) return false;
      if (mechFilter !== "all" && o.mechanic_id !== mechFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!(`${o.os_number}`.includes(s) ||
              (o.vehicle_plate || "").toLowerCase().includes(s) ||
              (o.description || "").toLowerCase().includes(s))) return false;
      }
      return true;
    });
  }, [items, month, mechFilter, search]);

  const filtered = useMemo(() => {
    return baseFiltered.filter(o => {
      if (statusFilter === "Pendente" && o.status !== "Pendente") return false;
      if (statusFilter === "exec" && !(o.status === "Em andamento" || o.status === "Aguardando peças")) return false;
      if (statusFilter === "atraso" && !isOverdue(o)) return false;
      if (statusFilter === "Finalizado" && o.status !== "Finalizado") return false;
      if (statusFilter === "all" && hideFinalized && view === "kanban" && o.status === "Finalizado") return false;
      return true;
    });
  }, [baseFiltered, statusFilter, hideFinalized, view]);

  const kpis = useMemo(() => {
    const pendentes = baseFiltered.filter(o => o.status === "Pendente").length;
    const exec = baseFiltered.filter(o => o.status === "Em andamento" || o.status === "Aguardando peças").length;
    const finalizadas = baseFiltered.filter(o => o.status === "Finalizado").length;
    const atrasadas = baseFiltered.filter(isOverdue).length;
    const total = baseFiltered.length;
    const custo = baseFiltered.filter(o => o.status === "Finalizado").reduce((s, o) => s + Number(o.total_cost || 0), 0);
    return { pendentes, exec, finalizadas, atrasadas, total, custo };
  }, [baseFiltered]);

  const toggleStatus = (s: typeof statusFilter) => {
    setStatusFilter(prev => prev === s ? "all" : s);
    if (s === "Finalizado") setHideFinalized(false);
  };

  const itemsByCol = useMemo(() => {
    const map: Record<string, ServiceOrder[]> = {};
    KANBAN_COLUMNS.forEach(c => { map[c.id] = []; });
    filtered.forEach(o => {
      if (isOverdue(o)) map["Em atraso"].push(o);
      else if (map[o.status]) map[o.status].push(o);
    });
    return map;
  }, [filtered]);

  const mechName = (id: string | null) => mechanics.find(m => m.id === id)?.name || "—";
  const companyName = (id: string | null) => companies.find(c => c.id === id)?.name || "—";
  const companyPhone = (id: string | null) => companies.find(c => c.id === id)?.contact_phone || null;

  const handleStatusChange = (o: ServiceOrder, newStatus: string) => {
    if (newStatus === o.status) return;
    if (newStatus === TERMINAL) { setClosing(o); return; }
    update(o.id, { status: newStatus });
  };

  const confirmClosure = async (payload: { closure_summary: string; closed_at: string; total_cost?: number }) => {
    if (!closing) return;
    await update(closing.id, {
      status: TERMINAL,
      finished_at: payload.closed_at,
      closure_summary: payload.closure_summary,
      closed_by: user?.id || null,
      ...(payload.total_cost != null ? { total_cost: payload.total_cost } : {}),
    });
    setClosing(null);
  };

  const renderCard = (o: ServiceOrder) => {
    const overdue = isOverdue(o);
    const partsCount = partsCountByOs[o.id] || 0;
    return (
      <div onClick={() => setSelected(o)}>
        <div className="flex items-start gap-2 mb-1 flex-wrap">
          <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">#{o.os_number}</span>
          {partsCount > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5">🔧 {partsCount} {partsCount === 1 ? "peça" : "peças"}</Badge>
          )}
          <span className="text-xs text-muted-foreground truncate flex-1">{companyName(o.company_id)}</span>
          {overdue && <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="h-3 w-3 mr-0.5" />Atraso</Badge>}
        </div>
        <div className="text-sm font-medium line-clamp-2">{o.description || "Sem descrição"}</div>
        <div className="text-[11px] text-muted-foreground mt-1 truncate">
          {o.vehicle_plate || "—"} · Mec.: {mechName(o.mechanic_id)}
        </div>
        {o.deadline && (
          <div className={cn("text-[11px] mt-1", overdue ? "text-rose-600 font-medium" : "text-muted-foreground")}>
            Prazo: {new Date(o.deadline).toLocaleDateString("pt-BR")}
          </div>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs font-semibold">{fmtMoney(Number(o.total_cost || 0))}</span>
          <OpQuickActions phone={companyPhone(o.company_id)} size="icon" />
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Oficina</h1>
            <p className="text-sm text-muted-foreground">Ordens de serviço, peças e fotos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as any)}>
            <TabsList>
              <TabsTrigger value="kanban"><LayoutGrid className="h-4 w-4 mr-1" />Kanban</TabsTrigger>
              <TabsTrigger value="lista"><List className="h-4 w-4 mr-1" />Lista</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setOpenNew(true)}><Plus className="h-4 w-4 mr-1" /> Nova OS</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Kpi label="Pendentes" value={kpis.pendentes} active={statusFilter === "Pendente"} onClick={() => toggleStatus("Pendente")} />
        <Kpi label="Em execução" value={kpis.exec} active={statusFilter === "exec"} onClick={() => toggleStatus("exec")} />
        <Kpi label="Em atraso" value={kpis.atrasadas} active={statusFilter === "atraso"} onClick={() => toggleStatus("atraso")} />
        <Kpi label="Finalizadas" value={kpis.finalizadas} active={statusFilter === "Finalizado"} onClick={() => toggleStatus("Finalizado")} />
        <Kpi label="Total no mês" value={kpis.total} active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
        <Kpi label="Custo finalizadas" value={fmtMoney(kpis.custo)} />
      </div>

      <div className="bg-card border rounded-lg p-3 flex flex-wrap gap-3 items-end">
        <div>
          <Label className="text-xs">Mês</Label>
          <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-[170px]" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs">Buscar</Label>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="OS, placa, descrição" className="pl-8" />
          </div>
        </div>
        {view === "kanban" && (
          <Button size="sm" variant="outline" onClick={() => setHideFinalized(v => !v)}>
            {hideFinalized ? <><EyeOff className="h-3 w-3 mr-1" />Ocultando finalizadas</> : <><Eye className="h-3 w-3 mr-1" />Mostrando todas</>}
          </Button>
        )}
      </div>

      <Tabs value={mechFilter} onValueChange={setMechFilter}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">Todos</TabsTrigger>
          {mechanics.filter(m => m.is_active).map(m => (
            <TabsTrigger key={m.id} value={m.id}>{m.name}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {view === "kanban" ? (
        <OpKanbanBoard<ServiceOrder>
          columns={KANBAN_COLUMNS}
          itemsByColumn={itemsByCol}
          renderCard={renderCard}
          resolveItem={(id) => filtered.find(o => o.id === id)}
          // "Em atraso" is derived; dropping there is not allowed
          isAllowed={(_item, _from, to) => to !== "Em atraso"}
          onMove={(item, _from, to) => handleStatusChange(item, to)}
          emptyText="Sem OS"
        />
      ) : (
        <div className="bg-card border rounded-lg divide-y">
          {filtered.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">Nenhuma OS no período</div>
          )}
          {filtered.map(o => {
            const overdue = isOverdue(o);
            return (
              <button key={o.id} onClick={() => setSelected(o)} className="w-full text-left p-4 hover:bg-muted/40 transition flex items-center gap-4">
                <div className="font-mono text-sm bg-muted px-2 py-1 rounded">#{o.os_number}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{o.description || "Sem descrição"}</span>
                    <Badge className={statusColor[o.status] || ""} variant="secondary">{o.status}</Badge>
                    {overdue && <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-0.5" />Em atraso</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {o.vehicle_plate || "—"} · {companyName(o.company_id)} · Mec.: {mechName(o.mechanic_id)} · {new Date(o.opened_at).toLocaleDateString("pt-BR")}
                    {o.deadline && <> · Prazo: {new Date(o.deadline).toLocaleDateString("pt-BR")}</>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{fmtMoney(Number(o.total_cost || 0))}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {openNew && <NewOsDialog onClose={() => setOpenNew(false)} onCreate={async (input) => { const r = await add(input); if (r) { setOpenNew(false); setSelected(r as ServiceOrder); } }} />}
      {selected && (
        <OsDetailDialog
          os={selected}
          onClose={() => setSelected(null)}
          onUpdate={(p) => update(selected.id, p)}
          onDelete={() => { remove(selected.id); setSelected(null); }}
          onRequestClose={(o) => { setSelected(null); setClosing(o); }}
          companyPhone={companyPhone(selected.company_id)}
        />
      )}

      <OpClosureDialog
        open={!!closing}
        onOpenChange={(o) => !o && setClosing(null)}
        title={closing ? `Finalizar OS #${closing.os_number}` : "Finalizar"}
        showCost
        initialCost={closing?.total_cost}
        onConfirm={confirmClosure}
      />
    </div>
  );
}

function Kpi({ label, value, active, onClick }: { label: string; value: any; active?: boolean; onClick?: () => void }) {
  const Cmp: any = onClick ? "button" : "div";
  return (
    <Cmp
      onClick={onClick}
      className={cn(
        "bg-card border rounded-lg p-3 text-left transition",
        onClick && "hover:border-primary/60 hover:shadow-sm cursor-pointer",
        active && "border-primary ring-2 ring-primary/30 bg-primary/5"
      )}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </Cmp>
  );
}

function NewOsDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (input: Partial<ServiceOrder>) => void }) {
  const { items: companies } = useCompanies();
  const { items: vehicles } = useVehicles();
  const { items: mechanics } = useMechanics();
  const [form, setForm] = useState<Partial<ServiceOrder>>({
    status: "Pendente",
    opened_at: new Date().toISOString().slice(0, 10),
  });
  const setF = (p: Partial<ServiceOrder>) => setForm(prev => ({ ...prev, ...p }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Nova Ordem de Serviço</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Cliente / Empresa</Label>
            <Select value={form.company_id || ""} onValueChange={v => setF({ company_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Mecânico</Label>
            <Select value={form.mechanic_id || ""} onValueChange={v => setF({ mechanic_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{mechanics.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Veículo (frota)</Label>
            <Select value={form.vehicle_id || ""} onValueChange={v => {
              const veh = vehicles.find(x => x.id === v);
              setF({ vehicle_id: v, vehicle_plate: veh?.plate || form.vehicle_plate, vehicle_model: veh?.model || form.vehicle_model });
            }}>
              <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
              <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.plate} · {v.model}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Placa</Label>
            <Input value={form.vehicle_plate || ""} onChange={e => setF({ vehicle_plate: e.target.value.toUpperCase() })} />
          </div>
          <div>
            <Label>Modelo</Label>
            <Input value={form.vehicle_model || ""} onChange={e => setF({ vehicle_model: e.target.value })} />
          </div>
          <div>
            <Label>Data abertura</Label>
            <Input type="date" value={form.opened_at || ""} onChange={e => setF({ opened_at: e.target.value })} />
          </div>
          <div>
            <Label>Prazo</Label>
            <Input type="date" value={form.deadline || ""} onChange={e => setF({ deadline: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Descrição do problema</Label>
            <Textarea value={form.description || ""} onChange={e => setF({ description: e.target.value })} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onCreate(form)}>Criar OS</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OsDetailDialog({ os, onClose, onUpdate, onDelete, onRequestClose, companyPhone }: {
  os: ServiceOrder;
  onClose: () => void;
  onUpdate: (p: Partial<ServiceOrder>) => void;
  onDelete: () => void;
  onRequestClose: (o: ServiceOrder) => void;
  companyPhone: string | null;
}) {
  const { parts, photos, addPart, removePart, uploadPhoto, removePhoto } = useServiceOrderDetails(os.id);
  const { items: partsCatalog } = useParts();
  const { items: mechanics } = useMechanics();
  const { items: companies } = useCompanies();

  const [status, setStatus] = useState(os.status);
  const [diagnosis, setDiagnosis] = useState(os.diagnosis || "");
  const [notes, setNotes] = useState(os.notes || "");
  const [deadline, setDeadline] = useState(os.deadline || "");
  const [openedAt, setOpenedAt] = useState(os.opened_at || "");

  const [partName, setPartName] = useState(""); const [qty, setQty] = useState("1"); const [price, setPrice] = useState("0");

  const handleAddPart = () => {
    if (!partName) return;
    addPart({ part_name: partName, quantity: Number(qty), unit_price: Number(price) });
    setPartName(""); setQty("1"); setPrice("0");
  };

  const total = parts.reduce((s, p) => s + Number(p.quantity) * Number(p.unit_price), 0);

  const saveHeader = () => {
    onUpdate({
      status,
      diagnosis,
      notes,
      deadline: deadline || null,
      opened_at: openedAt || os.opened_at,
    });
  };

  const handleStatusSelect = (v: string) => {
    if (v === TERMINAL && os.status !== TERMINAL) {
      onRequestClose(os);
      return;
    }
    setStatus(v);
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>, type: "antes" | "depois") => {
    const f = e.target.files?.[0]; if (!f) return;
    await uploadPhoto(f, type);
    e.target.value = "";
  };

  const exportPdf = () => {
    const w = window.open("", "_blank"); if (!w) return;
    const mech = mechanics.find(m => m.id === os.mechanic_id)?.name || "—";
    const comp = companies.find(c => c.id === os.company_id)?.name || "—";
    const partsRows = parts.map(p => `<tr><td>${p.part_name}</td><td style="text-align:center">${p.quantity}</td><td style="text-align:right">${fmtMoney(Number(p.unit_price))}</td><td style="text-align:right">${fmtMoney(Number(p.quantity) * Number(p.unit_price))}</td></tr>`).join("");
    const photosHtml = photos.map(p => `<div style="display:inline-block;margin:4px;text-align:center"><img src="${p.photo_url}" style="max-width:200px;max-height:160px;border:1px solid #ccc"/><div style="font-size:11px">${p.photo_type}</div></div>`).join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>OS #${os.os_number}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;color:#222}h1{margin:0 0 4px}h2{font-size:14px;margin:16px 0 6px;border-bottom:1px solid #ddd;padding-bottom:4px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:6px}th{background:#f2f2f2;text-align:left}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px}.f{padding:6px;background:#f7f7f7;border-radius:4px}</style></head><body>
      <h1>Ordem de Serviço #${os.os_number}</h1>
      <div style="font-size:12px;color:#666">Aberta em ${new Date(openedAt || os.opened_at).toLocaleDateString("pt-BR")} · Status: <b>${status}</b></div>
      <h2>Dados</h2>
      <div class="grid">
        <div class="f"><b>Cliente:</b> ${comp}</div>
        <div class="f"><b>Mecânico:</b> ${mech}</div>
        <div class="f"><b>Placa:</b> ${os.vehicle_plate || "—"}</div>
        <div class="f"><b>Modelo:</b> ${os.vehicle_model || "—"}</div>
      </div>
      <h2>Descrição</h2><div>${(os.description || "—").replace(/\n/g, "<br>")}</div>
      <h2>Diagnóstico</h2><div>${(diagnosis || "—").replace(/\n/g, "<br>")}</div>
      <h2>Peças / Itens</h2>
      <table><thead><tr><th>Item</th><th>Qtd</th><th>Unit.</th><th>Total</th></tr></thead><tbody>${partsRows || '<tr><td colspan="4" style="text-align:center">Sem itens</td></tr>'}</tbody>
      <tfoot><tr><th colspan="3" style="text-align:right">Total</th><th style="text-align:right">${fmtMoney(total)}</th></tr></tfoot></table>
      ${photos.length ? `<h2>Fotos</h2><div>${photosHtml}</div>` : ""}
      ${notes ? `<h2>Observações</h2><div>${notes.replace(/\n/g, "<br>")}</div>` : ""}
      <script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
      </body></html>`);
    w.document.close();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono bg-muted px-2 py-1 rounded text-sm">#{os.os_number}</span>
            Ordem de Serviço
            <div className="ml-auto"><OpQuickActions phone={companyPhone} /></div>
          </DialogTitle>
        </DialogHeader>

        {os.closure_summary && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-md p-3 text-sm">
            <div className="font-medium mb-1">Resumo de conclusão</div>
            <div className="whitespace-pre-wrap text-muted-foreground">{os.closure_summary}</div>
            {os.finished_at && <div className="text-xs text-muted-foreground mt-1">Finalizada em {new Date(os.finished_at).toLocaleDateString("pt-BR")}</div>}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={handleStatusSelect}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_LIST.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data de abertura</Label>
            <Input type="date" value={openedAt} onChange={e => setOpenedAt(e.target.value)} />
          </div>
          <div>
            <Label>Prazo</Label>
            <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
          <div className="text-sm md:col-span-2">
            <div><b>Cliente:</b> {companies.find(c => c.id === os.company_id)?.name || "—"}</div>
            <div><b>Veículo:</b> {os.vehicle_plate || "—"} · {os.vehicle_model || "—"}</div>
            <div><b>Mecânico:</b> {mechanics.find(m => m.id === os.mechanic_id)?.name || "—"}</div>
          </div>
          <div className="md:col-span-2">
            <Label>Descrição</Label>
            <div className="text-sm bg-muted/40 rounded p-2">{os.description || "—"}</div>
          </div>
          <div className="md:col-span-2">
            <Label>Diagnóstico / Serviço executado</Label>
            <Textarea rows={3} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Observações iniciais</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="border-t pt-3">
          <h3 className="font-medium mb-2 flex items-center gap-2">
            Peças / Itens
            <Badge variant="secondary">{parts.length}</Badge>
          </h3>
          <div className="grid grid-cols-[1fr_80px_120px_auto] gap-2 mb-2">
            <Input
              list="parts-catalog"
              placeholder="Peça/serviço"
              value={partName}
              onChange={e => {
                setPartName(e.target.value);
                const found = partsCatalog.find(p => p.name === e.target.value);
                if (found) setPrice(String(found.default_price));
              }}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddPart(); } }}
            />
            <datalist id="parts-catalog">{partsCatalog.map(p => <option key={p.id} value={p.name} />)}</datalist>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={qty}
              onChange={e => setQty(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddPart(); } }}
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="Valor"
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddPart(); } }}
            />
            <Button onClick={handleAddPart}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="border rounded divide-y text-sm">
            {parts.length === 0 && <div className="p-3 text-center text-muted-foreground text-xs">Nenhum item</div>}
            {parts.map(p => (
              <div key={p.id} className="p-2 flex items-center gap-2">
                <div className="flex-1">{p.part_name}</div>
                <div className="w-12 text-center text-xs">{p.quantity}x</div>
                <div className="w-24 text-right text-xs">{fmtMoney(Number(p.unit_price))}</div>
                <div className="w-24 text-right font-medium">{fmtMoney(Number(p.quantity) * Number(p.unit_price))}</div>
                <Button variant="ghost" size="icon" onClick={() => removePart(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            {parts.length > 0 && (
              <div className="p-2 flex justify-end font-semibold bg-muted/30">Total: {fmtMoney(total)}</div>
            )}
          </div>
        </div>

        <div className="border-t pt-3">
          <h3 className="font-medium mb-2">Fotos</h3>
          <div className="flex gap-2 mb-2">
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={e => handlePhoto(e, "antes")} />
              <span className="inline-flex items-center gap-1 text-xs px-3 py-2 border rounded hover:bg-muted"><Upload className="h-3 w-3" /> Antes</span>
            </label>
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={e => handlePhoto(e, "depois")} />
              <span className="inline-flex items-center gap-1 text-xs px-3 py-2 border rounded hover:bg-muted"><Upload className="h-3 w-3" /> Depois</span>
            </label>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {photos.map(p => (
              <div key={p.id} className="relative group">
                <img src={p.photo_url} alt={p.photo_type} className="w-full h-24 object-cover rounded border" />
                <span className="absolute bottom-1 left-1 text-[10px] bg-black/70 text-white px-1 rounded">{p.photo_type}</span>
                <button onClick={() => removePhoto(p.id)} className="absolute top-1 right-1 bg-black/70 text-white rounded p-0.5 opacity-0 group-hover:opacity-100">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-3">
          <h3 className="font-medium mb-2">Observações da equipe</h3>
          <OpNotesPanel module="service_order" cardId={os.id} />
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={exportPdf}><FileText className="h-4 w-4 mr-1" /> Exportar PDF</Button>
          <Button variant="destructive" onClick={() => { if (confirm("Excluir esta OS?")) onDelete(); }}>Excluir</Button>
          <Button onClick={() => { saveHeader(); onClose(); }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
