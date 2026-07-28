import { useMemo, useState } from "react";
import { Wrench, Plus, Search, Trash2, Upload, FileText, X, LayoutGrid, List, Eye, EyeOff, AlertTriangle, ShoppingCart, Package, Gauge, ChevronUp, ChevronDown, Truck, Check } from "lucide-react";
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
import OficinaNav from "@/pages/op/OficinaNav";
import { cn } from "@/lib/utils";
import { formatDateBR } from "@/lib/dateFormat";
import {
  STAGES, STAGE_ENTREGUE, stageInfo, DIAS_ALERTA, SLA_PECAS,
  PART_STATUS_FLOW, PART_STATUS_INFO, daysInWorkshop, partsSlaRemaining,
} from "@/lib/oficinaStages";

const TERMINAL = "Finalizado";

function fmtMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function todayISO() { return new Date().toISOString().slice(0, 10); }

function isDelivered(o: ServiceOrder) {
  return o.stage === STAGE_ENTREGUE || o.status === TERMINAL;
}

function isOverdue(o: ServiceOrder): boolean {
  if (isDelivered(o) || o.status === "Cancelada") return false;
  if (o.deadline && o.deadline < todayISO()) return true;
  if (daysInWorkshop(o.opened_at) >= DIAS_ALERTA) return true;
  const rest = partsSlaRemaining(o.parts_arrived_at);
  return rest != null && rest < 0;
}

const KANBAN_COLUMNS: KanbanColumn[] = STAGES.map(s => ({ id: s.id, label: s.label, color: s.bar }));
const DELIVERED_COLUMN: KanbanColumn = { id: STAGE_ENTREGUE, label: "Entregue", color: "bg-emerald-700" };

