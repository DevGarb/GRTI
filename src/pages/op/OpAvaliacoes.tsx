import { useMemo, useState } from "react";
import { Star, Truck, Wrench, TrendingUp, MessageSquare, Filter } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOpRatings, type OpRating } from "@/hooks/useOpRatings";
import { useDeliveries } from "@/hooks/useDeliveries";
import { useMaintenanceOrders } from "@/hooks/useManutencao";
import { useOperators } from "@/hooks/useOperacional";
import { useMaintTechnicians } from "@/hooks/useMaintTechnicians";
import { cn } from "@/lib/utils";

function Stars({ n, size = "h-4 w-4" }: { n: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn(size, i <= n ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
      ))}
    </div>
  );
}

function KpiCard({ label, value, sub, icon }: { label: string; value: string | number; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function DistributionBar({ counts, total }: { counts: number[]; total: number }) {
  return (
    <div className="space-y-1.5">
      {[5, 4, 3, 2, 1].map((star) => {
        const c = counts[star - 1] || 0;
        const pct = total > 0 ? (c / total) * 100 : 0;
        const barColor = star >= 4 ? "bg-emerald-500" : star === 3 ? "bg-amber-500" : "bg-rose-500";
        return (
          <div key={star} className="flex items-center gap-2 text-xs">
            <span className="w-6 font-medium flex items-center gap-0.5">{star}<Star className="h-3 w-3 fill-amber-400 text-amber-400" /></span>
            <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
              <div className={cn("h-full transition-all", barColor)} style={{ width: `${pct}%` }} />
            </div>
            <span className="w-14 text-right text-muted-foreground">{c} ({pct.toFixed(0)}%)</span>
          </div>
        );
      })}
    </div>
  );
}

function Ranking({ rows }: { rows: { name: string; count: number; avg: number }[] }) {
  if (rows.length === 0) return <div className="text-sm text-muted-foreground py-4 text-center">Sem avaliações ainda.</div>;
  const sorted = [...rows].sort((a, b) => b.avg - a.avg || b.count - a.count);
  return (
    <div className="space-y-2">
      {sorted.map((r, i) => (
        <div key={r.name} className="flex items-center gap-3 p-2.5 rounded-lg border bg-card">
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold",
            i === 0 ? "bg-amber-100 text-amber-800" : i === 1 ? "bg-slate-200 text-slate-700" : i === 2 ? "bg-orange-100 text-orange-800" : "bg-muted text-muted-foreground",
          )}>{i + 1}</div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{r.name}</div>
            <div className="text-xs text-muted-foreground">{r.count} avaliaç{r.count === 1 ? "ão" : "ões"}</div>
          </div>
          <div className="flex items-center gap-2">
            <Stars n={Math.round(r.avg)} />
            <span className="font-bold text-lg tabular-nums w-10 text-right">{r.avg.toFixed(1)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

interface PanelProps {
  kind: "delivery" | "maintenance";
  targetNameMap: Map<string, string>; // targetId -> person (driver/technician) name
  labelMap: Map<string, string>; // targetId -> short label ("#OM 123", "#Entrega 45 - endereço")
}

function RatingsPanel({ kind, targetNameMap, labelMap }: PanelProps) {
  const { items, loading } = useOpRatings(kind);
  const [starFilter, setStarFilter] = useState<string>("all");
  const [personFilter, setPersonFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const persons = useMemo(() => {
    const set = new Set<string>();
    items.forEach((r) => {
      const tid = kind === "delivery" ? r.delivery_id : r.maintenance_order_id;
      const name = tid ? targetNameMap.get(tid) : undefined;
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [items, targetNameMap, kind]);

  const filtered = useMemo(() => {
    return items.filter((r) => {
      if (starFilter !== "all" && r.rating !== Number(starFilter)) return false;
      const tid = kind === "delivery" ? r.delivery_id : r.maintenance_order_id;
      const name = tid ? targetNameMap.get(tid) : undefined;
      if (personFilter !== "all" && name !== personFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!(r.comment || "").toLowerCase().includes(s) && !(r.rated_by_name || "").toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [items, starFilter, personFilter, search, targetNameMap, kind]);

  const stats = useMemo(() => {
    const total = items.length;
    const sum = items.reduce((a, r) => a + r.rating, 0);
    const avg = total > 0 ? sum / total : 0;
    const counts = [0, 0, 0, 0, 0];
    items.forEach((r) => { counts[r.rating - 1]++; });
    const withComment = items.filter((r) => (r.comment || "").trim().length > 0).length;
    const bad = items.filter((r) => r.rating <= 2).length;
    return { total, avg, counts, withComment, bad };
  }, [items]);

  const ranking = useMemo(() => {
    const map = new Map<string, { count: number; sum: number }>();
    items.forEach((r) => {
      const tid = kind === "delivery" ? r.delivery_id : r.maintenance_order_id;
      const name = tid ? targetNameMap.get(tid) : undefined;
      if (!name) return;
      const cur = map.get(name) || { count: 0, sum: 0 };
      cur.count++; cur.sum += r.rating;
      map.set(name, cur);
    });
    return Array.from(map.entries()).map(([name, v]) => ({ name, count: v.count, avg: v.sum / v.count }));
  }, [items, targetNameMap, kind]);

  if (loading) return <div className="text-center py-12 text-muted-foreground">Carregando avaliações...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Média geral" value={stats.avg.toFixed(2)} sub={`de ${stats.total} avaliações`} icon={<Star className="h-4 w-4 text-amber-500" />} />
        <KpiCard label="Total" value={stats.total} icon={<TrendingUp className="h-4 w-4" />} />
        <KpiCard label="Com observação" value={stats.withComment} icon={<MessageSquare className="h-4 w-4" />} />
        <KpiCard label="Insatisfatórias (≤2★)" value={stats.bad} sub={stats.total > 0 ? `${((stats.bad / stats.total) * 100).toFixed(0)}% do total` : undefined} icon={<Star className="h-4 w-4 text-rose-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4 bg-card">
          <h3 className="font-semibold text-sm mb-3">Distribuição das notas</h3>
          <DistributionBar counts={stats.counts} total={stats.total} />
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <h3 className="font-semibold text-sm mb-3">Ranking — {kind === "delivery" ? "Motoristas" : "Técnicos"}</h3>
          <Ranking rows={ranking} />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-1 text-sm font-semibold"><Filter className="h-4 w-4" /> Filtros:</div>
          <Select value={starFilter} onValueChange={setStarFilter}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as notas</SelectItem>
              {[5, 4, 3, 2, 1].map((n) => <SelectItem key={n} value={String(n)}>{n} estrelas</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={personFilter} onValueChange={setPersonFilter}>
            <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos {kind === "delivery" ? "os motoristas" : "os técnicos"}</SelectItem>
              {persons.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Buscar em comentários / solicitante..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs h-9" />
        </div>

        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm border rounded-lg">Nenhuma avaliação para os filtros atuais.</div>
          )}
          {filtered.map((r) => {
            const tid = kind === "delivery" ? r.delivery_id : r.maintenance_order_id;
            const person = tid ? targetNameMap.get(tid) : undefined;
            const label = tid ? labelMap.get(tid) : undefined;
            return (
              <div key={r.id} className="border rounded-lg p-3 bg-card">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Stars n={r.rating} />
                      <Badge variant="outline" className="text-[10px]">{r.rated_by_type}</Badge>
                      {label && <span className="text-xs font-mono text-muted-foreground">{label}</span>}
                    </div>
                    {r.comment && <p className="text-sm mt-2 italic">"{r.comment}"</p>}
                    <div className="text-xs text-muted-foreground mt-2">
                      {r.rated_by_name || "—"} • {new Date(r.created_at).toLocaleString("pt-BR")}
                      {person && <> • {kind === "delivery" ? "Motorista" : "Técnico"}: <strong>{person}</strong></>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function OpAvaliacoes() {
  const deliveries = useDeliveries();
  const maint = useMaintenanceOrders();
  const drivers = useOperators();
  const technicians = useMaintTechnicians();

  const deliveryNameMap = useMemo(() => {
    const m = new Map<string, string>();
    deliveries.items.forEach((d: any) => {
      const drv = drivers.items.find((x: any) => x.id === d.driver_id);
      if (drv) m.set(d.id, drv.name);
    });
    return m;
  }, [deliveries.items, drivers.items]);

  const deliveryLabelMap = useMemo(() => {
    const m = new Map<string, string>();
    deliveries.items.forEach((d: any) => {
      m.set(d.id, `#${(d.address || d.type || "entrega").slice(0, 30)}`);
    });
    return m;
  }, [deliveries.items]);

  const maintNameMap = useMemo(() => {
    const m = new Map<string, string>();
    maint.items.forEach((o) => {
      const t = technicians.items.find((x) => x.id === o.assigned_technician_id);
      if (t) m.set(o.id, t.name);
    });
    return m;
  }, [maint.items, technicians.items]);

  const maintLabelMap = useMemo(() => {
    const m = new Map<string, string>();
    maint.items.forEach((o) => m.set(o.id, `#OM ${o.om_number}`));
    return m;
  }, [maint.items]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Star className="h-7 w-7 text-amber-500" />
        <div>
          <h1 className="text-2xl font-bold">Avaliações</h1>
          <p className="text-sm text-muted-foreground">Feedback dos solicitantes sobre entregas e manutenções</p>
        </div>
      </div>

      <Tabs defaultValue="delivery">
        <TabsList>
          <TabsTrigger value="delivery"><Truck className="h-4 w-4 mr-1" /> Entregas</TabsTrigger>
          <TabsTrigger value="maintenance"><Wrench className="h-4 w-4 mr-1" /> Manutenção Predial</TabsTrigger>
        </TabsList>
        <TabsContent value="delivery" className="mt-6">
          <RatingsPanel kind="delivery" targetNameMap={deliveryNameMap} labelMap={deliveryLabelMap} />
        </TabsContent>
        <TabsContent value="maintenance" className="mt-6">
          <RatingsPanel kind="maintenance" targetNameMap={maintNameMap} labelMap={maintLabelMap} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
