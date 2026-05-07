import { useMemo, useState } from "react";
import { Truck, Plus, Pencil, Trash2, Clock, MapPin, ClipboardList, CheckCircle2, Calendar as CalIcon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useDeliveries, type Delivery } from "@/hooks/useDeliveries";
import { useDrivers, useCompanies, useVehicles } from "@/hooks/useOperacional";
import { cn } from "@/lib/utils";

const TYPES = ["Entrega", "Vistoria", "Retirada", "Outro"];
const PERIODS = ["Manhã", "Tarde", "Noite"];
const STATUSES = ["Pendente", "Em rota", "Finalizado", "Cancelado"];

const STATUS_COLORS: Record<string, string> = {
  "Pendente": "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  "Em rota": "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  "Finalizado": "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  "Cancelado": "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
};

type FilterMode = "tudo" | "hoje" | "semana" | "data";

function formatDateBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function weekday(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { weekday: "long" });
}
function todayISO() { return new Date().toISOString().slice(0, 10); }

export default function OpEntregas() {
  const { items, loading, add, update, remove } = useDeliveries();
  const { items: drivers } = useDrivers();
  const { items: companies } = useCompanies();
  const { items: vehicles } = useVehicles();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Delivery | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("tudo");
  const [filterDate, setFilterDate] = useState(todayISO());
  const [activeMonth, setActiveMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [activeDriver, setActiveDriver] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Apply month + filterMode + driver + search
  const filtered = useMemo(() => {
    const today = todayISO();
    const start = new Date(); start.setDate(start.getDate() - 7);
    const startISO = start.toISOString().slice(0, 10);

    return items.filter(d => {
      if (!d.scheduled_date.startsWith(activeMonth)) return false;
      if (filterMode === "hoje" && d.scheduled_date !== today) return false;
      if (filterMode === "semana" && d.scheduled_date < startISO) return false;
      if (filterMode === "data" && d.scheduled_date !== filterDate) return false;
      if (activeDriver !== "all" && d.driver_id !== activeDriver) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (typeFilter !== "all" && d.type !== typeFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const company = companies.find(c => c.id === d.company_id)?.name?.toLowerCase() || "";
        const driver = drivers.find(dr => dr.id === d.driver_id)?.name?.toLowerCase() || "";
        const blob = `${company} ${driver} ${d.address || ""} ${d.contact_name || ""} ${d.notes || ""}`.toLowerCase();
        if (!blob.includes(s)) return false;
      }
      return true;
    });
  }, [items, activeMonth, filterMode, filterDate, activeDriver, statusFilter, typeFilter, search, companies, drivers]);

  const monthItems = useMemo(() => items.filter(d => d.scheduled_date.startsWith(activeMonth)), [items, activeMonth]);
  const kpis = useMemo(() => ({
    total: monthItems.length,
    pendentes: monthItems.filter(d => d.status === "Pendente").length,
    emRota: monthItems.filter(d => d.status === "Em rota").length,
    finalizados: monthItems.filter(d => d.status === "Finalizado").length,
  }), [monthItems]);

  const grouped = useMemo(() => {
    const map = new Map<string, Delivery[]>();
    [...filtered].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)).forEach(d => {
      const arr = map.get(d.scheduled_date) || [];
      arr.push(d);
      map.set(d.scheduled_date, arr);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const driverCounts = useMemo(() => {
    const counts: Record<string, number> = { all: monthItems.length };
    drivers.forEach(d => { counts[d.id] = monthItems.filter(x => x.driver_id === d.id).length; });
    return counts;
  }, [monthItems, drivers]);

  // Build month options (current year)
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

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Entregas</h1>
            <p className="text-sm text-muted-foreground">Controle de Entregas</p>
          </div>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nova Entrega</Button>
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
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Kpi title="Total no Mês" value={kpis.total} icon={ClipboardList} />
        <Kpi title="Pendentes" value={kpis.pendentes} icon={Clock} />
        <Kpi title="Em Rota" value={kpis.emRota} icon={MapPin} />
        <Kpi title="Finalizados" value={kpis.finalizados} icon={CheckCircle2} />
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
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            {TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Grouped list */}
      {loading ? (
        <div className="text-center text-muted-foreground py-12">Carregando...</div>
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
                    <div key={d.id} className="bg-card border rounded-lg p-4">
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
                        <div className="flex items-center gap-2">
                          <Select value={d.status} onValueChange={(v) => update(d.id, { status: v })}>
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
        onSubmit={async (payload) => {
          if (editing) await update(editing.id, payload);
          else await add(payload);
          setModalOpen(false);
        }}
      />
    </div>
  );
}

function Kpi({ title, value, icon: Icon }: { title: string; value: number; icon: any }) {
  return (
    <div className="bg-card border rounded-lg p-4 flex items-center justify-between">
      <div>
        <div className="text-xs text-muted-foreground">{title}</div>
        <div className="text-3xl font-bold mt-1">{value}</div>
      </div>
      <Icon className="h-5 w-5 text-muted-foreground" />
    </div>
  );
}

function DriverChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className={cn("text-sm px-3 py-1.5 rounded-md border", active ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted")}>
      👤 {label}
    </button>
  );
}

function DeliveryModal({ open, onOpenChange, editing, drivers, companies, vehicles, onSubmit }: {
  open: boolean; onOpenChange: (b: boolean) => void; editing: Delivery | null;
  drivers: any[]; companies: any[]; vehicles: any[];
  onSubmit: (p: Partial<Delivery>) => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<Delivery>>({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => {
    if (open) setForm(editing ? { ...editing } : {
      type: "Entrega", period: "Manhã", status: "Pendente", scheduled_date: todayISO(),
    });
  }, [open, editing]);

  const setF = (k: keyof Delivery, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{editing ? "Editar entrega" : "Nova entrega"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Empresa</Label>
            <Select value={form.company_id || ""} onValueChange={v => setF("company_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Motorista</Label>
            <Select value={form.driver_id || ""} onValueChange={v => setF("driver_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Veículo</Label>
            <Select value={form.vehicle_id || ""} onValueChange={v => setF("vehicle_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.plate} {v.model && `· ${v.model}`}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Tipo</Label>
            <Select value={form.type} onValueChange={v => setF("type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
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
          <div><Label>Associado</Label>
            <Input value={form.associated_name || ""} onChange={e => setF("associated_name", e.target.value)} />
          </div>
          <div><Label>Contato</Label>
            <Input value={form.contact_name || ""} onChange={e => setF("contact_name", e.target.value)} />
          </div>
          <div><Label>Telefone</Label>
            <Input value={form.contact_phone || ""} onChange={e => setF("contact_phone", e.target.value)} />
          </div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={v => setF("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label>Observações</Label>
            <Textarea value={form.notes || ""} onChange={e => setF("notes", e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => { if (!form.scheduled_date) return; onSubmit(form); }}>{editing ? "Salvar" : "Criar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
