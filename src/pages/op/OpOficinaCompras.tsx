import { useMemo, useState } from "react";
import { Package, Truck, Check, Search, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useServiceOrders, useMechanics, type ServiceOrder, type ServiceOrderPart } from "@/hooks/useOficina";
import { useCompanies } from "@/hooks/useOperacional";
import OficinaNav from "./OficinaNav";
import { PART_STATUS_FLOW, PART_STATUS_INFO, stageInfo } from "@/lib/oficinaStages";
import { cn } from "@/lib/utils";

function todayISO() { return new Date().toISOString().slice(0, 10); }

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const osTotal = (list: ServiceOrderPart[]) =>
  list.reduce((s, p) => s + Number(p.quantity || 0) * Number(p.unit_price || 0), 0);

/** Etapas (colunas) exibidas no painel de compras. */
const COMPRAS_STAGES = ["orcamento", "aguardando_peca"] as const;

export default function OpOficinaCompras() {
  const { items, partsByOs, update, setPartStatus, setPartPrice } = useServiceOrders();
  const { items: mechanics } = useMechanics();
  const { items: companies } = useCompanies();
  const [search, setSearch] = useState("");
  const [openOsId, setOpenOsId] = useState<string | null>(null);
  const [hiddenStages, setHiddenStages] = useState<string[]>([]);

  const mechName = (id: string | null) => mechanics.find(m => m.id === id)?.name || "A definir";
  const companyName = (id: string | null) => companies.find(c => c.id === id)?.name || "—";

  const toggleStage = (id: string) =>
    setHiddenStages(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  /** Somente peças ainda não recebidas. */
  const pendingByOs = useMemo(() => {
    const map: Record<string, ServiceOrderPart[]> = {};
    Object.entries(partsByOs).forEach(([osId, list]) => {
      const pending = list.filter(p => p.part_status !== "recebida");
      if (pending.length) map[osId] = pending;
    });
    return map;
  }, [partsByOs]);

  const columns = useMemo(() => {
    const s = search.trim().toLowerCase();
    return COMPRAS_STAGES.map(stage => {
      const info = stageInfo(stage);
      const orders = items.filter(o => {
        if (o.stage !== stage) return false;
        if (o.status === "Finalizado") return false;
        const pending = pendingByOs[o.id];
        if (!pending?.length) return false; // todas as peças recebidas -> some da área
        if (!s) return true;
        return `${o.os_number}`.includes(s) ||
          (o.vehicle_plate || "").toLowerCase().includes(s) ||
          (o.vehicle_model || "").toLowerCase().includes(s) ||
          pending.some(p => p.part_name.toLowerCase().includes(s));
      });
      return { stage, label: info.label, chip: info.chip, dot: info.dot, orders };
    });
  }, [items, pendingByOs, search]);

  const registerArrival = (o: ServiceOrder) => {
    (partsByOs[o.id] || []).forEach(p => { if (p.part_status !== "recebida") setPartStatus(p.id, "recebida"); });
    update(o.id, { parts_arrived_at: todayISO(), stage: o.stage === "aguardando_peca" ? "execucao" : o.stage });
  };

  const totalOrders = columns.reduce((acc, c) => acc + c.orders.length, 0);

  return (
    <div className="min-h-screen bg-muted/30">
      <OficinaNav />
      <div className="max-w-5xl mx-auto p-4 space-y-4">
        <div className="bg-card border rounded-lg p-4">
          <h1 className="font-bold text-lg">Painel de Suprimentos &amp; Peças</h1>
          <p className="text-sm text-muted-foreground">
            Motos ativas em Orçamento / Compras e Aguardando Peça. Peças recebidas saem automaticamente da lista.
          </p>
        </div>

        <div className="relative">
          <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar OS, placa, modelo ou peça" className="pl-8 bg-card" />
        </div>

        {totalOrders === 0 && (
          <div className="bg-card border rounded-lg p-12 text-center text-muted-foreground">
            Nenhuma peça pendente de compra ou recebimento.
          </div>
        )}

        {columns.map(col => {
          const hidden = hiddenStages.includes(col.stage);
          if (!col.orders.length) return null;
          return (
            <div key={col.stage} className="space-y-3">
              <div className="flex items-center gap-2 border-b pb-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", col.dot)} />
                <h2 className="text-sm font-bold uppercase tracking-wide">{col.label}</h2>
                <Badge variant="secondary" className={cn(col.chip)}>{col.orders.length} moto(s)</Badge>
                <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs" onClick={() => toggleStage(col.stage)}>
                  {hidden ? <><Eye className="h-3.5 w-3.5 mr-1" />Mostrar</> : <><EyeOff className="h-3.5 w-3.5 mr-1" />Ocultar</>}
                </Button>
              </div>

              {!hidden && (
                <div className="grid gap-3">
                  {col.orders.map(o => {
                    const pending = pendingByOs[o.id] || [];
                    const allParts = partsByOs[o.id] || [];
                    const received = allParts.length - pending.length;
                    const expanded = openOsId === o.id;
                    return (
                      <div key={o.id} className="bg-card border rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOpenOsId(expanded ? null : o.id)}
                          className="w-full text-left p-4 hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex-1 min-w-[220px]">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold tracking-wide">{o.vehicle_plate || `OS #${o.os_number}`}</span>
                                <span className="text-sm text-muted-foreground">({o.vehicle_model || "—"})</span>
                                <Badge variant="secondary">Mecânico: {mechName(o.mechanic_id)}</Badge>
                                <Badge variant="outline">{companyName(o.company_id)}</Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                OS #{o.os_number} · {pending.length} peça(s) pendente(s)
                                {received > 0 && ` · ${received} recebida(s)`}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className={cn(col.chip)}>{pending.length}</Badge>
                              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </div>
                          </div>
                        </button>

                        {expanded && (
                          <div className="border-t p-4 space-y-3 bg-muted/20">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="text-sm">
                                <span className="text-muted-foreground">Valor total da OS: </span>
                                <span className="font-bold">{brl(osTotal(allParts))}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  (pendentes: {brl(osTotal(pending))})
                                </span>
                              </div>
                              <Button size="sm" onClick={() => registerArrival(o)}>
                                <Truck className="h-4 w-4 mr-1" /> Chegada total da OS
                              </Button>
                            </div>
                            {pending.map(p => (
                              <div key={p.id} className="bg-card border rounded-md p-3 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm">{p.part_name}</span>
                                  <span className="text-xs text-muted-foreground">x{p.quantity}</span>
                                  <Badge variant="secondary" className={cn("ml-auto", PART_STATUS_INFO[p.part_status]?.chip)}>
                                    {PART_STATUS_INFO[p.part_status]?.label || p.part_status}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <label className="text-xs text-muted-foreground">Valor unit. (R$)</label>
                                  <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    defaultValue={Number(p.unit_price) || 0}
                                    onBlur={e => {
                                      const v = Number(e.target.value) || 0;
                                      if (v !== Number(p.unit_price)) setPartPrice(p.id, v);
                                    }}
                                    className="h-7 w-28 text-xs"
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    Subtotal: <span className="font-medium text-foreground">{brl(Number(p.quantity) * Number(p.unit_price || 0))}</span>
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {PART_STATUS_FLOW.map(st => (
                                    <Button
                                      key={st}
                                      size="sm"
                                      variant={p.part_status === st ? "default" : "outline"}
                                      className="h-7 text-xs"
                                      onClick={() => setPartStatus(p.id, st)}
                                    >
                                      {st === "recebida" && <Check className="h-3 w-3 mr-1" />}
                                      {PART_STATUS_INFO[st].label}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            ))}

                            {pending.length === 0 && (
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Package className="h-4 w-4" /> Todas as peças recebidas.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
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
}
