import { useMemo, useState } from "react";
import { Package, Truck, Check, Search, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useServiceOrders, useMechanics, type ServiceOrder, type ServiceOrderPart } from "@/hooks/useOficina";
import { useCompanies } from "@/hooks/useOperacional";
import OficinaNav from "./OficinaNav";
import { PART_STATUS_FLOW, PART_STATUS_INFO, STAGE_ENTREGUE } from "@/lib/oficinaStages";
import { cn } from "@/lib/utils";

function todayISO() { return new Date().toISOString().slice(0, 10); }

export default function OpOficinaCompras() {
  const { items, partsByOs, update, setPartStatus } = useServiceOrders();
  const { items: mechanics } = useMechanics();
  const { items: companies } = useCompanies();
  const [search, setSearch] = useState("");
  const [openPartId, setOpenPartId] = useState<string | null>(null);

  const mechName = (id: string | null) => mechanics.find(m => m.id === id)?.name || "A definir";
  const companyName = (id: string | null) => companies.find(c => c.id === id)?.name || "—";

  const osById = useMemo(() => {
    const map: Record<string, ServiceOrder> = {};
    items.forEach(o => { map[o.id] = o; });
    return map;
  }, [items]);

  const parts = useMemo(() => {
    const all: (ServiceOrderPart & { os: ServiceOrder })[] = [];
    Object.entries(partsByOs).forEach(([osId, list]) => {
      const os = osById[osId];
      if (!os) return;
      // Apenas motos ativas nas etapas de compra/orçamento ou aguardando peças
      const isPartsStage = os.stage === "orcamento" || os.stage === "aguardando_peca";
      if (!isPartsStage || os.stage === STAGE_ENTREGUE || os.status === "Finalizado") return;
      list.forEach(p => {
        all.push({ ...p, os });
      });
    });

    if (!search.trim()) return all;
    const s = search.toLowerCase();
    return all.filter(p => {
      const o = p.os;
      return `${o.os_number}`.includes(s) ||
        (o.vehicle_plate || "").toLowerCase().includes(s) ||
        (o.vehicle_model || "").toLowerCase().includes(s) ||
        p.part_name.toLowerCase().includes(s);
    });
  }, [items, partsByOs, osById, search]);

  const groups = useMemo(() => {
    return PART_STATUS_FLOW.map(status => ({
      status,
      label: PART_STATUS_INFO[status].label,
      chip: PART_STATUS_INFO[status].chip,
      parts: parts.filter(p => p.part_status === status),
    })).filter(g => g.parts.length > 0);
  }, [parts]);

  const registerArrival = (o: ServiceOrder) => {
    (partsByOs[o.id] || []).forEach(p => { if (p.part_status !== "recebida") setPartStatus(p.id, "recebida"); });
    update(o.id, { parts_arrived_at: todayISO(), stage: o.stage === "aguardando_peca" ? "execucao" : o.stage });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <OficinaNav />
      <div className="max-w-5xl mx-auto p-4 space-y-4">
        <div className="bg-card border rounded-lg p-4">
          <h1 className="font-bold text-lg">Painel de Suprimentos &amp; Peças</h1>
          <p className="text-sm text-muted-foreground">Acompanhe requisições de peças agrupadas por status de compra.</p>
        </div>

        <div className="relative">
          <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar OS, placa, modelo ou peça" className="pl-8 bg-card" />
        </div>

        {groups.length === 0 && (
          <div className="bg-card border rounded-lg p-12 text-center text-muted-foreground">
            Nenhuma peça na fila de compras.
          </div>
        )}

        {groups.map(g => {
          const allReceived = g.status === "recebida";
          return (
            <div key={g.status} className="space-y-3">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-bold uppercase tracking-wide">{g.label}</h2>
                <Badge variant="secondary" className={cn(g.chip)}>{g.parts.length}</Badge>
              </div>
              <div className="grid gap-3">
                {g.parts.map(p => {
                  const o = p.os;
                  const expanded = openPartId === p.id;
                  const allParts = partsByOs[o.id] || [];
                  const allOsReceived = allParts.every(x => x.part_status === "recebida");
                  return (
                    <div key={p.id} className="bg-card border rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex-1 min-w-[220px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold tracking-wide">{o.vehicle_plate || `OS #${o.os_number}`}</span>
                            <span className="text-sm text-muted-foreground">({o.vehicle_model || "—"})</span>
                            <Badge variant="secondary">Mecânico: {mechName(o.mechanic_id)}</Badge>
                            <Badge variant="outline">{companyName(o.company_id)}</Badge>
                          </div>
                          <div className="text-sm mt-1">
                            <span className="font-medium">{p.part_name}</span>
                            <span className="text-muted-foreground"> (x{p.quantity})</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            OS #{o.os_number}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {!allOsReceived && (
                            <Button size="sm" onClick={() => registerArrival(o)}>
                              <Truck className="h-4 w-4 mr-1" /> Chegada total da OS
                            </Button>
                          )}
                          {allOsReceived && (
                            <Badge className="bg-emerald-600 text-white border-0"><Check className="h-3 w-3 mr-1" />Peças recebidas</Badge>
                          )}
                          <Button size="sm" variant="secondary" onClick={() => setOpenPartId(expanded ? null : p.id)}>
                            <Package className="h-4 w-4 mr-1" />
                            {expanded ? "Fechar" : "Gerenciar"}
                            {expanded ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                          </Button>
                        </div>
                      </div>

                      {expanded && (
                        <div className="border rounded-md p-3 flex items-center gap-2 flex-wrap bg-muted/30">
                          <span className="text-sm font-medium">Mudar status:</span>
                          {PART_STATUS_FLOW.map(st => {
                            const info = PART_STATUS_INFO[st];
                            const active = p.part_status === st;
                            return (
                              <Button
                                key={st}
                                size="sm"
                                variant={active ? "default" : "outline"}
                                className="h-7 text-xs"
                                onClick={() => setPartStatus(p.id, st)}
                              >
                                {info.label}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
