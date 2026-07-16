import { useEffect, useMemo, useState } from "react";
import { Truck, Plus, Pencil, Trash2, Clock, MapPin, ClipboardList, CheckCircle2, Calendar as CalIcon, Search, LayoutGrid, List, Eye, EyeOff, Phone, MessageCircle, Bike, Car, HelpCircle, Package, PackageOpen, ClipboardCheck, Wrench, Camera, ShoppingBag, Box, User, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useDeliveries, type Delivery } from "@/hooks/useDeliveries";
import { useDrivers, useCompanies, useVehicles } from "@/hooks/useOperacional";
import { useDeliveryCategories, type DeliveryCategory } from "@/hooks/useDeliveryCategories";
import { cn } from "@/lib/utils";
import OpKanbanBoard, { type KanbanColumn } from "@/components/operacional/OpKanbanBoard";
import OpClosureDialog from "@/components/operacional/OpClosureDialog";
import OpQuickActions from "@/components/operacional/OpQuickActions";
import OpNotesPanel from "@/components/operacional/OpNotesPanel";
import EntregasNav from "./op/EntregasNav";
import { useEntregasProfile } from "@/contexts/EntregasProfileContext";
import "./op/cearagps.css";
import { formatDateBR, formatDateTimeFullBR } from "@/lib/dateFormat";

const PERIODS = ["Manhã", "Tarde", "Noite"];
const STATUSES = ["Pendente", "Em rota", "Finalizado", "Cancelado"];
const TERMINAL = "Finalizado";
const VEHICLE_REQUIRED = [
  { value: "qualquer", label: "Qualquer", icon: HelpCircle },
  { value: "moto", label: "Moto", icon: Bike },
  { value: "carro", label: "Carro", icon: Car },
];

const CATEGORY_ICON_MAP: Record<string, any> = {
  Package, PackageOpen, ClipboardCheck, Truck, Bike, Car, Wrench, Camera, MapPin, ShoppingBag, Box,
};

const STATUS_COLORS: Record<string, string> = {
  "Pendente": "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  "Em rota": "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  "Finalizado": "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  "Cancelado": "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
};

const PENDING_COL = "__unassigned__";
const FINALIZED_COL = "Finalizado";

const VEHICLE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  qualquer: { label: "QUALQUER", bg: "#e5e7eb", color: "#374151" },
  moto: { label: "MOTO", bg: "#fee2e2", color: "#b91c1c" },
  carro: { label: "CARRO", bg: "#dbeafe", color: "#1d4ed8" },
};

const CARD_STATUS_PILL = (d: Delivery) => {
  if (d.status === "Finalizado") return { label: "FINALIZADO", bg: "#dcfce7", color: "#166534" };
  if (d.status === "Cancelado") return { label: "CANCELADO", bg: "#fee2e2", color: "#991b1b" };
  if (!d.driver_id) return { label: "SEM ROTA", bg: "#fef3c7", color: "#92400e" };
  if (d.status === "Em rota") return { label: "EM ROTA", bg: "#dbeafe", color: "#1d4ed8" };
  return { label: "PENDENTE", bg: "#fef3c7", color: "#92400e" };
};

type FilterMode = "tudo" | "hoje" | "semana" | "data";

function weekday(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { weekday: "long" });
}
function todayISO() { return new Date().toISOString().slice(0, 10); }

