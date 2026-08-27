import DateRangeFilter, { currentMonthStart, todayStr, inDateRange } from "@/components/shared/DateRangeFilter";
import { filterOficinaCompanies } from "@/lib/oficinaCompanies";
import { useEffect, useMemo, useState } from "react";
import { Wrench, Plus, Search, Trash2, Upload, FileText, X, LayoutGrid, List, Eye, EyeOff, AlertTriangle, ShoppingCart, Package, Gauge, ChevronUp, ChevronDown, Truck, Check, Home, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useServiceOrders, useServiceOrderDetails, useServiceChecklists, useMechanics, useParts, type ServiceOrder, type ServiceChecklistItem } from "@/hooks/useOficina";
import { useCompanies, useVehicles } from "@/hooks/useOperacional";
import OpKanbanBoard, { type KanbanColumn } from "@/components/operacional/OpKanbanBoard";
import OpClosureDialog from "@/components/operacional/OpClosureDialog";
import OpQuickActions from "@/components/operacional/OpQuickActions";
import OpNotesPanel from "@/components/operacional/OpNotesPanel";
import OpMoveLogPanel from "@/components/operacional/OpMoveLogPanel";
import OsProgressBar from "@/components/operacional/OsProgressBar";
import OsChecklist from "@/components/operacional/OsChecklist";
import OsScoredChecklist from "@/components/operacional/OsScoredChecklist";
import OsAuditPanel from "@/components/operacional/OsAuditPanel";
import { useServiceTypes, useOsServiceItems, useExtraServices } from "@/hooks/useOficinaScoring";
import OficinaNav from "@/pages/op/OficinaNav";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDateBR } from "@/lib/dateFormat";
import {
  STAGES, STAGE_ENTREGUE, isDoneStage, stageInfo, DIAS_ALERTA,
  PART_STATUS_FLOW, PART_STATUS_INFO, daysInWorkshop,
  CHECKLIST_PARTS_LABEL,
} from "@/lib/oficinaStages";
import { SCHEDULE_PERIODS, periodInfo, formatDateBRShort } from "@/lib/oficinaAgenda";
import { useWorkshopBookings } from "@/hooks/useWorkshopBookings";
import { openOsFromBooking } from "@/lib/openOsFromBooking";
import { supabase } from "@/integrations/supabase/client";
import { Fancybox } from "@fancyapps/ui/dist/fancybox/fancybox.js";
import "@fancyapps/ui/dist/fancybox/fancybox.css";



const TERMINAL = "Finalizado";

/** Apenas cadastros com função "mecânico" entram nos filtros/seletores de mecânico. */
const onlyMechanics = <T extends { is_active?: boolean; role?: string }>(list: T[]): T[] =>
  list.filter((m) => m.is_active !== false && (m.role || "mecanico") === "mecanico");

/** Opções do seletor de mecânico: só mecânicos, mantendo o responsável atual se já estiver atribuído. */
const mechanicOptions = <T extends { id: string; is_active?: boolean; role?: string }>(list: T[], currentId?: string | null): T[] => {
  const opts = onlyMechanics(list);
  const cur = list.find((m) => m.id === currentId);
  return cur && !opts.some((o) => o.id === cur.id) ? [...opts, cur] : opts;
};

function fmtMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function todayISO() { return new Date().toISOString().slice(0, 10); }

function isDelivered(o: ServiceOrder) {
  return isDoneStage(o.stage) || o.status === TERMINAL;
}

/** Alerta único: mais de DIAS_ALERTA dias na oficina. Motos com o cliente não geram alerta. */
function isOverdue(o: ServiceOrder): boolean {
  if (isDelivered(o) || o.status === "Cancelada") return false;
  if (o.with_customer) return false;
  return daysInWorkshop(o.opened_at) >= DIAS_ALERTA;
}

const KANBAN_COLUMNS: KanbanColumn[] = STAGES.map(s => ({ id: s.id, label: s.label, color: s.bar }));
const DELIVERED_COLUMN: KanbanColumn = { id: STAGE_ENTREGUE, label: "Entregue", color: "bg-emerald-700" };

