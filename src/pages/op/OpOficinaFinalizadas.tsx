import { useMemo, useState } from "react";
import { CheckCircle2, Bike, Search, Wrench, Camera, ListChecks } from "lucide-react";
import OficinaNav from "./OficinaNav";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useServiceOrders, useServiceOrderDetails, useServiceChecklists, type ServiceOrder } from "@/hooks/useOficina";
import { STAGE_ENTREGUE, osSlaInfo, checklistProgress } from "@/lib/oficinaStages";
import { formatDateBRShort } from "@/lib/oficinaAgenda";
import "./cearagps.css";

const TERMINAL = "Finalizado";
const isDelivered = (o: ServiceOrder) => o.stage === STAGE_ENTREGUE || o.status === TERMINAL;

function OsDetailsDialog({ order, onClose }: { order: ServiceOrder | null; onClose: () => void }) {
  const { parts, photos } = useServiceOrderDetails(order?.id || null);
  const { byOs } = useServiceChecklists();
  const check = checklistProgress(byOs[order?.id || ""] || []);

  return (
    <Dialog open={!!order} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>OS #{order?.os_number} · {order?.vehicle_plate}</DialogTitle>
        </DialogHeader>
        {order && (
          <div className="space-y-4 text-sm">
            <div className="grid sm:grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">Modelo:</span> <strong>{order.vehicle_model || "—"}</strong></div>
              <div><span className="text-muted-foreground">Abertura:</span> <strong>{formatDateBRShort(order.opened_at)}</strong></div>
              <div><span className="text-muted-foreground">Finalização:</span> <strong>{order.finished_at ? formatDateBRShort(order.finished_at) : "—"}</strong></div>
              <div><span className="text-muted-foreground">Prazo:</span> <strong>{order.deadline ? formatDateBRShort(order.deadline) : "—"}</strong></div>
            </div>
            {order.description && (
              <div>
                <p className="font-semibold mb-1">Serviço solicitado</p>
                <p className="text-muted-foreground whitespace-pre-wrap">{order.description}</p>
              </div>
            )}
            {order.closure_summary && (
              <div>
                <p className="font-semibold mb-1">Resumo de encerramento</p>
                <p className="text-muted-foreground whitespace-pre-wrap">{order.closure_summary}</p>
              </div>
            )}
            <div>
              <p className="font-semibold mb-1 flex items-center gap-1"><ListChecks className="h-4 w-4" /> Checklist ({check.done}/{check.total})</p>
              <div className="space-y-1">
                {(byOs[order.id] || []).map((i) => (
                  <div key={i.id} className="flex items-center gap-2">
                    <CheckCircle2 className={`h-3.5 w-3.5 ${i.done ? "text-emerald-600" : "text-muted-foreground/40"}`} />
                    <span className={i.done ? "" : "text-muted-foreground"}>{i.label}</span>
                  </div>
                ))}
                {(byOs[order.id] || []).length === 0 && <p className="text-muted-foreground">Sem checklist.</p>}
              </div>
            </div>
            <div>
              <p className="font-semibold mb-1 flex items-center gap-1"><Wrench className="h-4 w-4" /> Peças</p>
              {parts.length === 0 && <p className="text-muted-foreground">Nenhuma peça registrada.</p>}
              {parts.map((p) => (
                <div key={p.id} className="flex items-center justify-between border-b border-border py-1">
                  <span>{p.quantity}x {p.part_name}</span>
                  <span className="text-muted-foreground text-xs">{p.part_status}</span>
                </div>
              ))}
            </div>
            {photos.length > 0 && (
              <div>
                <p className="font-semibold mb-1 flex items-center gap-1"><Camera className="h-4 w-4" /> Fotos</p>
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((ph) => (
                    <a key={ph.id} href={ph.photo_url} target="_blank" rel="noreferrer">
                      <img src={ph.photo_url} alt={`Foto ${ph.photo_type} da OS ${order.os_number}`} className="rounded-md object-cover w-full h-24" loading="lazy" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function OpOficinaFinalizadas() {
  const { items } = useServiceOrders();
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sel, setSel] = useState<ServiceOrder | null>(null);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items
      .filter(isDelivered)
      .filter((o) => {
        if (term && !`${o.os_number} ${o.vehicle_plate || ""} ${o.vehicle_model || ""}`.toLowerCase().includes(term)) return false;
        const d = (o.finished_at || o.opened_at || "").slice(0, 10);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      })
      .sort((a, b) => (b.finished_at || b.opened_at).localeCompare(a.finished_at || a.opened_at));
  }, [items, q, from, to]);

  return (
    <div className="cgps-scope min-h-screen bg-slate-50">
      <OficinaNav />
      <div className="max-w-[1100px] mx-auto p-4 md:p-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <CheckCircle2 className="h-5 w-5" /> Serviços finalizados
          </h1>
          <p className="text-sm text-slate-500">Consulte as OS já entregues pela oficina e veja o detalhamento de cada serviço.</p>
        </div>

        <Card className="p-4 grid md:grid-cols-3 gap-3">
          <div>
            <Label>Buscar</Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Placa, modelo ou nº da OS" />
            </div>
          </div>
          <div>
            <Label>De</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label>Até</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-3">
          {list.length === 0 && <p className="text-sm text-slate-400">Nenhuma OS finalizada no período.</p>}
          {list.map((o) => {
            const sla = osSlaInfo(o);
            return (
              <Card key={o.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSel(o)}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Bike className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="font-bold text-slate-800">{o.vehicle_plate || "—"}</span>
                    <span className="text-xs text-slate-500 truncate">{o.vehicle_model}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">OS #{o.os_number}</Badge>
                </div>
                <div className="text-xs text-slate-500 mt-2 flex items-center gap-2 flex-wrap">
                  <span>Finalizada: <strong>{o.finished_at ? formatDateBRShort(o.finished_at) : "—"}</strong></span>
                  <Badge className={sla.chip + " border-0 text-[10px]"}>{sla.label}</Badge>
                </div>
                {o.description && <p className="text-xs text-slate-600 mt-2 line-clamp-2">{o.description}</p>}
              </Card>
            );
          })}
        </div>
      </div>
      <OsDetailsDialog order={sel} onClose={() => setSel(null)} />
    </div>
  );
}