export default function OpEntregas() {
  const { user, profile } = useAuth();
  const { items: allItems, loading, add, update, remove } = useDeliveries();
  const { profile: entregasProfile } = useEntregasProfile();
  const items = useMemo(() => {
    if (!entregasProfile) return allItems;
    if (entregasProfile.type === "motorista") return allItems.filter(d => d.driver_id === entregasProfile.id);
    return allItems;
  }, [allItems, entregasProfile]);
  const { items: drivers } = useDrivers();
  const { items: companies } = useCompanies();
  const { items: vehicles } = useVehicles();
  const { activeItems: categories } = useDeliveryCategories();


  const [view, setView] = useState<"lista" | "kanban">("kanban");
  const [hideFinalized, setHideFinalized] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Delivery | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("tudo");
  const [filterDate, setFilterDate] = useState(todayISO());
  const [activeMonth, setActiveMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [activeDriver, setActiveDriver] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Closure flow
  const [closing, setClosing] = useState<Delivery | null>(null);

  // Driver average ratings
  const [driverRatings, setDriverRatings] = useState<Record<string, { avg: number; count: number }>>({});
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("op_delivery_ratings")
        .select("rating, delivery_id, op_deliveries!inner(driver_id)");
      if (!data) return;
      const map: Record<string, { sum: number; count: number }> = {};
      (data as any[]).forEach((r) => {
        const did = r.op_deliveries?.driver_id;
        if (!did) return;
        map[did] = map[did] || { sum: 0, count: 0 };
        map[did].sum += r.rating;
        map[did].count += 1;
      });
      const result: Record<string, { avg: number; count: number }> = {};
      Object.entries(map).forEach(([k, v]) => { result[k] = { avg: v.sum / v.count, count: v.count }; });
      setDriverRatings(result);
    })();
  }, [allItems]);
  const monthStart = `${activeMonth}-01`;

  const isCarriedOver = (d: Delivery) =>
    d.scheduled_date < monthStart && d.status !== "Finalizado" && d.status !== "Cancelado";
  const inMonthScope = (d: Delivery) =>
    d.scheduled_date.startsWith(activeMonth) || isCarriedOver(d);

  const filtered = useMemo(() => {
    const today = todayISO();
    const start = new Date(); start.setDate(start.getDate() - 7);
    const startISO = start.toISOString().slice(0, 10);

    return items.filter(d => {
      if (!inMonthScope(d)) return false;
      if (filterMode === "hoje" && d.scheduled_date !== today) return false;
      if (filterMode === "semana" && d.scheduled_date < startISO) return false;
      if (filterMode === "data" && d.scheduled_date !== filterDate) return false;
      if (activeDriver !== "all" && d.driver_id !== activeDriver) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (typeFilter !== "all" && d.category_id !== typeFilter) return false;

      if (search) {
        const s = search.toLowerCase();
        const company = companies.find(c => c.id === d.company_id)?.name?.toLowerCase() || "";
        const driver = drivers.find(dr => dr.id === d.driver_id)?.name?.toLowerCase() || "";
        const blob = `${company} ${driver} ${d.address || ""} ${d.contact_name || ""} ${d.notes || ""}`.toLowerCase();
        if (!blob.includes(s)) return false;
      }
      return true;
    });
  }, [items, activeMonth, filterMode, filterDate, activeDriver, statusFilter, typeFilter, search, companies, drivers, hideFinalized, view]);

  const monthItems = useMemo(() => items.filter(inMonthScope), [items, activeMonth]);
  // KPIs refletem o conjunto atualmente visível (mesmos filtros do Kanban/Lista),
  // incluindo itens atrasados arrastados de meses anteriores.
  const kpis = useMemo(() => ({
    total: filtered.length,
    pendentes: filtered.filter(d => d.status === "Pendente").length,
    emRota: filtered.filter(d => d.status === "Em rota").length,
    finalizados: filtered.filter(d => d.status === "Finalizado").length,
  }), [filtered]);


  const grouped = useMemo(() => {
    const map = new Map<string, Delivery[]>();
    [...filtered].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)).forEach(d => {
      const arr = map.get(d.scheduled_date) || [];
      arr.push(d);
      map.set(d.scheduled_date, arr);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const kanbanColumns = useMemo<KanbanColumn[]>(() => {
    const cols: KanbanColumn[] = [{ id: PENDING_COL, label: "SEM ATRIBUIÇÃO" }];
    drivers.filter(d => d.is_active).forEach(d => {
      cols.push({ id: `driver:${d.id}`, label: d.name });
    });
    if (!hideFinalized) {
      cols.push({ id: FINALIZED_COL, label: "FINALIZADAS" });
    }
    return cols;
  }, [drivers, hideFinalized]);


  const itemsByCol = useMemo(() => {
    const map: Record<string, Delivery[]> = {};
    kanbanColumns.forEach(c => { map[c.id] = []; });
    filtered.forEach(d => {
      if (d.status === "Finalizado") map[FINALIZED_COL]?.push(d);
      else if (d.driver_id && map[`driver:${d.driver_id}`]) map[`driver:${d.driver_id}`].push(d);
      else map[PENDING_COL]?.push(d);
    });
    return map;
  }, [filtered, kanbanColumns]);

  const driverCounts = useMemo(() => {
    const counts: Record<string, number> = { all: monthItems.length };
    drivers.forEach(d => { counts[d.id] = monthItems.filter(x => x.driver_id === d.id).length; });
    return counts;
  }, [monthItems, drivers]);

  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = -6; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const v = d.toISOString().slice(0, 7);
      opts.push({ value: v, label: d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) });
    }
    return opts;
  }, []);

  const openNew = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (d: Delivery) => { setEditing(d); setModalOpen(true); };

  const handleStatusChange = (d: Delivery, newStatus: string) => {
    if (newStatus === d.status) return;
    if (newStatus === TERMINAL) { setClosing(d); return; }
    update(d.id, { status: newStatus });
  };

  const confirmClosure = async (payload: { closure_summary: string; closed_at: string }) => {
    if (!closing) return;
    await update(closing.id, {
      status: TERMINAL,
      closure_summary: payload.closure_summary,
      closed_at: new Date(payload.closed_at).toISOString(),
      closed_by: user?.id || null,
    });
    setClosing(null);
  };

  const renderKanbanCard = (d: Delivery) => {
    const company = companies.find(c => c.id === d.company_id);
    const carried = isCarriedOver(d);
    const cat = categories.find(c => c.id === d.category_id);
    const CatIcon = cat ? (CATEGORY_ICON_MAP[cat.icon] || Package) : Package;
    const vr = VEHICLE_BADGE[d.vehicle_required || "qualquer"] || VEHICLE_BADGE.qualquer;
    const pill = CARD_STATUS_PILL(d);
    return (
      <div onClick={() => openEdit(d)} className="space-y-2">
        {/* Header: company + star */}
        <div className="flex items-start justify-between gap-2">
          <div className="font-bold text-[15px] leading-tight truncate">{company?.name || "Sem empresa"}</div>
          <Star className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </div>

        {/* Category badge */}
        {cat ? (
          <div
            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded"
            style={{ background: cat.color + "22", color: cat.color }}
          >
            <CatIcon className="h-3 w-3" />
            {cat.name.toUpperCase()}
          </div>
        ) : (
          <Badge variant="outline" className="text-[10px]">{d.type}</Badge>
        )}

        {/* Address */}
        {d.address && (
          <div className="flex items-start gap-1.5 text-[12px] text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{d.address}</span>
          </div>
        )}

        {/* Info rows */}
        <div className="space-y-1 pt-1 text-[12px]">
          {d.requester_name && (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Solicitante:</span>
              <span className="font-semibold truncate text-right">{d.requester_name}</span>
            </div>
          )}
          <div className="flex justify-between gap-2 items-center">
            <span className="text-muted-foreground">Veículo Necessário:</span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded"
              style={{ background: vr.bg, color: vr.color }}
            >
              {vr.label}
            </span>
          </div>
          {(d.receiver_phone || d.contact_name) && (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Recebedor:</span>
              <span className="font-semibold truncate text-right">
                {d.contact_name || d.receiver_phone}
              </span>
            </div>
          )}
        </div>

        {/* Footer: date + status pill */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className={cn("flex items-center gap-1.5 text-[11px]", carried ? "text-rose-600 font-semibold" : "text-muted-foreground")}>
            <CalIcon className="h-3.5 w-3.5" />
            {formatDateBR(d.scheduled_date)} ({d.period}){carried && " · atrasada"}
          </div>
          <span
            className="text-[10px] font-bold px-2 py-1 rounded"
            style={{ background: pill.bg, color: pill.color }}
          >
            {pill.label}
          </span>
        </div>
      </div>
    );
  };

  const renderKanbanHeader = (col: KanbanColumn, count: number) => {
    if (col.id === PENDING_COL) {
      return (
        <div className="bg-white border rounded-t-lg px-3 py-2.5 flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-wide text-muted-foreground">SEM ATRIBUIÇÃO</span>
          <span className="text-[11px] font-bold bg-muted rounded-full px-2 py-0.5">{count}</span>
        </div>
      );
    }
    if (col.id === FINALIZED_COL) {
      return (
        <div className="bg-emerald-600 text-white rounded-t-lg px-3 py-2.5 flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-wide">FINALIZADAS</span>
          <span className="text-[11px] font-bold bg-white/20 rounded-full px-2 py-0.5">{count}</span>
        </div>
      );
    }
    const driverId = col.id.slice("driver:".length);
    const driver = drivers.find(x => x.id === driverId);
    const initials = (driver?.name || "?").split(" ").filter(Boolean).slice(0, 2).map(s => s[0]).join("").toUpperCase();
    const vType = (driver?.default_vehicle_type || "").toLowerCase();
    const vLabel = vType === "moto" ? "Moto" : vType === "carro" ? "Carro" : "Veículo";
    const r = driverRatings[driverId];
    const avg = r ? r.avg.toFixed(1) : "—";
    return (
      <div className="bg-white border rounded-t-lg px-3 py-2 flex items-center gap-2">
        <div className="h-9 w-9 rounded-full bg-slate-800 text-white text-[12px] font-bold flex items-center justify-center flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[13px] truncate">{driver?.name || col.label}</div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
            {vLabel} · Média: {avg}
            <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
          </div>
        </div>
        <span className="text-[11px] font-bold bg-slate-800 text-white rounded-full h-6 min-w-6 px-1.5 flex items-center justify-center">
          {count}
        </span>
      </div>
    );
  };



  return (
    <div className="cgps-scope min-h-screen bg-[hsl(var(--cgps-muted))]">
      <EntregasNav />
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: "hsl(191 74% 20%)" }}>
            <Truck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "hsl(191 74% 20%)" }}>Entregas</h1>
            <p className="text-sm text-muted-foreground">Controle de Entregas</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as any)}>
            <TabsList>
              <TabsTrigger value="kanban"><LayoutGrid className="h-4 w-4 mr-1" />Kanban</TabsTrigger>
              <TabsTrigger value="lista"><List className="h-4 w-4 mr-1" />Lista</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nova</Button>
        </div>
      </div>

      {/* Month + filter chips */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <CalIcon className="h-4 w-4 text-muted-foreground" />
        <Select value={activeMonth} onValueChange={setActiveMonth}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>{monthOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-2">Filtrar:</span>
        {(["tudo", "hoje", "semana", "data"] as FilterMode[]).map(m => (
          <Button key={m} size="sm" variant={filterMode === m ? "default" : "outline"} onClick={() => setFilterMode(m)} className="capitalize">{m}</Button>
        ))}
        {filterMode === "data" && (
          <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-[160px]" />
        )}
        {view === "kanban" && (
          <Button size="sm" variant="outline" onClick={() => setHideFinalized(v => !v)}>
            {hideFinalized ? <><Eye className="h-3 w-3 mr-1" />Mostrar finalizados</> : <><EyeOff className="h-3 w-3 mr-1" />Ocultar finalizados</>}
          </Button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Kpi title="Total no Mês" value={kpis.total} icon={ClipboardList}
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")} />
        <Kpi title="Pendentes" value={kpis.pendentes} icon={Clock}
          active={statusFilter === "Pendente"}
          onClick={() => setStatusFilter(statusFilter === "Pendente" ? "all" : "Pendente")} />
        <Kpi title="Em Rota" value={kpis.emRota} icon={MapPin}
          active={statusFilter === "Em rota"}
          onClick={() => setStatusFilter(statusFilter === "Em rota" ? "all" : "Em rota")} />
        <Kpi title="Finalizados" value={kpis.finalizados} icon={CheckCircle2}
          active={statusFilter === "Finalizado"}
          onClick={() => { setStatusFilter(statusFilter === "Finalizado" ? "all" : "Finalizado"); setHideFinalized(false); }} />
      </div>

      {/* Driver tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        <DriverChip active={activeDriver === "all"} onClick={() => setActiveDriver("all")} label={`Todos (${driverCounts.all || 0})`} />
        {drivers.filter(d => d.is_active).map(d => (
          <DriverChip key={d.id} active={activeDriver === d.id} onClick={() => setActiveDriver(d.id)} label={`${d.name} (${driverCounts[d.id] || 0})`} />
        ))}
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por destino, motorista ou empresa..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* View */}
      {loading ? (
        <div className="text-center text-muted-foreground py-12">Carregando...</div>
      ) : view === "kanban" ? (
        <OpKanbanBoard<Delivery>
          columns={kanbanColumns}
          itemsByColumn={itemsByCol}
          renderCard={renderKanbanCard}
          renderHeader={renderKanbanHeader}
          resolveItem={(id) => filtered.find(x => x.id === id)}
          isAllowed={() => true}
          onMove={(item, _from, to) => {
            if (to === FINALIZED_COL) { handleStatusChange(item, "Finalizado"); return; }
            if (to === PENDING_COL) {
              if (item.driver_id) update(item.id, { driver_id: null });
              return;
            }
            if (to.startsWith("driver:")) {
              const driverId = to.slice("driver:".length);
              if (item.driver_id !== driverId) update(item.id, { driver_id: driverId });
            }
          }}
          emptyText="Sem entregas"
        />
      ) : grouped.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 bg-card border rounded-lg">Nenhuma entrega encontrada</div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, list]) => (
            <div key={date}>
              <div className="text-primary font-semibold mb-2 flex items-center gap-2">
                <CalIcon className="h-4 w-4" /> {formatDateBR(date)} - {weekday(date)} <span className="text-muted-foreground font-normal">({list.length})</span>
              </div>
              <div className="space-y-2">
                {list.map(d => {
                  const company = companies.find(c => c.id === d.company_id);
                  const driver = drivers.find(x => x.id === d.driver_id);
                  const vehicle = vehicles.find(v => v.id === d.vehicle_id);
                  return (
                    <div key={d.id} className="bg-card border rounded-lg p-4 cursor-pointer hover:shadow-md transition" onClick={() => openEdit(d)}>
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-[260px]">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="font-bold">{company?.name || "Sem empresa"}</span>
                            <Badge className={cn("font-normal", STATUS_COLORS[d.status])}>{d.status}</Badge>
                            <Badge variant="outline">{d.type}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>👤 {driver?.name || "—"}</span>
                            {vehicle && <span>🚗 {vehicle.plate} {vehicle.model && `(${vehicle.model})`}</span>}
                            <span>⏱ {d.period}</span>
                            {d.address && <span>📍 {d.address}</span>}
                            {d.contact_name && <span>📞 {d.contact_name} {d.contact_phone}</span>}
                          </div>
                          {d.notes && <p className="text-sm italic text-muted-foreground mt-2">{d.notes}</p>}
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <OpQuickActions phone={d.contact_phone} address={d.address} />
                          <Select value={d.status} onValueChange={(v) => handleStatusChange(d, v)}>
                            <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm("Excluir entrega?")) remove(d.id); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <DeliveryModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editing={editing}
        drivers={drivers}
        companies={companies}
        vehicles={vehicles}
        categories={categories}
        defaultRequester={profile?.full_name || ""}
        onStatusChange={handleStatusChange}
        onDelete={(id) => { remove(id); setModalOpen(false); }}
        onSubmit={async (payload) => {
          if (editing) await update(editing.id, payload);
          else await add(payload);
          setModalOpen(false);
        }}
      />

      <OpClosureDialog
        open={!!closing}
        onOpenChange={(o) => !o && setClosing(null)}
        title="O que foi feito?"
        confirmLabel="Finalizar"
        placeholder="Descreva o que foi realizado nesta entrega..."
        hideDate
        onConfirm={confirmClosure}
      />
    </div>
    </div>
  );
}

function Kpi({ title, value, icon: Icon, active, onClick }: { title: string; value: number; icon: any; active?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "bg-card border rounded-lg p-4 flex items-center justify-between text-left transition hover:shadow-md hover:border-primary/50",
        active && "border-primary ring-2 ring-primary/30"
      )}
    >
      <div>
        <div className="text-xs text-muted-foreground">{title}</div>
        <div className="text-3xl font-bold mt-1">{value}</div>
      </div>
      <Icon className="h-5 w-5 text-muted-foreground" />
    </button>
  );
}

function DriverChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className={cn("text-sm px-3 py-1.5 rounded-md border", active ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted")}>
      👤 {label}
    </button>
  );
}

function DeliveryModal({ open, onOpenChange, editing, drivers, companies, vehicles, categories, defaultRequester, onSubmit, onStatusChange, onDelete }: {
  open: boolean; onOpenChange: (b: boolean) => void; editing: Delivery | null;
  drivers: any[]; companies: any[]; vehicles: any[];
  categories: DeliveryCategory[];
  defaultRequester?: string;
  onSubmit: (p: Partial<Delivery>) => Promise<void>;
  onStatusChange: (d: Delivery, newStatus: string) => void;
  onDelete: (id: string) => void;
}) {
  const [form, setForm] = useState<Partial<Delivery>>({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => {
    if (open) setForm(editing ? { ...editing } : {
      type: "Entrega", period: "Manhã", status: "Pendente", scheduled_date: todayISO(),
      vehicle_required: "qualquer", requester_name: defaultRequester || "",
    });
  }, [open, editing]);

  const setF = (k: keyof Delivery, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = () => {
    if (!form.scheduled_date) return;
    // Sync legacy type with category name for compat
    const cat = categories.find(c => c.id === form.category_id);
    const payload = { ...form, type: cat?.name || form.type || "Entrega" };
    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 pr-6">
            <span>{editing ? "Detalhes da entrega" : "Nova entrega"}</span>
            {editing && (
              <div className="flex items-center gap-2">
                <OpQuickActions phone={editing.receiver_phone || editing.contact_phone} address={editing.address} />
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        {editing?.closure_summary && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-md p-3 text-sm">
            <div className="font-medium mb-1">Resumo de conclusão</div>
            <div className="whitespace-pre-wrap text-muted-foreground">{editing.closure_summary}</div>
            {editing.closed_at && (
              <div className="text-xs text-muted-foreground mt-1">
                Fechada em {formatDateTimeFullBR(editing.closed_at)}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Empresa</Label>
            <Select value={form.company_id || ""} onValueChange={v => setF("company_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Categoria do serviço</Label>
            <Select value={form.category_id || ""} onValueChange={v => setF("category_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Motorista</Label>
            <Select value={form.driver_id || ""} onValueChange={v => setF("driver_id", v)}>
              <SelectTrigger><SelectValue placeholder="Sem motorista" /></SelectTrigger>
              <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Veículo exigido</Label>
            <Select value={form.vehicle_required || "qualquer"} onValueChange={v => setF("vehicle_required", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{VEHICLE_REQUIRED.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Período</Label>
            <Select value={form.period} onValueChange={v => setF("period", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PERIODS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Data</Label>
            <Input type="date" value={form.scheduled_date || ""} onChange={e => setF("scheduled_date", e.target.value)} />
          </div>
          <div className="md:col-span-2"><Label>Endereço</Label>
            <Input value={form.address || ""} onChange={e => setF("address", e.target.value)} />
          </div>
          <div><Label>Nome do solicitante</Label>
            <Input value={form.requester_name || ""} onChange={e => setF("requester_name", e.target.value)} placeholder="Quem pediu o serviço" />
          </div>
          <div><Label>Nome do recebedor</Label>
            <Input value={form.contact_name || ""} onChange={e => setF("contact_name", e.target.value)} placeholder="Quem vai receber" />
          </div>
          <div><Label>Telefone do recebedor *</Label>
            <Input value={form.receiver_phone || ""} onChange={e => setF("receiver_phone", e.target.value)} placeholder="(85) 9 9999-9999" />
          </div>
          <div><Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={v => {
                if (editing && v === TERMINAL && editing.status !== TERMINAL) {
                  onStatusChange(editing, v);
                  return;
                }
                setF("status", v);
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label>Observações iniciais</Label>
            <Textarea value={form.notes || ""} onChange={e => setF("notes", e.target.value)} rows={2} />
          </div>
        </div>

        {editing && (
          <div className="border-t pt-3 mt-3">
            <div className="font-medium text-sm mb-2">Observações da equipe</div>
            <OpNotesPanel module="delivery" cardId={editing.id} />
          </div>
        )}

        <DialogFooter className="gap-2">
          {editing && (
            <Button variant="ghost" className="text-destructive mr-auto" onClick={() => { if (confirm("Excluir entrega?")) onDelete(editing.id); }}>
              <Trash2 className="h-4 w-4 mr-1" /> Excluir
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={handleSubmit} className="cgps-btn-primary">{editing ? "Salvar" : "Criar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
