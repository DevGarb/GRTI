import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Bike, Search, Wrench, Camera, ListChecks, MessageSquare, ShieldAlert } from "lucide-react";
import OficinaNav from "./OficinaNav";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useServiceOrders, useServiceOrderDetails, useServiceChecklists, type ServiceOrder } from "@/hooks/useOficina";
import { useCompanies } from "@/hooks/useOperacional";
import { filterOficinaCompanies } from "@/lib/oficinaCompanies";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCardNotes } from "@/hooks/useCardNotes";
import { isDoneStage, osSlaInfo, checklistProgress } from "@/lib/oficinaStages";
import { formatDateBRShort } from "@/lib/oficinaAgenda";
import { Fancybox } from "@fancyapps/ui/dist/fancybox/fancybox.js";
import "@fancyapps/ui/dist/fancybox/fancybox.css";
import "./cearagps.css";

const TERMINAL = "Finalizado";
const isDelivered = (o: ServiceOrder) => isDoneStage(o.stage) || o.status === TERMINAL;

const dateTimeBR = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

function OsDetailsDialog({ order, onClose }: { order: ServiceOrder | null; onClose: () => void }) {
  const { parts, photos } = useServiceOrderDetails(order?.id || null);
  const { byOs } = useServiceChecklists();
  const { notes } = useCardNotes("service_order", order?.id || null);
  const check = checklistProgress(byOs[order?.id || ""] || []);

  useEffect(() => {
    Fancybox.bind("[data-fancybox='os-fotos']", {});
    return () => Fancybox.destroy();
  }, [order?.id, photos.length]);

  const before = photos.filter((p) => p.photo_type === "antes");
  const after = photos.filter((p) => p.photo_type !== "antes");

  const obs: { label: string; body: string; meta?: string }[] = [];
  if ((order as any)?.finish_km)
    obs.push({ label: "KM na finalização", body: `${Number((order as any).finish_km).toLocaleString("pt-BR")} km` });
  if (order?.diagnosis) obs.push({ label: "Diagnóstico", body: order.diagnosis });
  if (order?.notes) obs.push({ label: "Observações da OS", body: order.notes });
  if (order?.schedule_notes) obs.push({ label: "Observações do agendamento", body: order.schedule_notes });
  if (order?.closure_summary) obs.push({ label: "Resumo de encerramento", body: order.closure_summary });
  if (order?.supervisor_alert_reason || order?.supervisor_alert_note)
    obs.push({
      label: "Acionamento do supervisor",
      body: [order?.supervisor_alert_reason, order?.supervisor_alert_note].filter(Boolean).join(" — "),
      meta: dateTimeBR(order?.supervisor_alert_at),
    });
  if (order?.supervisor_action_plan)
    obs.push({ label: "Plano de ação do supervisor", body: order.supervisor_action_plan, meta: dateTimeBR(order?.supervisor_action_at) });

  const PhotoGrid = ({ list, title }: { list: typeof photos; title: string }) => (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{title} ({list.length})</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {list.map((ph) => (
          <a key={ph.id} href={ph.photo_url} data-fancybox="os-fotos" data-caption={`${title} · ${dateTimeBR(ph.created_at)}`}>
            <img src={ph.photo_url} alt={`Foto ${ph.photo_type} da OS ${order?.os_number}`} className="rounded-md object-cover w-full h-24" loading="lazy" />
          </a>
        ))}
      </div>
    </div>
  );

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

            <div>
              <p className="font-semibold mb-1 flex items-center gap-1"><MessageSquare className="h-4 w-4" /> Observações</p>
              <div className="space-y-2">
                {obs.map((o, i) => (
                  <div key={i} className="rounded-md border border-border p-2">
                    <div className="flex items-center gap-2">
                      {o.label.includes("supervisor") ? <ShieldAlert className="h-3.5 w-3.5 text-amber-600" /> : null}
                      <span className="text-xs font-semibold">{o.label}</span>
                      {o.meta && o.meta !== "—" && <span className="text-[10px] text-muted-foreground">{o.meta}</span>}
                    </div>
                    <p className="text-muted-foreground whitespace-pre-wrap mt-1">{o.body}</p>
                  </div>
                ))}
                {notes.map((n) => (
                  <div key={n.id} className="rounded-md border border-border p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{n.author_name || "Usuário"}</span>
                      <span className="text-[10px] text-muted-foreground">{dateTimeBR(n.created_at)}</span>
                    </div>
                    <p className="text-muted-foreground whitespace-pre-wrap mt-1">{n.body}</p>
                  </div>
                ))}
                {obs.length === 0 && notes.length === 0 && <p className="text-muted-foreground">Nenhuma observação registrada.</p>}
              </div>
            </div>

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
            <div>
              <p className="font-semibold mb-1 flex items-center gap-1"><Camera className="h-4 w-4" /> Fotos ({photos.length})</p>
              {photos.length === 0 && <p className="text-muted-foreground">Nenhuma foto registrada.</p>}
              <div className="space-y-3">
                {before.length > 0 && <PhotoGrid list={before} title="Antes" />}
                {after.length > 0 && <PhotoGrid list={after} title="Depois" />}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


export default function OpOficinaFinalizadas() {
  const { items } = useServiceOrders();
  const { items: allCompanies } = useCompanies();
  const companies = useMemo(() => filterOficinaCompanies(allCompanies), [allCompanies]);
  const companyName = useMemo(() => Object.fromEntries(companies.map((c) => [c.id, c.name])), [companies]);
  const [company, setCompany] = useState("all");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sel, setSel] = useState<ServiceOrder | null>(null);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items
      .filter(isDelivered)
      .filter((o) => {
        if (!o.finished_at) return false;
        if (company !== "all" && o.company_id !== company) return false;
        if (term && !`${o.os_number} ${o.vehicle_plate || ""} ${o.vehicle_model || ""}`.toLowerCase().includes(term)) return false;
        const d = o.finished_at.slice(0, 10);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      })
      .sort((a, b) => (b.finished_at || "").localeCompare(a.finished_at || ""));
  }, [items, q, from, to, company]);

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

        <Card className="p-4 grid md:grid-cols-4 gap-3">
          <div>
            <Label>Buscar</Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Placa, modelo ou nº da OS" />
            </div>
          </div>
          <div>
            <Label>Empresa</Label>
            <Select value={company} onValueChange={setCompany}>
              <SelectTrigger><SelectValue placeholder="Todas as empresas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  {o.company_id && companyName[o.company_id] && <span className="truncate">· {companyName[o.company_id]}</span>}
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
