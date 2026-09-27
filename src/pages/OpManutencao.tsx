import DateRangeFilter, { currentMonthStart, todayStr, inDateRange } from "@/components/shared/DateRangeFilter";
import { useEffect, useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Wrench, Plus, Pencil, Trash2, AlertTriangle, Building2, Image as ImageIcon, X, LayoutGrid, List, Eye, EyeOff, ChevronLeft, ChevronRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import {
  useSites, useMaintenanceOrders,
  MAINT_CATEGORIES, MAINT_PRIORITIES, MAINT_STATUSES,
  type MaintenanceOrder, type Site, type MaintenancePhoto,
} from "@/hooks/useManutencao";
import { useMaintTechnicians, type MaintTechnician } from "@/hooks/useMaintTechnicians";
import { useDeliveryRequesters, type DeliveryRequester } from "@/hooks/useDeliveryRequesters";
import { useMaintProfile } from "@/hooks/useMaintProfile";
import { useSectors } from "@/hooks/useSectors";
import OpKanbanBoard, { type KanbanColumn } from "@/components/operacional/OpKanbanBoard";
import OpClosureDialog from "@/components/operacional/OpClosureDialog";
import OpQuickActions from "@/components/operacional/OpQuickActions";
import OpNotesPanel from "@/components/operacional/OpNotesPanel";
import OpMoveLogPanel from "@/components/operacional/OpMoveLogPanel";
import { cn } from "@/lib/utils";
import ManutencaoNav from "@/pages/op/ManutencaoNav";
import MaintenanceMaterials from "@/components/operacional/MaintenanceMaterials";
import { formatMaintenanceDue, maintenanceDueAt, maintenanceIsOverdue, readMaterials, TECH_TONES, weekDates, weekStart } from "@/lib/maintenancePlanning";
import MaintenanceOpeningEvidence from "@/components/operacional/MaintenanceOpeningEvidence";
import { toast } from "sonner";

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

const STATUS_KANBAN_COLUMNS: { id: string; label: string; color: string }[] = [
  { id: "Aberta", label: "Aberta", color: "bg-amber-500" },
  { id: "Em execução", label: "Em execução", color: "bg-blue-500" },
  { id: "Concluída", label: "Concluída", color: "bg-emerald-600" },
  { id: "Cancelada", label: "Cancelada", color: "bg-rose-500" },
];
const PENDING_COL = "__unassigned__";
const FINALIZED_COL = "__finalized__";
const TERMINAL = "Concluída";

export default function OpManutencao() {
  const { user } = useAuth();
  const maintProfile = useMaintProfile();
  const isAdmin = maintProfile.role === "admin";
  const isTecnico = maintProfile.role === "tecnico";
  const isSolicitante = maintProfile.role === "solicitante";

  const [searchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const tab = isAdmin && rawTab === "sedes" ? rawTab : "ordens";

  const sites = useSites();
  const orders = useMaintenanceOrders();
  const mechanics = useMaintTechnicians();
  const requesters = useDeliveryRequesters();

  const [dateFrom, setDateFrom] = useState(() => currentMonthStart());
  const [dateTo, setDateTo] = useState(() => todayStr());
  const [activeSite, setActiveSite] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [techFilter, setTechFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "Aberta" | "Em execução" | "Concluída" | "atraso">("all");
  const [view, setView] = useState<"lista" | "kanban">("kanban");
  const [hideFinalized, setHideFinalized] = useState(true);
  const [clockMinute, setClockMinute] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setClockMinute(v => v + 1), 60000); return () => window.clearInterval(timer); }, []);
  const [weekOffset, setWeekOffset] = useState(0);
  const week = useMemo(() => {
    const start = weekStart();
    start.setDate(start.getDate() + weekOffset * 7);
    return weekDates(start);
  }, [weekOffset]);
  const [closing, setClosing] = useState<MaintenanceOrder | null>(null);

  const [omOpen, setOmOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceOrder | null>(null);
  const [photoOmId, setPhotoOmId] = useState<string | null>(null);

  const [siteOpen, setSiteOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);


  const today = todayISO();

  const baseFiltered = useMemo(() => {
    return orders.items.filter(o => {
      // Profile scoping (only affects operacional org via useMaintProfile)
      if (isTecnico && o.assigned_technician_id !== maintProfile.mechanicId) return false;
      if (isSolicitante && o.requester_id !== maintProfile.requesterId) return false;
       if (view === "lista" && !inDateRange(o.opened_at, dateFrom, dateTo)) return false;
      if (activeSite !== "all" && o.site_id !== activeSite) return false;
      if (categoryFilter !== "all" && o.category !== categoryFilter) return false;
      if (techFilter === "none" && o.assigned_technician_id) return false;
      if (techFilter !== "all" && techFilter !== "none" && o.assigned_technician_id !== techFilter) return false;
      return true;
    });
  }, [orders.items, dateFrom, dateTo, activeSite, categoryFilter, techFilter, isTecnico, isSolicitante, maintProfile.mechanicId, maintProfile.requesterId, view]);

  const exportReport = () => {
    const techName = (id: string | null) => mechanics.items.find(m => m.id === id)?.name || "Sem técnico";
    const siteName = (id: string | null) => sites.items.find(s => s.id === id)?.name || "";
    const rows = baseFiltered.filter(o => inDateRange(o.opened_at, dateFrom, dateTo));
    const hours = (o: MaintenanceOrder) => o.finished_at ? (new Date(o.finished_at).getTime() - new Date(o.opened_at).getTime()) / 3600000 : null;
    const fmtD = (s: string | null) => s ? new Date(s).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "";
    const num = (n: number | null) => n == null ? "" : n.toFixed(1).replace(".", ",");
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines: string[] = [];
    const group = (title: string, key: (o: MaintenanceOrder) => string) => {
      lines.push("", esc(title), ["Grupo", "Total", "Concluídas", "Tempo médio de reparo (h)"].map(esc).join(";"));
      const map = new Map<string, MaintenanceOrder[]>();
      rows.forEach(o => { const k = key(o) || "—"; map.set(k, [...(map.get(k) || []), o]); });
      [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR")).forEach(([k, list]) => {
        const done = list.map(hours).filter((h): h is number => h != null && h >= 0);
        const avg = done.length ? done.reduce((a, b) => a + b, 0) / done.length : null;
        lines.push([k, list.length, done.length, num(avg)].map(esc).join(";"));
      });
    };
    lines.push(esc(`Relatório Manutenção Predial - ${dateFrom} a ${dateTo}`));
    group("Por técnico", o => techName(o.assigned_technician_id));
    group("Por categoria", o => o.category);
    group("Por setor", o => o.sector || "");
    lines.push("", esc("Detalhado"), ["OM", "Abertura", "Fechamento", "Tempo de reparo (h)", "Técnico", "Categoria", "Setor", "Sede", "Status"].map(esc).join(";"));
    rows.forEach(o => lines.push([o.om_number, fmtD(o.opened_at), fmtD(o.finished_at), num(hours(o)), techName(o.assigned_technician_id), o.category, o.sector || "", siteName(o.site_id), o.status].map(esc).join(";")));
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `relatorio-manutencao-${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const filtered = useMemo(() => {
    return baseFiltered.filter(o => {
      const overdue = maintenanceIsOverdue(o);
      if (statusFilter === "atraso" && !overdue) return false;
      if (statusFilter !== "all" && statusFilter !== "atraso" && o.status !== statusFilter) return false;
      return true;
    });
  }, [baseFiltered, statusFilter, today, clockMinute]);

  const kpis = useMemo(() => {
    const overdue = baseFiltered.filter(o => maintenanceIsOverdue(o)).length;
    return {
      abertas: baseFiltered.filter(o => o.status === "Aberta").length,
      execucao: baseFiltered.filter(o => o.status === "Em execução").length,
      concluidas: baseFiltered.filter(o => o.status === "Concluída").length,
      total: baseFiltered.length,
      atrasadas: overdue,
    };
  }, [baseFiltered, today, clockMinute]);

  const toggleStatus = (s: typeof statusFilter) => {
    setStatusFilter(prev => prev === s ? "all" : s);
    if (s === "Concluída") setHideFinalized(false);
  };

  const siteName = (id: string | null) => sites.items.find(s => s.id === id)?.name || "—";
  const siteOf = (id: string | null) => sites.items.find(s => s.id === id);

  const filteredKanban = useMemo(() =>
    filtered.filter(o => !(hideFinalized && statusFilter !== "Concluída" && o.status === "Concluída")),
  [filtered, hideFinalized, statusFilter]);

  // The intake column remains visible; planned work is grouped by day of this week.
  const kanbanColumns = useMemo(() => {
    if (!isAdmin) return STATUS_KANBAN_COLUMNS.map(c => ({ id: c.id, label: c.label, color: c.color }));
    const labels = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
    const cols: { id: string; label: string; color?: string }[] = [{ id: PENDING_COL, label: "ENTRADA / DISTRIBUIÇÃO" }];
    week.slice(0, 5).forEach((date, index) => cols.push({ id: date, label: `${labels[index]} · ${date.slice(8)}/${date.slice(5, 7)}` }));
    cols.push({ id: "__weekend__", label: `Final de semana · ${week[5].slice(8)}/${week[6].slice(8)}` });
    if (!hideFinalized) cols.push({ id: FINALIZED_COL, label: "FINALIZADAS", color: "bg-emerald-600" });
    return cols;
  }, [isAdmin, hideFinalized, week]);

  const itemsByCol = useMemo(() => {
    const map: Record<string, MaintenanceOrder[]> = {};
    kanbanColumns.forEach(c => { map[c.id] = []; });
    filteredKanban.forEach(o => {
      if (!isAdmin) { (map[o.status] ||= []).push(o); return; }
      if (o.status === "Concluída") { map[FINALIZED_COL]?.push(o); return; }
      if (o.scheduled_date && week.includes(o.scheduled_date)) {
        const col = o.scheduled_date === week[5] || o.scheduled_date === week[6] ? "__weekend__" : o.scheduled_date;
        map[col]?.push(o);
      } else map[PENDING_COL]?.push(o);
    });
    // Sort each column by kanban_position (nulls last), then newest first
    Object.keys(map).forEach(k => {
      map[k].sort((a, b) => {
        const pa = a.kanban_position ?? Number.MAX_SAFE_INTEGER;
        const pb = b.kanban_position ?? Number.MAX_SAFE_INTEGER;
        if (pa !== pb) return pa - pb;
        return (b.created_at || "").localeCompare(a.created_at || "");
      });
    });
    return map;
  }, [filteredKanban, kanbanColumns, isAdmin, week]);

  const handleKanbanReorder = async (colId: string, orderedIds: string[]) => {
    if (!isAdmin) return;
    await Promise.all(orderedIds.map((id, idx) => orders.update(id, { kanban_position: idx })));
  };

  const handleStatusChange = (om: MaintenanceOrder, newStatus: string) => {
    if (newStatus === om.status) return;
    if (newStatus === TERMINAL) { setClosing(om); return; }
    orders.update(om.id, { status: newStatus, finished_at: null });
  };

  const handleKanbanMove = (om: MaintenanceOrder, _from: string, to: string) => {
    if (!isAdmin) return handleStatusChange(om, to);
    if (to === FINALIZED_COL) { setClosing(om); return; }
    if (to === PENDING_COL) { orders.update(om.id, { scheduled_date: null }); return; }
    if (to === "__weekend__") { orders.update(om.id, { scheduled_date: week[5] }); return; }
    if (week.includes(to)) orders.update(om.id, { scheduled_date: to });
  };

  const renderKanbanHeader = (col: { id: string; label: string; color?: string }, count: number) => {
    if (!isAdmin) {
      return (
        <div className={`${col.color || "bg-primary"} text-white rounded-t-lg px-3 py-2 flex items-center justify-between`}>
          <span className="text-xs font-semibold truncate">{col.label}</span>
          <span className="text-xs font-bold bg-white/20 rounded-full px-2 py-0.5">{count}</span>
        </div>
      );
    }
    if (col.id === PENDING_COL) {
      return (
        <div className="bg-white border rounded-t-lg px-3 py-2.5 flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-wide text-muted-foreground">ENTRADA / DISTRIBUIÇÃO</span>
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
    return (
      <div className="bg-card border rounded-t-lg px-3 py-3 flex items-center justify-between gap-2">
        <span className="font-semibold text-xs">{col.label}</span>
        <span className="text-xs font-bold bg-muted rounded-full px-2 py-0.5">{count}</span>
      </div>
    );
  };

  const confirmClosure = async (payload: { closure_summary: string; closed_at: string; photos?: File[] }) => {
    if (!closing) return;
    if (!payload.photos?.length || !payload.closed_at) throw new Error("Foto, data e hora são obrigatórias");
    for (const f of payload.photos) if (!(await orders.uploadPhoto(closing.id, f, "depois"))) throw new Error("Falha ao enviar foto de finalização");
    if (!(await orders.update(closing.id, {
      status: TERMINAL,
      closure_summary: payload.closure_summary,
      finished_at: payload.closed_at,
      closed_by: user?.id || null,
    }))) throw new Error("Não foi possível concluir a OM");
    setClosing(null);
  };

  const renderCard = (om: MaintenanceOrder) => {
    const overdue = maintenanceIsOverdue(om);
    const site = siteOf(om.site_id);
    const tech = mechanics.items.find(m => m.id === om.assigned_technician_id);
    const tone = TECH_TONES[Math.max(0, mechanics.items.filter(m => m.is_active !== false).findIndex(m => m.id === tech?.id)) % TECH_TONES.length];
    return (
      <div onClick={() => { setEditing(om); setOmOpen(true); }}>
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <span className="font-mono text-[10px] px-1.5 py-0.5 bg-muted rounded">#{om.om_number}</span>
          {tech && <Badge variant="outline" className={cn("text-[10px]", tone)}>{tech.name}</Badge>}
        </div>

        {om.scheduled_date && !week.includes(om.scheduled_date) && <span className="block text-xs text-muted-foreground mb-1">Programada: {om.scheduled_date.split("-").reverse().join("/")}</span>}
        {maintenanceDueAt(om) && om.status !== "Concluída" && <span className="block text-xs text-muted-foreground">Prazo: {formatMaintenanceDue(maintenanceDueAt(om))}</span>}
        <div className="font-semibold text-sm line-clamp-2">{om.title}</div>
        <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-x-2">
          <span><Building2 className="h-3 w-3 inline mr-0.5" />{siteName(om.site_id)}</span>
          {om.deadline && <span className={cn(overdue && "text-rose-600 font-medium")}>📅 {om.deadline}</span>}
        </div>
        {readMaterials(om.materials).length > 0 && <p className="text-[11px] text-muted-foreground mt-2"><Package className="h-3 w-3 inline mr-1" />{readMaterials(om.materials).map(m => `${m.name} (${m.quantity})`).join(", ")}</p>}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1 flex-wrap">
            <Badge variant="secondary" className="text-[10px]">{om.category}</Badge>
            {om.awaiting_material && <Badge className="maintenance-material-tag text-[10px]"><Package className="h-3 w-3 mr-1" />Aguardando compra</Badge>}
          </div>

          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setPhotoOmId(om.id); }} title="Fotos">
              <ImageIcon className="h-4 w-4" />
            </Button>
            <OpQuickActions phone={site?.phone} address={site?.address} size="icon" />
            {isAdmin && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); if (confirm(`Excluir OM #${om.om_number}?`)) orders.remove(om.id); }} title="Excluir">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const techCardClass = (om: MaintenanceOrder) => {
    const tech = mechanics.items.find(m => m.id === om.assigned_technician_id);
    const idx = mechanics.items.filter(m => m.is_active !== false).findIndex(m => m.id === tech?.id);
    if (idx >= 0) return `maintenance-tech-card-${TECH_TONES[idx % TECH_TONES.length].slice(-1)}`;
    return om.awaiting_material ? "maintenance-material-card" : "";
  };

  // Non-admins get their own mobile-first screens (after all hooks to preserve hook order)
  if (!maintProfile.loading && isTecnico) return <Navigate to="/op/manutencao/minhas" replace />;
  if (!maintProfile.loading && isSolicitante) return <Navigate to="/op/manutencao/solicitar" replace />;

  return (
    <div>
      <ManutencaoNav onReport={isAdmin ? exportReport : undefined} />
    <div className="space-y-6 p-6">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Wrench className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Manutenção Predial</h1>
            <p className="text-sm text-muted-foreground">Ordens e sedes de manutenção</p>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Tabs value={view} onValueChange={(v) => setView(v as any)}>
            <TabsList>
              <TabsTrigger value="kanban"><LayoutGrid className="h-4 w-4 mr-1" />Kanban</TabsTrigger>
              <TabsTrigger value="lista"><List className="h-4 w-4 mr-1" />Lista</TabsTrigger>
            </TabsList>
          </Tabs>
          {view === "kanban" && (
            <Button size="sm" variant="outline" onClick={() => setHideFinalized(v => !v)}>
              {hideFinalized ? <><EyeOff className="h-3 w-3 mr-1" />Ocultos</> : <><Eye className="h-3 w-3 mr-1" />Todos</>}
            </Button>
          )}
          {!isTecnico && (
            <Button onClick={() => { setEditing(null); setOmOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> {isSolicitante ? "Nova solicitação" : "Nova OM"}
            </Button>
          )}
        </div>
      </div>

      {maintProfile.scoped && (isTecnico || isSolicitante) && (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Você está visualizando como <strong className="text-foreground">{isTecnico ? `técnico (${maintProfile.mechanicName})` : `solicitante (${maintProfile.requesterName})`}</strong>.
          {isTecnico ? " Apenas OMs atribuídas a você aparecem." : " Apenas suas solicitações aparecem."}
        </div>
      )}

        {/* ORDENS */}
        {tab === "ordens" && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {MAINT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              {!isTecnico && (
                <Select value={techFilter} onValueChange={setTechFilter}>
                  <SelectTrigger className="w-56 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os técnicos</SelectItem>
                    <SelectItem value="none">Sem técnico</SelectItem>
                    {[...mechanics.items].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")).map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <Select value={activeSite} onValueChange={setActiveSite}>
                <SelectTrigger className="w-56 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as sedes ({orders.items.filter(o => inDateRange(o.opened_at, dateFrom, dateTo)).length})</SelectItem>
                  {sites.items.filter(s => s.is_active).map(s => {
                    const c = orders.items.filter(o => o.site_id === s.id && inDateRange(o.opened_at, dateFrom, dateTo)).length;
                    return <SelectItem key={s.id} value={s.id}>{s.name} ({c})</SelectItem>;
                  })}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap items-center gap-2 ml-auto">
                {view === "kanban" && (
                  <div className="flex items-center gap-1 rounded-md border px-1 h-9">
                    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Semana anterior" onClick={() => setWeekOffset(v => v - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-sm font-medium whitespace-nowrap px-1">{week[0].split("-").reverse().join("/")} – {week[6].split("-").reverse().join("/")}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Próxima semana" onClick={() => setWeekOffset(v => v + 1)}><ChevronRight className="h-4 w-4" /></Button>
                    {weekOffset !== 0 && <Button size="sm" variant="ghost" className="h-7" onClick={() => setWeekOffset(0)}>Hoje</Button>}
                  </div>
                )}
                {view === "lista" && <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} showLabels={false} />}
              </div>
            </div>
          </div>

          {orders.loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : view === "kanban" ? (
            <OpKanbanBoard<MaintenanceOrder>
              columns={kanbanColumns}
              itemsByColumn={itemsByCol}
              renderCard={renderCard}
              renderHeader={renderKanbanHeader}
              resolveItem={(id) => filtered.find(x => x.id === id)}
              isAllowed={() => true}
              onMove={handleKanbanMove}
              onReorder={isAdmin ? handleKanbanReorder : undefined}
              cardClassName={techCardClass}
              emptyText="Sem ordens"
            />
          ) : (
            <div className="space-y-2">
              {filtered.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">Nenhuma ordem para os filtros atuais.</div>
              )}
              {filtered.map(om => {
                const overdue = maintenanceIsOverdue(om);
                const site = siteOf(om.site_id);
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
                          {om.awaiting_material && <Badge className="maintenance-material-tag">Aguardando compra</Badge>}
                          {om.assigned_technician_id && <Badge variant="outline" className={TECH_TONES[Math.max(0, mechanics.items.findIndex(m => m.id === om.assigned_technician_id)) % TECH_TONES.length]}>{mechanics.items.find(m => m.id === om.assigned_technician_id)?.name}</Badge>}
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
                      <div className="flex gap-1 items-center">
                        <OpQuickActions phone={site?.phone} address={site?.address} />
                        <Select value={om.status} onValueChange={v => handleStatusChange(om, v)}>
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
          )}
        </div>
        )}

        {/* SEDES */}
        {tab === "sedes" && (
        <div className="space-y-3">
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
        </div>
        )}


      <OmModal
        open={omOpen}
        onOpenChange={setOmOpen}
        editing={editing}
        sites={sites.items}
        mechanics={mechanics.items}
        requesters={requesters.items}
        mode={isSolicitante ? "solicitante" : isTecnico ? "tecnico" : "admin"}
        forcedRequesterId={isSolicitante ? maintProfile.requesterId : undefined}
         onSave={async (input, photos) => {
           if (editing) { if (!(await orders.update(editing.id, input))) return; }
           else {
             const created = await orders.add(input);
             if (!created) return;
             for (const photo of photos) if (!(await orders.uploadPhoto(created.id, photo, "antes"))) { toast.error("OM criada, mas a foto não foi enviada"); return; }
           }
           setOmOpen(false);
        }}
      />


      <SiteModal open={siteOpen} onOpenChange={setSiteOpen} editing={editingSite} onSave={async (input) => {
        if (editingSite) await sites.update(editingSite.id, input);
        else await sites.add(input);
        setSiteOpen(false);
      }} />

      <PhotosModal open={!!photoOmId} onClose={() => setPhotoOmId(null)} omId={photoOmId} hook={orders} />

      <OpClosureDialog
        open={!!closing}
        onOpenChange={(o) => !o && setClosing(null)}
        title="Concluir ordem de manutenção"
        allowPhotos
         requirePhotos
         requireTime
        onConfirm={confirmClosure}
      />
    </div>
    </div>
  );
}

function KpiCard({ label, value, color, icon, active, onClick }: { label: string; value: number; color?: string; icon?: React.ReactNode; active?: boolean; onClick?: () => void }) {
  const Cmp: any = onClick ? "button" : "div";
  return (
    <Cmp
      onClick={onClick}
      className={cn(
        "border rounded-lg p-4 bg-card text-left transition w-full",
        onClick && "hover:border-primary/60 hover:shadow-sm cursor-pointer",
        active && "border-primary ring-2 ring-primary/30 bg-primary/5"
      )}
    >
      <div className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</div>
      <div className={cn("text-2xl font-bold mt-1", color)}>{value}</div>
    </Cmp>
  );
}

function OmModal({ open, onOpenChange, editing, sites, mechanics, requesters, mode, forcedRequesterId, onSave }: {
  open: boolean; onOpenChange: (b: boolean) => void; editing: MaintenanceOrder | null; sites: Site[];
  mechanics: MaintTechnician[]; requesters: DeliveryRequester[];
  mode: "admin" | "tecnico" | "solicitante";
  forcedRequesterId?: string;
   onSave: (input: Partial<MaintenanceOrder>, photos: File[]) => Promise<void>;
}) {
  const { profile } = useAuth();
  const { data: sectors = [] } = useSectors(profile?.organization_id || null);
  const [form, setForm] = useState<Partial<MaintenanceOrder>>({});
  const [section, setSection] = useState<"dados" | "materiais">("dados");
   const [openingPhotos, setOpeningPhotos] = useState<File[]>([]);
   const [photoJustification, setPhotoJustification] = useState("");
  useEffect(() => {
    if (open) {
      const base: Partial<MaintenanceOrder> = editing
        ? { ...editing }
        : { category: "Outros", priority: "Média", status: "Aberta", opened_at: todayISO() };
      if (mode === "solicitante" && !editing && forcedRequesterId) {
        base.requester_id = forcedRequesterId;
      }
      setForm(base);
      setSection("dados");
       setOpeningPhotos([]);
       setPhotoJustification(editing?.photo_justification || "");
    }
  }, [open, editing, mode, forcedRequesterId]);

  const readOnly = mode === "tecnico";
  const solicitanteView = mode === "solicitante";
  const title = editing
    ? `${solicitanteView ? "Solicitação" : "OM"} #${editing.om_number}`
    : solicitanteView ? "Nova solicitação de manutenção" : "Nova OM";

  const openedDisplay = editing?.created_at
    ? new Date(editing.created_at).toLocaleString("pt-BR")
    : (form.opened_at || "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <Tabs value={section} onValueChange={v => setSection(v as "dados" | "materiais")}>
          <TabsList><TabsTrigger value="dados">Dados da OM</TabsTrigger><TabsTrigger value="materiais">Materiais {readMaterials(form.materials).length ? `(${readMaterials(form.materials).length})` : ""}</TabsTrigger></TabsList>
        </Tabs>
        {section === "materiais" ? <div className="space-y-4">
          <MaintenanceMaterials items={readMaterials(form.materials)} onChange={materials => setForm({ ...form, materials })} readOnly={solicitanteView} />
          {!solicitanteView && <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!form.awaiting_material} onCheckedChange={checked => setForm({ ...form, awaiting_material: checked === true })} /> Aguardando compra de material</label>}
          {!solicitanteView && editing && (form.material_received_at
            ? <p className="text-sm text-muted-foreground">Peças recebidas em {new Date(form.material_received_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} — prazo de 24h em andamento.</p>
            : <Button type="button" variant="outline" onClick={() => { setForm({ ...form, material_received_at: new Date().toISOString(), awaiting_material: false, materials: readMaterials(form.materials).map(m => ({ ...m, purchased: true })) }); toast.success("Recebimento marcado. Clique em Salvar para iniciar o prazo de 24h."); }}>Peças recebidas · iniciar prazo de 24h</Button>)}
        </div> : <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Título *</Label>
            <Input disabled={readOnly} value={form.title || ""} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Sede</Label>
            <Select disabled={readOnly} value={form.site_id || ""} onValueChange={v => setForm({ ...form, site_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select disabled={readOnly} value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MAINT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Prioridade</Label>
            <Select disabled={readOnly || solicitanteView} value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MAINT_PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {!solicitanteView && (
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MAINT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          {mode === "admin" && (
            <>
              <div>
                <Label>Mecânico responsável</Label>
                <Select value={form.assigned_technician_id || "none"} onValueChange={v => setForm({ ...form, assigned_technician_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {mechanics.filter(m => m.is_active !== false).map(m => <SelectItem key={m.id} value={m.id}>{m.name}{m.user_id ? "" : " (sem usuário)"}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Solicitante</Label>
                <Select value={form.requester_id || "none"} onValueChange={v => setForm({ ...form, requester_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {requesters.filter(r => r.is_active !== false).map(r => <SelectItem key={r.id} value={r.id}>{r.name}{r.user_id ? "" : " (sem usuário)"}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div>
            <Label>Setor solicitante *</Label>
            <Select disabled={readOnly} value={form.sector || ""} onValueChange={v => setForm({ ...form, sector: v })}>
              <SelectTrigger><SelectValue placeholder="Escolha o setor" /></SelectTrigger>
              <SelectContent>
                {sectors.map((s) => (
                  <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!solicitanteView && editing && (
            <div>
              <Label>Aberta em</Label>
              <Input disabled value={openedDisplay} readOnly />
            </div>
          )}
          {!solicitanteView && editing && (
            <div>
              <Label>Prazo</Label>
              <Input disabled={readOnly} type="date" value={form.deadline || ""} onChange={e => setForm({ ...form, deadline: e.target.value })} />
            </div>
          )}
          {mode === "admin" && editing && <div><Label>Dia programado</Label><Input type="date" value={form.scheduled_date || ""} onChange={e => setForm({ ...form, scheduled_date: e.target.value || null })} /></div>}
          <div className="col-span-2">
            <Label>Descrição</Label>
            <Textarea disabled={readOnly} rows={3} value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
           {!editing && <div className="col-span-2"><MaintenanceOpeningEvidence photos={openingPhotos} onPhotosChange={setOpeningPhotos} justification={photoJustification} onJustificationChange={setPhotoJustification} /></div>}
           {editing?.photo_justification && <div className="col-span-2 text-sm text-muted-foreground">Sem foto na abertura: {editing.photo_justification}</div>}
           {editing?.postponement_reason && <div className="col-span-2 text-sm text-muted-foreground">Adiamento: {editing.postponement_reason}</div>}
          <div className="col-span-2">
            <Label>Observações</Label>
            <Textarea rows={2} value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          {editing && (
            <div className="col-span-2 border-t pt-3">
              <OpMoveLogPanel module="maintenance" cardId={editing.id} />
            </div>
          )}
        </div>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
           <Button onClick={() => {
             if (!editing && !openingPhotos.length && photoJustification.trim().length < 10) { toast.error("Adicione uma foto ou justifique sua ausência (mínimo 10 caracteres)"); return; }
             if (form.status === "Concluída" && editing?.status !== "Concluída") { toast.error("Use Concluir OM para informar foto, data e hora"); return; }
             onSave({ ...form, photo_justification: editing ? form.photo_justification : openingPhotos.length ? null : photoJustification.trim() }, openingPhotos);
           }} disabled={!form.title || !form.sector}>Salvar</Button>
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
