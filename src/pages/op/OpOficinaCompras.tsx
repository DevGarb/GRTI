import { useMemo, useState } from "react";
import { Package, Truck, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useServiceOrders, useMechanics, type ServiceOrder } from "@/hooks/useOficina";
import { useCompanies } from "@/hooks/useOperacional";
import OficinaNav from "./OficinaNav";
import { PART_STATUS_FLOW, PART_STATUS_INFO, STAGE_ENTREGUE } from "@/lib/oficinaStages";

function todayISO() { return new Date().toISOString().slice(0, 10); }

export default function OpOficinaCompras() {
  const { items, partsByOs, update, setPartStatus } = useServiceOrders();
  const { items: mechanics } = useMechanics();
  const { items: companies } = useCompanies();
  const [search, setSearch] = useState("");
  const [openOs, setOpenOs] = useState<string | null>(null);

  const mechName = (id: string | null) => mechanics.find(m => m.id === id)?.name || "A definir";
  const companyName = (id: string | null) => companies.find(c => c.id === id)?.name || "—";

  const orders = useMemo(() => {
    return items.filter(o => {
      if (o.stage === STAGE_ENTREGUE || o.status === "Finalizado") return false;
      if ((partsByOs[o.id] || []).length === 0) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!(`${o.os_number}`.includes(s) ||
              (o.vehicle_plate || "").toLowerCase().includes(s) ||
              (o.vehicle_model || "").toLowerCase().includes(s))) return false;
      }
      return true;
    });
  }, [items, partsByOs, search]);

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
          <p className="text-sm text-muted-foreground">Acompanhe requisições de peças e prazos de chegada do fornecedor.</p>
        </div>

        <div className="relative">
          <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar OS, placa ou modelo" className="pl-8 bg-card" />
        </div>

        {orders.length === 0 && (
          <div className="bg-card border rounded-lg p-12 text-center text-muted-foreground">
            Nenhuma peça na fila de compras.
          </div>
        )}

        {orders.map(o => {
          const parts = partsByOs[o.id] || [];
          const allReceived = parts.every(p => p.part_status === "recebida");
          const expanded = openOs === o.id;
          return (
            <div key={o.id} className="bg-card border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[220px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold tracking-wide">{o.vehicle_plate || `OS #${o.os_number}`}</span>
                    <span className="text-sm text-muted-foreground">({o.vehicle_model || "—"})</span>
                    <Badge variant="secondary">Mecânico: {mechName(o.mechanic_id)}</Badge>
                    <Badge variant="outline">{companyName(o.company_id)}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {parts.length} peça(s) solicitada(s)
                    {o.parts_arrived_at && ` · chegada registrada em ${o.parts_arrived_at.split("-").reverse().join("/")}`}
                  </div>
                </div>
                {!allReceived && (
                  <Button size="sm" onClick={() => registerArrival(o)}>
                    <Truck className="h-4 w-4 mr-1" /> Registrar Chegada Total de Peças
                  </Button>
                )}
                {allReceived && (
                  <Badge className="bg-emerald-600 text-white border-0"><Check className="h-3 w-3 mr-1" />Peças recebidas</Badge>
                )}
                <Button size="sm" variant="secondary" onClick={() => setOpenOs(expanded ? null : o.id)}>
                  <Package className="h-4 w-4 mr-1" /> Gerenciar Peças
                </Button>
              </div>

              {expanded && (
                <div className="border rounded-md divide-y">
                  {parts.map(p => (
                    <div key={p.id} className="p-3 flex items-center gap-3 flex-wrap">
                      <div className="flex-1 min-w-[160px] text-sm">
                        {p.part_name} <span className="text-muted-foreground">(x{p.quantity})</span>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