export default function OpOficina() {
  const { user } = useAuth();
  const { items, partsByOs, partsCountByOs, add, update, remove, setPartStatus, movePriority, refetch } = useServiceOrders();
  const checklist = useServiceChecklists();
  const osItemsMain = useOsServiceItems();


  const { items: mechanics } = useMechanics();
  const { items: companies } = useCompanies();

  const [view, setView] = useState<"kanban" | "lista" | "compras">("kanban");
  const [hideDelivered, setHideDelivered] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState(currentMonthStart());
  const [dateTo, setDateTo] = useState(todayStr());
  const [mechFilter, setMechFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [kpiFilter, setKpiFilter] = useState<"all" | "active" | "in_workshop" | "late" | "waiting_part" | "delivered" | "with_customer">("all");
  const [openNew, setOpenNew] = useState(false);
  const [selected, setSelected] = useState<ServiceOrder | null>(null);
  const [closing, setClosing] = useState<ServiceOrder | null>(null);

  const baseFiltered = useMemo(() => {
    return items.filter(o => {
      if (!inDateRange(o.opened_at, dateFrom, dateTo)) return false;
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
  }, [items, dateFrom, dateTo, mechFilter, search]);

  const filtered = useMemo(() => {
    return baseFiltered.filter(o => {
      switch (kpiFilter) {
        case "active": return !isDelivered(o);
        case "in_workshop": return !isDelivered(o) && !o.with_customer;
        case "late": return isOverdue(o);
        case "waiting_part": return !isDelivered(o) && o.stage === "aguardando_peca";
        case "delivered": return isDelivered(o);
        case "with_customer": return !isDelivered(o) && !!o.with_customer;
        default: return true;
      }
    });
  }, [baseFiltered, kpiFilter]);

  const kpis = useMemo(() => {
    const ativas = baseFiltered.filter(o => !isDelivered(o));
    return {
      total: ativas.length,
      atrasadas: baseFiltered.filter(isOverdue).length,
      aguardPeca: ativas.filter(o => o.stage === "aguardando_peca").length,
      entregues: baseFiltered.filter(isDelivered).length,
      comCliente: ativas.filter(o => !!o.with_customer).length,
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

  /** Peças disponíveis: registra a chegada e libera a definição do prazo de entrega. */
  const handlePartsAvailable = async (o: ServiceOrder) => {
    const arrived = todayISO();
    await update(o.id, {
      parts_arrived_at: arrived,
      stage: o.stage === "aguardando_peca" ? "execucao" : o.stage,
    });
    await checklist.markLabelDone(o.id, CHECKLIST_PARTS_LABEL);
  };

  /** Marca/desmarca que a moto está com o cliente aguardando as peças (fora da oficina). */
  const toggleWithCustomer = async (o: ServiceOrder) => {
    const next = !o.with_customer;
    await update(o.id, {
      with_customer: next,
      with_customer_at: next ? new Date().toISOString() : null,
    } as Partial<ServiceOrder>);
    toast.success(next ? "Moto marcada como com o cliente" : "Moto marcada como na oficina");
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

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderCard = (o: ServiceOrder) => {
    const expanded = expandedIds.has(o.id);
    const overdue = isOverdue(o);
    const days = daysInWorkshop(o.opened_at, o.finished_at);
    const partsCount = partsCountByOs[o.id] || 0;
    const osParts = partsByOs[o.id] || [];
    const pendingParts = osParts.filter((p: any) => (p.part_status || "solicitada") !== "recebida").length;
    const hasAlert = !!o.supervisor_alert;

    const chk = (osItemsMain.byOs[o.id]?.length ? osItemsMain.byOs[o.id] : checklist.byOs[o.id]) || [];
    const stg = stageInfo(isDelivered(o) ? STAGE_ENTREGUE : o.stage);

    if (!expanded) {
      return (
        <div className="cursor-pointer" onClick={() => toggleExpanded(o.id)}>
          <div className="flex items-start justify-between mb-1 gap-1">
            <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded shrink-0">#{o.os_number}</span>
            <div className="flex items-center gap-1 flex-wrap justify-end">
              {overdue && <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="h-3 w-3 mr-0.5" />Alerta</Badge>}
              {hasAlert && (
                <Badge className="text-[10px] h-5 bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-400/40">
                  <AlertTriangle className="h-3 w-3 mr-0.5" />Resolver alerta
                </Badge>
              )}
              {pendingParts > 0 && (
                <Badge className="text-[10px] h-5 bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-400/40">
                  <Package className="h-3 w-3 mr-0.5" />{pendingParts} a receber
                </Badge>
              )}
              {partsCount > 0 && pendingParts === 0 && (
                <Badge variant="outline" className="text-[10px] h-5"><Package className="h-3 w-3 mr-0.5" />{partsCount}</Badge>
              )}
              {o.with_customer && (
                <Badge variant="outline" className="text-[10px] h-5 border-sky-300 text-sky-700 dark:text-sky-300">
                  <Home className="h-3 w-3 mr-0.5" />Com o cliente
                </Badge>
              )}
            </div>
          </div>
          <div className="text-sm font-semibold truncate">
            {[o.vehicle_plate, o.vehicle_model].filter(Boolean).join(" · ") || "Sem veículo"}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
            Empresa: {companyName(o.company_id)}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            Mecânico: {mechName(o.mechanic_id)}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className={cn("text-[10px] h-5", days >= DIAS_ALERTA && !o.with_customer && "bg-rose-500/15 text-rose-700 dark:text-rose-300")}>
              {days}d na oficina
            </Badge>
            <span className="text-[10px] text-muted-foreground italic">Clique para expandir</span>
          </div>
        </div>
      );
    }

    return (
      <div>
        <div className="flex items-start gap-2 mb-1 flex-wrap cursor-pointer" onClick={() => toggleExpanded(o.id)}>
          <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">#{o.os_number}</span>
          <Badge variant="secondary" className={cn("text-[10px] h-5", days >= DIAS_ALERTA && !o.with_customer && "bg-rose-500/15 text-rose-700 dark:text-rose-300")}>
            {days}d na oficina
          </Badge>
          {partsCount > 0 && (
            <Badge variant="outline" className="text-[10px] h-5"><Package className="h-3 w-3 mr-0.5" />{partsCount}</Badge>
          )}
          {overdue && <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="h-3 w-3 mr-0.5" />Alerta</Badge>}
          {o.with_customer && (
            <Badge variant="outline" className="text-[10px] h-5 border-sky-300 text-sky-700 dark:text-sky-300">
              <Home className="h-3 w-3 mr-0.5" />Com o cliente
            </Badge>
          )}
        </div>
        <div className="text-sm font-semibold truncate cursor-pointer" onClick={() => toggleExpanded(o.id)}>
          {[o.vehicle_plate, o.vehicle_model, o.vehicle_color, o.vehicle_year].filter(Boolean).join(" · ") || "Sem veículo"}
        </div>
        <div className="text-[11px] text-muted-foreground mt-1 truncate cursor-pointer" onClick={() => toggleExpanded(o.id)}>
          Empresa: {companyName(o.company_id)}
        </div>
        <div className="text-[11px] text-muted-foreground truncate cursor-pointer" onClick={() => toggleExpanded(o.id)}>
          Mecânico: {mechName(o.mechanic_id)}
        </div>
        <div className="text-[11px] text-muted-foreground line-clamp-2 mt-1 cursor-pointer" onClick={() => toggleExpanded(o.id)}>
          {o.description || "Sem descrição"}
        </div>

        {pendingParts > 0 && (
          <div className="mt-2 rounded border border-orange-400/40 bg-orange-500/10 p-2 text-[11px] text-orange-800 dark:text-orange-300">
            <div className="flex items-center gap-1 font-medium">
              <Package className="h-3 w-3" /> {pendingParts} de {partsCount} peça(s) sem recebimento
            </div>
            <div className="mt-0.5 truncate">
              {osParts.filter((p: any) => (p.part_status || "solicitada") !== "recebida").map((p: any) => p.part_name).join(", ")}
            </div>
          </div>
        )}

        {hasAlert && (
          <div className="mt-2 rounded border border-amber-400/40 bg-amber-500/10 p-2 text-[11px]">
            <div className="flex items-center gap-1 font-medium text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-3 w-3" /> {o.supervisor_alert_reason || "Alerta do mecânico"}
            </div>
            {o.supervisor_alert_note && (
              <div className="mt-0.5 whitespace-pre-wrap text-amber-900/80 dark:text-amber-200/80">{o.supervisor_alert_note}</div>
            )}
            <Button
              size="sm"
              variant="outline"
              className="mt-2 h-7 text-[11px] w-full"
              onClick={(e) => {
                e.stopPropagation();
                update(o.id, { supervisor_alert: false, supervisor_alert_resolved_at: new Date().toISOString() } as any);
              }}
            >
              <Check className="h-3 w-3 mr-1" /> Marcar alerta como resolvido
            </Button>
          </div>
        )}

        {!isDelivered(o) && (
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
              <Input
                type="date"
                value={o.scheduled_date || ""}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => { e.stopPropagation(); update(o.id, { scheduled_date: e.target.value || null }); }}
                className="h-7 text-[11px] px-2 py-0 flex-1 min-w-0"
              />
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const idx = SCHEDULE_PERIODS.findIndex(p => p.id === o.scheduled_period);
                const next = SCHEDULE_PERIODS[(idx + 1) % SCHEDULE_PERIODS.length];
                update(o.id, { scheduled_period: next.id });
              }}
              className={cn("text-[10px] px-2 py-1 rounded border shrink-0", periodInfo(o.scheduled_period).chip.replace(/\//g, " "))}
            >
              {periodInfo(o.scheduled_period).label}
            </button>
          </div>
        )}

        {chk.length > 0 && (
          <OsProgressBar items={chk} barClass={stg.bar} className="mt-2" compact />
        )}
        {!isDelivered(o) && (
          <Button
            size="sm"
            variant={o.with_customer ? "secondary" : "outline"}
            className="mt-1.5 h-7 w-full text-[11px]"
            onClick={(e) => { e.stopPropagation(); toggleWithCustomer(o); }}
          >
            <Home className="h-3.5 w-3.5 mr-1" />
            {o.with_customer ? "Retornou à oficina" : "Moto com o cliente"}
          </Button>
        )}

        <div className="flex items-center justify-between mt-2">
          <span className="text-xs font-semibold">{fmtMoney(Number(o.total_cost || 0))}</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" title="Abrir OS"
              onClick={(e) => { e.stopPropagation(); setSelected(o); }}>
              <FileText className="h-3.5 w-3.5" />
            </Button>
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
              Fluxo por etapas · alerta após {DIAS_ALERTA} dias na oficina · motos com o cliente não geram alerta
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
        <Kpi label="Motos ativas" value={kpis.total} icon={Wrench} active={kpiFilter === "active"} onClick={() => setKpiFilter(f => f === "active" ? "all" : "active")} />
        <Kpi label="Motos fisicamente na oficina" value={kpis.total - kpis.comCliente} icon={Gauge} active={kpiFilter === "in_workshop"} onClick={() => setKpiFilter(f => f === "in_workshop" ? "all" : "in_workshop")} />
        <Kpi label="Em alerta / atrasadas" value={kpis.atrasadas} icon={AlertTriangle} active={kpiFilter === "late"} onClick={() => setKpiFilter(f => f === "late" ? "all" : "late")} />
        <Kpi label="Aguardando peça" value={kpis.aguardPeca} icon={Package} active={kpiFilter === "waiting_part"} onClick={() => setKpiFilter(f => f === "waiting_part" ? "all" : "waiting_part")} />
        <Kpi label="Entregues no período" value={kpis.entregues} icon={Truck} active={kpiFilter === "delivered"} onClick={() => setKpiFilter(f => f === "delivered" ? "all" : "delivered")} />
        <Kpi label="Com o cliente" value={kpis.comCliente} icon={Home} active={kpiFilter === "with_customer"} onClick={() => setKpiFilter(f => f === "with_customer" ? "all" : "with_customer")} />
      </div>

      <div className="bg-card border rounded-lg p-3 flex flex-wrap gap-3 items-end">
        <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs">Buscar</Label>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="OS, placa, modelo, descrição" className="pl-8" />
          </div>
        </div>
        <Button size="sm" variant={kpiFilter === "late" ? "destructive" : "outline"} onClick={() => setKpiFilter(f => f === "late" ? "all" : "late")}>
          <AlertTriangle className="h-3 w-3 mr-1" /> Só atrasadas
        </Button>
        {view === "kanban" && (
          <>
            <Button size="sm" variant="outline" onClick={() => setHideDelivered(v => !v)}>
              {hideDelivered ? <><EyeOff className="h-3 w-3 mr-1" />Ocultando entregues</> : <><Eye className="h-3 w-3 mr-1" />Mostrando todas</>}
            </Button>
          </>
        )}
      </div>

      <Tabs value={mechFilter} onValueChange={setMechFilter}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">Todos</TabsTrigger>
          {onlyMechanics(mechanics).map(m => (
            <TabsTrigger key={m.id} value={m.id}>{m.name}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {view === "kanban" && (
        <div className="flex gap-3 items-start">
          <ConfirmedBookingsColumn companies={companies} onCreated={refetch} />
          <div className="flex-1 min-w-0">
            <OpKanbanBoard<ServiceOrder>
              columns={columns}
              itemsByColumn={itemsByCol}
              renderCard={renderCard}
              resolveItem={(id) => filtered.find(o => o.id === id)}
              onMove={(item, _from, to) => handleStageChange(item, to)}
              emptyText="— sem motos —"
            />
          </div>
        </div>
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
          onPartsArrived={handlePartsAvailable}
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
          checklistItems={checklist.byOs[selected.id] || []}
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
  const withParts = orders.filter(o => {
    const ps = partsByOs[o.id] || [];
    return ps.length > 0 && !ps.every(p => p.part_status === "recebida");
  });
  if (withParts.length === 0) {
    return <div className="bg-card border rounded-lg p-12 text-center text-muted-foreground">Nenhuma peça pendente de compra ou recebimento</div>;
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
  const stHook = useServiceTypes();
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
            <Label>Empresa *</Label>
            <Select value={form.company_id || ""} onValueChange={v => setF({ company_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
              <SelectContent>{filterOficinaCompanies(companies).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cliente / Associado</Label>
            <Input value={form.customer_name || ""} onChange={e => setF({ customer_name: e.target.value })} placeholder="Nome do cliente/associado" />
          </div>
          <div>

            <Label>Mecânico</Label>
            <Select value={form.mechanic_id || "__none__"} onValueChange={v => setF({ mechanic_id: v === "__none__" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="A definir" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">A definir</SelectItem>
                {mechanicOptions(mechanics, form.mechanic_id).map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
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
            <Label>Checklist do serviço</Label>
            <Select value={form.service_type_id || ""} onValueChange={v => setF({ service_type_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
              <SelectContent>
                {stHook.typesForCompany(form.company_id || null).map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name} · {t.maxPoints ?? "—"} pts</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-[11px] mt-1 text-muted-foreground">Itens pontuados que valem para a premiação do mecânico.</div>
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
          <Button onClick={() => {
            if (!form.company_id) return toast.error("Selecione a empresa");
            onCreate(form);
          }}>Criar OS</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OsDetailDialog({ os, onClose, onUpdate, onDelete, onRequestClose, companyPhone, checklistItems }: {
  os: ServiceOrder;
  onClose: () => void;
  onUpdate: (p: Partial<ServiceOrder>) => void;
  onDelete: () => void;
  onRequestClose: (o: ServiceOrder) => void;
  companyPhone: string | null;
  checklistItems: ServiceChecklistItem[];
}) {

  const { parts, photos, addPart, updatePart, removePart, uploadPhoto, removePhoto } = useServiceOrderDetails(os.id);
  const { items: partsCatalog } = useParts();
  const { items: mechanics } = useMechanics();
  const { items: companies } = useCompanies();
  const stHook = useServiceTypes();
  const osItems = useOsServiceItems();
  const extrasHook = useExtraServices();

  const [stage, setStage] = useState(os.stage || "analise");
  const [diagnosis, setDiagnosis] = useState(os.diagnosis || "");
  const [notes] = useState(os.notes || "");
  const [deadline, setDeadline] = useState(os.deadline || "");
  const [scheduledDate, setScheduledDate] = useState(os.scheduled_date || "");
  const [scheduledPeriod, setScheduledPeriod] = useState(os.scheduled_period || "dia");
  const openedAt = os.opened_at || "";
  const [companyId, setCompanyId] = useState<string>(os.company_id || "");
  const [customerName, setCustomerName] = useState<string>(os.customer_name || "");

  const [mechanicId, setMechanicId] = useState<string>(os.mechanic_id || "");
  const [vehiclePlate, setVehiclePlate] = useState<string>(os.vehicle_plate || "");
  const [vehicleModel, setVehicleModel] = useState<string>(os.vehicle_model || "");

  const [partName, setPartName] = useState(""); const [qty, setQty] = useState("1");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = (g: string) => setCollapsedGroups(prev => ({ ...prev, [g]: !prev[g] }));

  useEffect(() => {
    Fancybox.bind("[data-fancybox='os-detail']", {});
    return () => Fancybox.destroy();
  }, [photos.length]);

  const handleAddPart = () => {
    if (!partName) return;
    addPart({ part_name: partName, quantity: Number(qty), unit_price: 0 });
    setPartName(""); setQty("1");
  };

  const days = daysInWorkshop(openedAt || os.opened_at, os.finished_at);

  const saveHeader = () => {
    onUpdate({
      stage,
      diagnosis,
      deadline: deadline || null,
      scheduled_date: scheduledDate || null,
      scheduled_period: scheduledPeriod,
      company_id: companyId || null,
      customer_name: customerName || null,

      mechanic_id: mechanicId || null,
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
    const partsRows = parts.map(p => `<tr><td>${p.part_name}</td><td style="text-align:center">${p.quantity}</td><td style="text-align:center">${(PART_STATUS_INFO[p.part_status] || PART_STATUS_INFO.solicitada).label}</td></tr>`).join("");
    const photosHtml = photos.map(p => `<div style="display:inline-block;margin:4px;text-align:center"><img src="${p.photo_url}" style="max-width:200px;max-height:160px;border:1px solid #ccc"/><div style="font-size:11px">${p.photo_type}</div></div>`).join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>OS #${os.os_number}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;color:#222}h1{margin:0 0 4px}h2{font-size:14px;margin:16px 0 6px;border-bottom:1px solid #ddd;padding-bottom:4px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:6px}th{background:#f2f2f2;text-align:left}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px}.f{padding:6px;background:#f7f7f7;border-radius:4px}</style></head><body>
      <h1>Ordem de Serviço #${os.os_number}</h1>
      <div style="font-size:12px;color:#666">Entrada em ${formatDateBR(openedAt || os.opened_at)} · Etapa: <b>${stageInfo(stage).label}</b> · ${days} dias na oficina</div>
      <h2>Dados</h2>
      <div class="grid">
        <div class="f"><b>Empresa:</b> ${comp}</div>
        <div class="f"><b>Cliente/Associado:</b> ${os.customer_name || "—"}</div>

        <div class="f"><b>Mecânico:</b> ${mech}</div>
        <div class="f"><b>Placa:</b> ${os.vehicle_plate || "—"}</div>
        <div class="f"><b>Modelo:</b> ${os.vehicle_model || "—"}</div>
      </div>
      <h2>Descrição</h2><div>${(os.description || "—").replace(/\n/g, "<br>")}</div>
      <h2>Diagnóstico</h2><div>${(diagnosis || "—").replace(/\n/g, "<br>")}</div>
      <h2>Peças / Itens</h2>
      <table><thead><tr><th>Item</th><th>Qtd</th><th>Situação</th></tr></thead><tbody>${partsRows || '<tr><td colspan="3" style="text-align:center">Sem itens</td></tr>'}</tbody>
      </table>
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
            <Badge variant="secondary" className={cn(days >= DIAS_ALERTA && !os.with_customer && "bg-rose-500/15 text-rose-700 dark:text-rose-300")}>{days}d na oficina</Badge>
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
            <Input value={formatDateBR(os.created_at || os.opened_at)} readOnly disabled />
          </div>
          <div>
            <Label>Prazo de entrega</Label>
            <Input
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              disabled={!os.parts_arrived_at}
            />
            <div className="text-[11px] mt-1 text-muted-foreground">
              {os.parts_arrived_at
                ? `Peças recebidas em ${formatDateBR(os.parts_arrived_at)}`
                : "Prazo liberado após confirmação de peças"}
            </div>
          </div>

          <div>
            <Label>Data de execução</Label>
            <Input
              type="date"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
            />
            <div className="text-[11px] mt-1 text-muted-foreground">
              Dia em que a moto deve entrar na oficina para execução.
            </div>
          </div>
          <div>
            <Label>Período de execução</Label>
            <Select value={scheduledPeriod} onValueChange={v => setScheduledPeriod(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SCHEDULE_PERIODS.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <Label>Empresa</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{filterOficinaCompanies(companies).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cliente / Associado</Label>
            <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nome do cliente/associado" />
          </div>

          <div>
            <Label>Mecânico</Label>
            <Select value={mechanicId || "__none__"} onValueChange={v => setMechanicId(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="A definir" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">A definir</SelectItem>
                {mechanicOptions(mechanics, mechanicId).map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Checklist do serviço</Label>
            {(() => {
              const hasItems = (osItems.byOs[os.id] || []).length > 0;
              return (
                <>
                  <Select
                    value={os.service_type_id || "__none__"}
                    disabled={hasItems}
                    onValueChange={async (v) => {
                      const typeId = v === "__none__" ? null : v;
                      onUpdate({ service_type_id: typeId });
                      if (typeId) await osItems.seedFromType(os, typeId);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Sem checklist" /></SelectTrigger>
                    <SelectContent>
                      {!hasItems && <SelectItem value="__none__">Sem checklist</SelectItem>}
                      {stHook.typesForCompany(companyId || null).map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name} · {t.maxPoints ?? "—"} pts</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {hasItems && (
                    <div className="text-[11px] mt-1 text-muted-foreground">Checklist já gerado para esta OS.</div>
                  )}
                </>
              );
            })()}
          </div>
          <div>
            <Label>Placa</Label>
            <Input value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value.toUpperCase())} />
          </div>
          <div>
            <Label>Modelo</Label>
            <Input value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Descrição</Label>
            <div className="text-sm bg-muted/40 rounded p-2">{os.description || "—"}</div>
          </div>
          <div className="md:col-span-2">
            <Label>Diagnóstico / Observações</Label>
            <Textarea rows={4} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
          </div>

        </div>

        {(osItems.byOs[os.id] || []).length > 0 ? (
          <OsScoredChecklist
            items={osItems.byOs[os.id] || []}
            availableExtras={extrasHook.extrasForCompany(companyId || os.company_id)}
            readOnly={os.stage === STAGE_ENTREGUE || os.status === TERMINAL}
            barClass={stageInfo(stage).bar}
            onToggle={osItems.toggle}
            onAddExtra={(extra) => osItems.addExtraItem(os, extra)}
            onAddCustom={(label) => osItems.addCustomItem(os, label)}
            onRemove={(item) => osItems.removeItem(item.id)}
          />
        ) : checklistItems.length > 0 ? (
          /* OS antiga: checklist legado preservado somente para visualização */
          <OsChecklist items={checklistItems} readOnly barClass={stageInfo(stage).bar} />
        ) : null}

        <OsAuditPanel
          items={osItems.byOs[os.id] || []}
          readOnly={os.points_status === "aprovada" || os.points_status === "ajustada"}
          showFinalize
          onApprove={(item, approved) => osItems.setItemApproval(item, approved)}
          onAdjust={(item, pts) => osItems.setItemAuditPoints(item, pts)}
          onFinalize={() => { void osItems.finalizeAudit(os.id, osItems.byOs[os.id] || [], null); }}
        />



        <div className="border-t pt-3">
          <h3 className="font-medium mb-2 flex items-center gap-2">
            Peças / Itens
            <Badge variant="secondary">{parts.length}</Badge>
          </h3>
          <div className="grid grid-cols-[1fr_80px_auto] gap-2 mb-2">
            <Input
              list="parts-catalog"
              placeholder="Peça/serviço"
              value={partName}
              onChange={e => setPartName(e.target.value)}
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
            <Button onClick={handleAddPart}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {parts.length === 0 && <div className="border rounded p-3 text-center text-muted-foreground text-xs">Nenhum item</div>}
            {PART_STATUS_FLOW.filter(s => parts.some(p => (p.part_status || "solicitada") === s)).map(s => {
              const group = parts.filter(p => (p.part_status || "solicitada") === s);
              const collapsed = !!collapsedGroups[s];
              return (
                <div key={s} className="border rounded overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleGroup(s)}
                    className="w-full flex items-center gap-2 px-2 py-2 bg-muted/50 hover:bg-muted text-sm"
                  >
                    {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", PART_STATUS_INFO[s].chip)}>{PART_STATUS_INFO[s].label}</span>
                    <Badge variant="secondary" className="ml-auto">{group.length}</Badge>
                  </button>
                  {!collapsed && (
                    <div className="divide-y text-sm">
                      {group.map(p => (
                        <div key={p.id} className="p-2 flex items-center gap-2 flex-wrap">
                          <div className="flex-1 min-w-[120px]">{p.part_name}</div>
                          <div className="w-12 text-center text-xs">{p.quantity}x</div>
                          <Select value={p.part_status} onValueChange={(v) => updatePart(p.id, { part_status: v })}>
                            <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {PART_STATUS_FLOW.map(st => <SelectItem key={st} value={st}>{PART_STATUS_INFO[st].label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" onClick={() => removePart(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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
                <a href={p.photo_url} data-fancybox="os-detail" data-caption={`${p.photo_type} · OS #${os.os_number}`}>
                  <img src={p.photo_url} alt={p.photo_type} className="w-full h-24 object-cover rounded border cursor-pointer" />
                </a>
                <span className="absolute bottom-1 left-1 text-[10px] bg-black/70 text-white px-1 rounded pointer-events-none">{p.photo_type}</span>
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

        <div className="border-t pt-3">
          <OpMoveLogPanel module="service_order" cardId={os.id} />
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

/* ---------- Coluna de agendamentos confirmados (vertical colapsada / expandida) ---------- */
function ConfirmedBookingsColumn({ onCreated }: { onCreated?: () => void }) {
  const { items, loading, refetch, remove } = useWorkshopBookings();
  const { user } = useAuth();
  const [opening, setOpening] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [panelOpen, setPanelOpen] = useState(false);

  const list = useMemo(
    () => items
      .filter(b => b.status === "agendado")
      .sort((a, b) => (a.scheduled_date || "").localeCompare(b.scheduled_date || "")),
    [items],
  );

  const handleOpen = async (b: typeof list[number]) => {
    setOpening(b.id);
    try {
      if (b.service_order_id) {
        // OS já criada no momento do agendamento: apenas marca a chegada
        const { error } = await supabase
          .from("op_workshop_bookings" as any)
          .update({ status: "em_atendimento" } as any)
          .eq("id", b.id);
        if (error) { toast.error(error.message); return; }
        toast.success(`Chegada registrada para ${b.vehicle_plate}`);
        refetch(); onCreated?.();
        return;
      }
      const os = await openOsFromBooking(b, { userId: user?.id, serviceTypeId: (b as any).service_type_id || null });
      if (os) { refetch(); onCreated?.(); }
    } finally {
      setOpening(null);
    }
  };


  const handleDelete = async (b: typeof list[number]) => {
    if (!confirm(`Excluir o agendamento da moto ${b.vehicle_plate}? Use quando o veículo não comparecer.`)) return;
    await remove(b.id);
    refetch();
  };

  if (!panelOpen) {
    return (
      <button
        type="button"
        onClick={() => setPanelOpen(true)}
        className="flex-shrink-0 w-14 flex flex-col items-center py-3 rounded-lg border border-border bg-card hover:border-primary/60 hover:bg-primary/5 transition text-center"
        title="Agendamentos confirmados"
      >
        <Calendar className="h-5 w-5 text-primary mb-2" />
        <span className="text-lg font-bold leading-none">{list.length}</span>
        <span
          className="text-[10px] font-medium text-muted-foreground mt-2 tracking-wide"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          Agendamentos
        </span>
      </button>
    );
  }

  return (
    <div className="flex-shrink-0 w-[300px] flex flex-col">
      <div className="bg-teal-600 text-white rounded-t-lg px-3 py-2 flex items-center justify-between">
        <span className="text-xs font-semibold truncate">Agendamentos confirmados</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold bg-white/20 rounded-full px-2 py-0.5">{list.length}</span>
          <button
            type="button"
            onClick={() => setPanelOpen(false)}
            className="text-white/80 hover:text-white"
            title="Recolher"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 rounded-b-lg border border-t-0 border-border bg-background p-2 space-y-2 overflow-y-auto max-h-[70vh]">
        {loading && <div className="text-center py-8 text-xs text-muted-foreground">Carregando…</div>}
        {!loading && list.length === 0 && (
          <div className="text-center py-8 text-xs text-muted-foreground">— sem agendamentos —</div>
        )}
        {list.map(b => {
          const per = periodInfo(b.scheduled_period);
          const isToday = b.scheduled_date === todayISO();
          const isOpen = !!expanded[b.id];
          return (
            <div
              key={b.id}
              className="rounded-lg border border-border bg-card p-3 space-y-1.5 cursor-pointer"
              onClick={() => setExpanded(p => ({ ...p, [b.id]: !p[b.id] }))}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-semibold">{b.vehicle_plate}</span>
                <Badge variant="secondary" className={per.chip}>{per.label}</Badge>
              </div>
              <div className="text-xs text-muted-foreground truncate">{b.vehicle_model || "—"}</div>
              <div className="flex items-center gap-1.5 text-xs">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className={cn(isToday && "font-semibold text-primary")}>
                  {formatDateBRShort(b.scheduled_date)}{isToday ? " · hoje" : ""}
                </span>
              </div>
              {isOpen && (
                <>
                  {b.service_type && <div className="text-[11px] text-muted-foreground truncate">{b.service_type}</div>}
                  {b.requester_name && <div className="text-[11px] text-muted-foreground truncate">Solic.: {b.requester_name}</div>}
                  <Button
                    size="sm"
                    className="w-full h-7 text-xs mt-1"
                    disabled={opening === b.id}
                    onClick={(e) => { e.stopPropagation(); handleOpen(b); }}
                  >
                    {opening === b.id ? "Abrindo..." : "Abrir OS (chegou)"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-7 text-xs text-destructive hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); handleDelete(b); }}
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Não compareceu · excluir
                  </Button>
                </>
              )}
            </div>
          );

        })}
      </div>
    </div>
  );
}