export default function OpOficina() {
  const { user } = useAuth();
  const { items, partsByOs, partsCountByOs, add, update, remove, setPartStatus, movePriority } = useServiceOrders();
  const { items: mechanics } = useMechanics();
  const { items: companies } = useCompanies();

  const [view, setView] = useState<"kanban" | "lista" | "compras">("kanban");
  const [hideDelivered, setHideDelivered] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [mechFilter, setMechFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [onlyLate, setOnlyLate] = useState(false);
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
              (o.vehicle_model || "").toLowerCase().includes(s) ||
              (o.description || "").toLowerCase().includes(s))) return false;
      }
      return true;
    });
  }, [items, month, mechFilter, search]);

  const filtered = useMemo(
    () => baseFiltered.filter(o => (onlyLate ? isOverdue(o) : true)),
    [baseFiltered, onlyLate],
  );

  const kpis = useMemo(() => {
    const ativas = baseFiltered.filter(o => !isDelivered(o));
    const media = ativas.length
      ? Math.round(ativas.reduce((s, o) => s + daysInWorkshop(o.opened_at), 0) / ativas.length)
      : 0;
    return {
      total: ativas.length,
      media,
      atrasadas: baseFiltered.filter(isOverdue).length,
      aguardPeca: ativas.filter(o => o.stage === "aguardando_peca").length,
      entregues: baseFiltered.filter(isDelivered).length,
      custo: baseFiltered.filter(isDelivered).reduce((s, o) => s + Number(o.total_cost || 0), 0),
    };
  }, [baseFiltered]);

  const columns = hideDelivered ? KANBAN_COLUMNS : [...KANBAN_COLUMNS, DELIVERED_COLUMN];

  const itemsByCol = useMemo(() => {
    const map: Record<string, ServiceOrder[]> = {};
    columns.forEach(c => { map[c.id] = []; });
    filtered.forEach(o => {
      const key = isDelivered(o) ? STAGE_ENTREGUE : o.stage;
      if (map[key]) map[key].push(o);
    });
    Object.values(map).forEach(list =>
      list.sort((a, b) => (a.kanban_position - b.kanban_position) || a.os_number - b.os_number));
    return map;
  }, [filtered, columns]);

  const mechName = (id: string | null) => mechanics.find(m => m.id === id)?.name || "A definir";
  const companyName = (id: string | null) => companies.find(c => c.id === id)?.name || "—";
  const companyPhone = (id: string | null) => companies.find(c => c.id === id)?.contact_phone || null;

  const handleStageChange = (o: ServiceOrder, newStage: string) => {
    if (newStage === o.stage) return;
    if (newStage === STAGE_ENTREGUE) { setClosing(o); return; }
    const patch: Partial<ServiceOrder> = { stage: newStage };
    // Regra: ao sair da análise para orçamento/aguardando peça, desvincula o mecânico
    if (o.stage === "analise" && (newStage === "orcamento" || newStage === "aguardando_peca")) {
      patch.mechanic_id = null;
    }
    update(o.id, patch);
  };

  const confirmClosure = async (payload: { closure_summary: string; closed_at: string; total_cost?: number }) => {
    if (!closing) return;
    await update(closing.id, {
      stage: STAGE_ENTREGUE,
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
    const days = daysInWorkshop(o.opened_at, o.finished_at);
    const partsCount = partsCountByOs[o.id] || 0;
    const slaParts = partsSlaRemaining(o.parts_arrived_at);
    return (
      <div>
        <div className="flex items-start gap-2 mb-1 flex-wrap" onClick={() => setSelected(o)}>
          <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">#{o.os_number}</span>
          <Badge variant="secondary" className={cn("text-[10px] h-5", days >= DIAS_ALERTA && "bg-rose-500/15 text-rose-700 dark:text-rose-300")}>
            {days}d na oficina
          </Badge>
          {partsCount > 0 && (
            <Badge variant="outline" className="text-[10px] h-5"><Package className="h-3 w-3 mr-0.5" />{partsCount}</Badge>
          )}
          {overdue && <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="h-3 w-3 mr-0.5" />Alerta</Badge>}
        </div>
        <div className="text-sm font-medium line-clamp-2" onClick={() => setSelected(o)}>
          {o.description || "Sem descrição"}
        </div>
        <div className="text-[11px] text-muted-foreground mt-1 truncate" onClick={() => setSelected(o)}>
          {o.vehicle_plate || "—"} · {companyName(o.company_id)} · Mec.: {mechName(o.mechanic_id)}
        </div>
        {slaParts != null && !isDelivered(o) && (
          <div className={cn("text-[11px] mt-1", slaParts < 0 ? "text-rose-600 font-medium" : "text-muted-foreground")}>
            SLA peças: {slaParts < 0 ? `${Math.abs(slaParts)}d em atraso` : `${slaParts}d restantes`}
          </div>
        )}
        {o.deadline && (
          <div className={cn("text-[11px] mt-0.5", o.deadline < todayISO() && !isDelivered(o) ? "text-rose-600 font-medium" : "text-muted-foreground")}>
            Prazo: {formatDateBR(o.deadline)}
          </div>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs font-semibold">{fmtMoney(Number(o.total_cost || 0))}</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" title="Subir prioridade"
              onClick={(e) => { e.stopPropagation(); movePriority(o, -1); }}>
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" title="Descer prioridade"
              onClick={(e) => { e.stopPropagation(); movePriority(o, 1); }}>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
            <OpQuickActions phone={companyPhone(o.company_id)} size="icon" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
    <OficinaNav />
    <div className="p-6 max-w-[1400px] mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Oficina</h1>
            <p className="text-sm text-muted-foreground">
              Fluxo por etapas · alerta em {DIAS_ALERTA} dias na oficina · SLA de {SLA_PECAS} dias após a chegada das peças
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as any)}>
            <TabsList>
              <TabsTrigger value="kanban"><LayoutGrid className="h-4 w-4 mr-1" />Etapas</TabsTrigger>
              <TabsTrigger value="lista"><List className="h-4 w-4 mr-1" />Lista</TabsTrigger>
              <TabsTrigger value="compras"><ShoppingCart className="h-4 w-4 mr-1" />Compras</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setOpenNew(true)}><Plus className="h-4 w-4 mr-1" /> Nova entrada</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Kpi label="Motos ativas" value={kpis.total} icon={Wrench} />
        <Kpi label="Média dias na oficina" value={`${kpis.media}d`} icon={Gauge} />
        <Kpi label="Em alerta / atrasadas" value={kpis.atrasadas} icon={AlertTriangle} active={onlyLate} onClick={() => setOnlyLate(v => !v)} />
        <Kpi label="Aguardando peça" value={kpis.aguardPeca} icon={Package} />
        <Kpi label="Entregues no mês" value={kpis.entregues} icon={Truck} />
        <Kpi label="Custo entregues" value={fmtMoney(kpis.custo)} />
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
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="OS, placa, modelo, descrição" className="pl-8" />
          </div>
        </div>
        <Button size="sm" variant={onlyLate ? "destructive" : "outline"} onClick={() => setOnlyLate(v => !v)}>
          <AlertTriangle className="h-3 w-3 mr-1" /> Só atrasadas
        </Button>
        {view === "kanban" && (
          <Button size="sm" variant="outline" onClick={() => setHideDelivered(v => !v)}>
            {hideDelivered ? <><EyeOff className="h-3 w-3 mr-1" />Ocultando entregues</> : <><Eye className="h-3 w-3 mr-1" />Mostrando todas</>}
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

      {view === "kanban" && (
        <OpKanbanBoard<ServiceOrder>
          columns={columns}
          itemsByColumn={itemsByCol}
          renderCard={renderCard}
          resolveItem={(id) => filtered.find(o => o.id === id)}
          onMove={(item, _from, to) => handleStageChange(item, to)}
          emptyText="— sem motos —"
        />
      )}

      {view === "lista" && (
        <div className="bg-card border rounded-lg divide-y">
          {filtered.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">Nenhuma OS no período</div>
          )}
          {filtered.map(o => {
            const overdue = isOverdue(o);
            const st = stageInfo(isDelivered(o) ? STAGE_ENTREGUE : o.stage);
            return (
              <button key={o.id} onClick={() => setSelected(o)} className="w-full text-left p-4 hover:bg-muted/40 transition flex items-center gap-4">
                <div className="font-mono text-sm bg-muted px-2 py-1 rounded">#{o.os_number}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{o.description || "Sem descrição"}</span>
                    <Badge className={st.chip} variant="secondary">{st.label}</Badge>
                    {(partsCountByOs[o.id] || 0) > 0 && (
                      <Badge variant="outline" className="text-[10px]"><Package className="h-3 w-3 mr-0.5" />{partsCountByOs[o.id]}</Badge>
                    )}
                    {overdue && <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-0.5" />Em alerta</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {o.vehicle_plate || "—"} · {companyName(o.company_id)} · Mec.: {mechName(o.mechanic_id)} · {daysInWorkshop(o.opened_at, o.finished_at)}d na oficina
                    {o.deadline && <> · Prazo: {formatDateBR(o.deadline)}</>}
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

      {view === "compras" && (
        <ComprasView
          orders={filtered.filter(o => !isDelivered(o))}
          partsByOs={partsByOs}
          companyName={companyName}
          onOpen={setSelected}
          onPartStatus={setPartStatus}
          onPartsArrived={(o) => update(o.id, { parts_arrived_at: todayISO(), stage: o.stage === "aguardando_peca" ? "execucao" : o.stage })}
        />
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
        title={closing ? `Entregar OS #${closing.os_number}` : "Entregar"}
        showCost
        initialCost={closing?.total_cost}
        onConfirm={confirmClosure}
      />
    </div>
    </>
  );
}

function Kpi({ label, value, active, onClick, icon: Icon }: { label: string; value: any; active?: boolean; onClick?: () => void; icon?: any }) {
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
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className="h-3.5 w-3.5" />} {label}
      </div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </Cmp>
  );
}

function ComprasView({ orders, partsByOs, companyName, onOpen, onPartStatus, onPartsArrived }: {
  orders: ServiceOrder[];
  partsByOs: Record<string, any[]>;
  companyName: (id: string | null) => string;
  onOpen: (o: ServiceOrder) => void;
  onPartStatus: (partId: string, status: string) => void;
  onPartsArrived: (o: ServiceOrder) => void;
}) {
  const withParts = orders.filter(o => (partsByOs[o.id] || []).length > 0);
  if (withParts.length === 0) {
    return <div className="bg-card border rounded-lg p-12 text-center text-muted-foreground">Nenhuma peça na fila de compras</div>;
  }
  return (
    <div className="space-y-3">
      {withParts.map(o => {
        const parts = partsByOs[o.id] || [];
        const allReceived = parts.every(p => p.part_status === "recebida");
        return (
          <div key={o.id} className="bg-card border rounded-lg p-3">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <button className="font-mono text-xs bg-muted px-2 py-1 rounded" onClick={() => onOpen(o)}>#{o.os_number}</button>
              <span className="font-medium text-sm">{o.vehicle_plate || "—"} · {o.vehicle_model || "—"}</span>
              <span className="text-xs text-muted-foreground">{companyName(o.company_id)}</span>
              <Badge variant="secondary" className={stageInfo(o.stage).chip}>{stageInfo(o.stage).label}</Badge>
              <div className="ml-auto flex items-center gap-2">
                {o.parts_arrived_at ? (
                  <span className="text-xs text-muted-foreground">Peças chegaram em {formatDateBR(o.parts_arrived_at)}</span>
                ) : (
                  <Button size="sm" variant={allReceived ? "default" : "outline"} onClick={() => onPartsArrived(o)}>
                    <Check className="h-3.5 w-3.5 mr-1" /> Registrar chegada das peças
                  </Button>
                )}
              </div>
            </div>
            <div className="border rounded divide-y text-sm">
              {parts.map(p => {
                const info = PART_STATUS_INFO[p.part_status] || PART_STATUS_INFO.solicitada;
                const idx = PART_STATUS_FLOW.indexOf(p.part_status);
                const next = idx >= 0 && idx < PART_STATUS_FLOW.length - 1 ? PART_STATUS_FLOW[idx + 1] : null;
                return (
                  <div key={p.id} className="p-2 flex items-center gap-2 flex-wrap">
                    <div className="flex-1 min-w-[140px]">{p.part_name}</div>
                    <div className="text-xs w-12 text-center">{p.quantity}x</div>
                    <Badge variant="secondary" className={info.chip}>{info.label}</Badge>
                    {next && (
                      <Button size="sm" variant="outline" onClick={() => onPartStatus(p.id, next)}>
                        Marcar como {PART_STATUS_INFO[next].label}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NewOsDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (input: Partial<ServiceOrder>) => void }) {
  const { items: companies } = useCompanies();
  const { items: vehicles } = useVehicles();
  const { items: mechanics } = useMechanics();
  const [form, setForm] = useState<Partial<ServiceOrder>>({
    status: "Pendente",
    stage: "analise",
    opened_at: new Date().toISOString().slice(0, 10),
  });
  const setF = (p: Partial<ServiceOrder>) => setForm(prev => ({ ...prev, ...p }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Nova entrada na oficina</DialogTitle></DialogHeader>
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
            <Label>Etapa inicial</Label>
            <Select value={form.stage || "analise"} onValueChange={v => setF({ stage: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
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
            <Label>Data entrada</Label>
            <Input type="date" value={form.opened_at || ""} onChange={e => setF({ opened_at: e.target.value })} />
          </div>
          <div>
            <Label>Prazo</Label>
            <Input type="date" value={form.deadline || ""} onChange={e => setF({ deadline: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Tipo de serviço / problema</Label>
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
  const { parts, photos, addPart, updatePart, removePart, uploadPhoto, removePhoto } = useServiceOrderDetails(os.id);
  const { items: partsCatalog } = useParts();
  const { items: mechanics } = useMechanics();
  const { items: companies } = useCompanies();
  const { items: vehicles } = useVehicles();

  const [stage, setStage] = useState(os.stage || "analise");
  const [diagnosis, setDiagnosis] = useState(os.diagnosis || "");
  const [notes, setNotes] = useState(os.notes || "");
  const [deadline, setDeadline] = useState(os.deadline || "");
  const [openedAt, setOpenedAt] = useState(os.opened_at || "");
  const [partsArrivedAt, setPartsArrivedAt] = useState(os.parts_arrived_at || "");
  const [companyId, setCompanyId] = useState<string>(os.company_id || "");
  const [mechanicId, setMechanicId] = useState<string>(os.mechanic_id || "");
  const [vehicleId, setVehicleId] = useState<string>(os.vehicle_id || "");
  const [vehiclePlate, setVehiclePlate] = useState<string>(os.vehicle_plate || "");
  const [vehicleModel, setVehicleModel] = useState<string>(os.vehicle_model || "");

  const [partName, setPartName] = useState(""); const [qty, setQty] = useState("1"); const [price, setPrice] = useState("0");

  const handleAddPart = () => {
    if (!partName) return;
    addPart({ part_name: partName, quantity: Number(qty), unit_price: Number(price) });
    setPartName(""); setQty("1"); setPrice("0");
  };

  const total = parts.reduce((s, p) => s + Number(p.quantity) * Number(p.unit_price), 0);
  const days = daysInWorkshop(openedAt || os.opened_at, os.finished_at);
  const slaParts = partsSlaRemaining(partsArrivedAt || null);

  const saveHeader = () => {
    onUpdate({
      stage,
      diagnosis,
      notes,
      deadline: deadline || null,
      opened_at: openedAt || os.opened_at,
      parts_arrived_at: partsArrivedAt || null,
      company_id: companyId || null,
      mechanic_id: mechanicId || null,
      vehicle_id: vehicleId || null,
      vehicle_plate: vehiclePlate || null,
      vehicle_model: vehicleModel || null,
    });
  };

  const handleStageSelect = (v: string) => {
    if (v === STAGE_ENTREGUE) { onRequestClose(os); return; }
    setStage(v);
    if (os.stage === "analise" && (v === "orcamento" || v === "aguardando_peca")) setMechanicId("");
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
    const partsRows = parts.map(p => `<tr><td>${p.part_name}</td><td style="text-align:center">${p.quantity}</td><td style="text-align:center">${(PART_STATUS_INFO[p.part_status] || PART_STATUS_INFO.solicitada).label}</td><td style="text-align:right">${fmtMoney(Number(p.unit_price))}</td><td style="text-align:right">${fmtMoney(Number(p.quantity) * Number(p.unit_price))}</td></tr>`).join("");
    const photosHtml = photos.map(p => `<div style="display:inline-block;margin:4px;text-align:center"><img src="${p.photo_url}" style="max-width:200px;max-height:160px;border:1px solid #ccc"/><div style="font-size:11px">${p.photo_type}</div></div>`).join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>OS #${os.os_number}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;color:#222}h1{margin:0 0 4px}h2{font-size:14px;margin:16px 0 6px;border-bottom:1px solid #ddd;padding-bottom:4px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:6px}th{background:#f2f2f2;text-align:left}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px}.f{padding:6px;background:#f7f7f7;border-radius:4px}</style></head><body>
      <h1>Ordem de Serviço #${os.os_number}</h1>
      <div style="font-size:12px;color:#666">Entrada em ${formatDateBR(openedAt || os.opened_at)} · Etapa: <b>${stageInfo(stage).label}</b> · ${days} dias na oficina</div>
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
      <table><thead><tr><th>Item</th><th>Qtd</th><th>Situação</th><th>Unit.</th><th>Total</th></tr></thead><tbody>${partsRows || '<tr><td colspan="5" style="text-align:center">Sem itens</td></tr>'}</tbody>
      <tfoot><tr><th colspan="4" style="text-align:right">Total</th><th style="text-align:right">${fmtMoney(total)}</th></tr></tfoot></table>
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
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span className="font-mono bg-muted px-2 py-1 rounded text-sm">#{os.os_number}</span>
            Ordem de Serviço
            <Badge variant="secondary" className={cn(days >= DIAS_ALERTA && "bg-rose-500/15 text-rose-700 dark:text-rose-300")}>{days}d na oficina</Badge>
            <div className="ml-auto"><OpQuickActions phone={companyPhone} /></div>
          </DialogTitle>
        </DialogHeader>

        {os.closure_summary && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-md p-3 text-sm">
            <div className="font-medium mb-1">Resumo de entrega</div>
            <div className="whitespace-pre-wrap text-muted-foreground">{os.closure_summary}</div>
            {os.finished_at && <div className="text-xs text-muted-foreground mt-1">Entregue em {formatDateBR(os.finished_at)}</div>}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Etapa</Label>
            <Select value={stage} onValueChange={handleStageSelect}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                <SelectItem value={STAGE_ENTREGUE}>Entregue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data de entrada</Label>
            <Input type="date" value={openedAt} onChange={e => setOpenedAt(e.target.value)} />
          </div>
          <div>
            <Label>Chegada das peças</Label>
            <div className="flex gap-2">
              <Input type="date" value={partsArrivedAt} onChange={e => setPartsArrivedAt(e.target.value)} />
              <Button variant="outline" onClick={() => setPartsArrivedAt(todayISO())}>Hoje</Button>
            </div>
            {slaParts != null && (
              <div className={cn("text-[11px] mt-1", slaParts < 0 ? "text-rose-600 font-medium" : "text-muted-foreground")}>
                SLA de {SLA_PECAS} dias: {slaParts < 0 ? `${Math.abs(slaParts)}d em atraso` : `${slaParts}d restantes`}
              </div>
            )}
          </div>
          <div>
            <Label>Prazo</Label>
            <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
          <div>
            <Label>Cliente</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Mecânico</Label>
            <Select value={mechanicId} onValueChange={setMechanicId}>
              <SelectTrigger><SelectValue placeholder="A definir" /></SelectTrigger>
              <SelectContent>{mechanics.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Veículo (frota)</Label>
            <Select value={vehicleId} onValueChange={v => {
              setVehicleId(v);
              const veh = vehicles.find(x => x.id === v);
              if (veh) { setVehiclePlate(veh.plate || ""); setVehicleModel(veh.model || ""); }
            }}>
              <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
              <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.plate} · {v.model}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Placa</Label>
            <Input value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value.toUpperCase())} />
          </div>
          <div className="md:col-span-2">
            <Label>Modelo</Label>
            <Input value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} />
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
              <div key={p.id} className="p-2 flex items-center gap-2 flex-wrap">
                <div className="flex-1 min-w-[120px]">{p.part_name}</div>
                <div className="w-12 text-center text-xs">{p.quantity}x</div>
                <Select value={p.part_status} onValueChange={(v) => updatePart(p.id, { part_status: v })}>
                  <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PART_STATUS_FLOW.map(s => <SelectItem key={s} value={s}>{PART_STATUS_INFO[s].label}</SelectItem>)}
                  </SelectContent>
                </Select>
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
          <Button variant="secondary" onClick={() => onRequestClose(os)}><Truck className="h-4 w-4 mr-1" /> Entregar</Button>
          <Button onClick={() => { saveHeader(); onClose(); }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
