import { useMemo, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, CalendarPlus, Check, X, Clock, Bike, User, Trash2, Search, Plus } from "lucide-react";

import OficinaNav from "./OficinaNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useMechanics, useServiceOrders, type ServiceOrder } from "@/hooks/useOficina";
import { useWorkshopBookings } from "@/hooks/useWorkshopBookings";
import { useOficinaProfile } from "@/contexts/OficinaProfileContext";
import { stageInfo, STAGE_ENTREGUE } from "@/lib/oficinaStages";
import {
  SCHEDULE_PERIODS, periodInfo, BOOKING_STATUS_INFO, todayISO, shiftDay,
  formatDateBRShort, weekdayLabel, type BookingStatus,
} from "@/lib/oficinaAgenda";
import { toast } from "sonner";
import "./cearagps.css";

const isActive = (o: ServiceOrder) => o.stage !== STAGE_ENTREGUE && !o.finished_at && o.status !== "Finalizada";

export default function OpOficinaAgenda() {
  const { profile } = useOficinaProfile();
  const readOnly = profile?.type === "mecanico";
  const { items: orders, update, add: addOrder } = useServiceOrders();
  const { items: mechanics } = useMechanics();
  const { items: bookings, update: updateBooking } = useWorkshopBookings();

  const [day, setDay] = useState(todayISO());
  const [scheduling, setScheduling] = useState<ServiceOrder | null>(null);
  const [booking, setBooking] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const matches = (o: ServiceOrder) =>
    !q ||
    (o.vehicle_plate || "").toLowerCase().includes(q) ||
    (o.vehicle_model || "").toLowerCase().includes(q) ||
    String(o.os_number || "").includes(q);

  const mecs = useMemo(
    () => mechanics.filter((m) => m.is_active !== false && (m.role || "mecanico") === "mecanico"),
    [mechanics],
  );
  const mecName = (id?: string | null) => mecs.find((m) => m.id === id)?.name || "A definir";

  const actives = useMemo(() => orders.filter(isActive), [orders]);
  const ofDay = useMemo(
    () => actives.filter((o) => (o as any).scheduled_date === day)
      .filter((o) => (readOnly && profile?.id ? o.mechanic_id === profile.id : true))
      .filter(matches),
    [actives, day, readOnly, profile?.id, q],
  );
  const unscheduled = useMemo(() => actives.filter((o) => !(o as any).scheduled_date).filter(matches), [actives, q]);
  const pending = useMemo(() => bookings.filter((b) => b.status === "pendente"), [bookings]);

  const columns = useMemo(() => {
    const cols = (readOnly && profile?.id ? mecs.filter((m) => m.id === profile.id) : mecs)
      .map((m) => ({ id: m.id as string | null, name: m.name, list: ofDay.filter((o) => o.mechanic_id === m.id) }));
    if (!readOnly) cols.push({ id: null, name: "A definir", list: ofDay.filter((o) => !o.mechanic_id || !mecs.some((m) => m.id === o.mechanic_id)) });
    return cols;
  }, [mecs, ofDay, readOnly, profile?.id]);


  const weekCounts = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = shiftDay(day, i - 3);
      return { d, count: actives.filter((o) => (o as any).scheduled_date === d).length };
    });
  }, [actives, day]);

  const unschedule = async (o: ServiceOrder) => {
    await update(o.id, { scheduled_date: null, scheduled_period: null } as any);
    toast.success("Agendamento removido");
  };

  return (
    <div className="cgps-scope min-h-screen bg-slate-50">
      <OficinaNav />
      <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <Calendar className="h-5 w-5" /> Agenda da Oficina
            </h1>
            <p className="text-sm text-slate-500 capitalize">
              {weekdayLabel(day)} · {formatDateBRShort(day)} · {ofDay.length} serviço(s) programado(s)
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar placa, modelo ou OS"
                className="pl-8 w-[230px] bg-white"
              />
            </div>
            <Button size="icon" variant="outline" onClick={() => setDay(shiftDay(day, -1))}><ChevronLeft className="h-4 w-4" /></Button>
            <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="w-[160px] bg-white" />
            <Button size="icon" variant="outline" onClick={() => setDay(shiftDay(day, 1))}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="secondary" onClick={() => setDay(todayISO())}>Hoje</Button>
            {!readOnly && (
              <Button className="cgps-btn-primary" onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4 mr-1" /> Novo agendamento
              </Button>
            )}
          </div>

        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {weekCounts.map((w) => (
            <button
              key={w.d}
              onClick={() => setDay(w.d)}
              className={`min-w-[92px] rounded-lg border px-3 py-2 text-left transition ${w.d === day ? "bg-slate-800 text-white border-slate-800" : "bg-white hover:bg-slate-100"}`}
            >
              <div className="text-[11px] capitalize opacity-80">{weekdayLabel(w.d).slice(0, 3)}</div>
              <div className="text-sm font-semibold">{formatDateBRShort(w.d).slice(0, 5)}</div>
              <div className="text-[11px] opacity-80">{w.count} serviço(s)</div>
            </button>
          ))}
        </div>

        {!readOnly && pending.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-amber-600" />
              <h2 className="font-semibold text-slate-800">Solicitações da Motoloc ({pending.length})</h2>
            </div>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {pending.map((b) => (
                <div key={b.id} className="rounded-lg border p-3 bg-white">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-800">{b.vehicle_plate}</span>
                    <Badge className={BOOKING_STATUS_INFO[(b.status as BookingStatus)]?.chip + " border-0"}>
                      {BOOKING_STATUS_INFO[(b.status as BookingStatus)]?.label}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{b.vehicle_model || "—"} · {b.service_type || "Serviço"}</div>
                  {b.description && <p className="text-xs text-slate-600 mt-2 line-clamp-3">{b.description}</p>}
                  <div className="text-xs text-slate-500 mt-2">
                    Preferência: <strong>{formatDateBRShort(b.preferred_date)}</strong> · {periodInfo(b.preferred_period).label}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Solicitante: {b.requester_name || "—"}</div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="flex-1 cgps-btn-primary" onClick={() => setBooking(b)}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Agendar
                    </Button>
                    <Button size="sm" variant="outline" onClick={async () => {
                      await updateBooking(b.id, { status: "recusado" });
                      toast.success("Solicitação recusada");
                    }}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="grid lg:grid-cols-[1fr_320px] gap-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {columns.map((c) => (
              <div key={c.id || "none"} className="rounded-xl border bg-white overflow-hidden">
                <div className="px-3 py-2 border-b bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="h-4 w-4 text-slate-500 shrink-0" />
                    <span className="font-semibold text-sm text-slate-800 truncate">{c.name}</span>
                  </div>
                  <Badge variant="secondary">{c.list.length}</Badge>
                </div>
                <div className="p-2 space-y-2 min-h-[80px]">
                  {c.list.length === 0 && <p className="text-xs text-slate-400 p-2">Sem serviços neste dia.</p>}
                  {c.list
                    .sort((a, b) => (a.schedule_order ?? 0) - (b.schedule_order ?? 0) || a.os_number - b.os_number)
                    .map((o) => {
                      const st = stageInfo(o.stage);
                      return (
                        <div key={o.id} className="rounded-lg border p-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-mono text-slate-500">OS #{o.os_number}</span>
                            <Badge className={periodInfo((o as any).scheduled_period).chip + " border-0 text-[10px]"}>
                              {periodInfo((o as any).scheduled_period).label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Bike className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-bold text-slate-800 text-sm">{o.vehicle_plate || "—"}</span>
                            <span className="text-xs text-slate-500 truncate">{o.vehicle_model}</span>
                          </div>
                          <Badge variant="secondary" className={st.chip + " mt-2 text-[10px]"}>{st.label}</Badge>
                          {(o as any).schedule_notes && (
                            <p className="text-[11px] text-slate-500 mt-2">{(o as any).schedule_notes}</p>
                          )}
                          {!readOnly && (
                            <div className="flex gap-1 mt-2">
                              <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => setScheduling(o)}>Editar</Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-rose-600" onClick={() => unschedule(o)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>

          {!readOnly && (
            <Card className="p-3 h-fit">
              <h2 className="font-semibold text-sm text-slate-800 mb-2">Sem data de execução ({unscheduled.length})</h2>
              <div className="space-y-2 max-h-[560px] overflow-y-auto">
                {unscheduled.length === 0 && <p className="text-xs text-slate-400">Todas as motos ativas estão agendadas.</p>}
                {unscheduled.map((o) => (
                  <div key={o.id} className="rounded-lg border p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-500">OS #{o.os_number}</span>
                      <Badge variant="secondary" className={stageInfo(o.stage).chip + " text-[10px]"}>{stageInfo(o.stage).label}</Badge>
                    </div>
                    <div className="font-bold text-sm text-slate-800">{o.vehicle_plate || "—"}</div>
                    <div className="text-xs text-slate-500">{o.vehicle_model || "—"} · {mecName(o.mechanic_id)}</div>
                    <Button size="sm" className="w-full mt-2 h-7 text-xs cgps-btn-primary" onClick={() => setScheduling(o)}>
                      <CalendarPlus className="h-3.5 w-3.5 mr-1" /> Agendar
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {scheduling && (
        <ScheduleDialog
          order={scheduling}
          defaultDate={day}
          mechanics={mecs}
          onClose={() => setScheduling(null)}
          onSave={async (patch) => { await update(scheduling.id, patch as any); setScheduling(null); toast.success("Agendamento salvo"); }}
        />
      )}

      {booking && (
        <BookingDialog
          booking={booking}
          defaultDate={day}
          mechanics={mecs}
          onClose={() => setBooking(null)}
          onConfirm={async ({ date, period, mechanic_id, notes }) => {
            const created = await addOrder({
              company_id: booking.company_id,
              vehicle_plate: booking.vehicle_plate,
              vehicle_model: booking.vehicle_model,
              description: booking.description || booking.service_type,
              mechanic_id: mechanic_id || null,
              stage: "analise",
            });
            if (created) {
              await update((created as any).id, { scheduled_date: date, scheduled_period: period, schedule_notes: notes || null } as any);
              await updateBooking(booking.id, {
                status: "agendado", scheduled_date: date, scheduled_period: period,
                mechanic_id: mechanic_id || null, service_order_id: (created as any).id, admin_notes: notes || null,
              });
              setDay(date);
            }
            setBooking(null);
          }}
        />
      )}
    </div>
  );
}

function ScheduleDialog({ order, defaultDate, mechanics, onClose, onSave }: {
  order: ServiceOrder; defaultDate: string;
  mechanics: { id: string; name: string }[];
  onClose: () => void;
  onSave: (patch: Record<string, unknown>) => void;
}) {
  const [date, setDate] = useState((order as any).scheduled_date || defaultDate);
  const [period, setPeriod] = useState((order as any).scheduled_period || "dia");
  const [mechanicId, setMechanicId] = useState(order.mechanic_id || "none");
  const [notes, setNotes] = useState((order as any).schedule_notes || "");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Agendar OS #{order.os_number} · {order.vehicle_plate}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data de execução</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Período</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SCHEDULE_PERIODS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Mecânico responsável</Label>
            <Select value={mechanicId} onValueChange={setMechanicId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">A definir</SelectItem>
                {mechanics.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Direcionamento / observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Ex.: iniciar pela troca do garfo, cliente busca às 17h..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="cgps-btn-primary" onClick={() => onSave({
            scheduled_date: date || null,
            scheduled_period: period,
            schedule_notes: notes || null,
            mechanic_id: mechanicId === "none" ? null : mechanicId,
          })}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BookingDialog({ booking, defaultDate, mechanics, onClose, onConfirm }: {
  booking: any; defaultDate: string;
  mechanics: { id: string; name: string }[];
  onClose: () => void;
  onConfirm: (v: { date: string; period: string; mechanic_id: string | null; notes: string }) => void;
}) {
  const [date, setDate] = useState(booking.preferred_date || defaultDate);
  const [period, setPeriod] = useState(booking.preferred_period || "dia");
  const [mechanicId, setMechanicId] = useState("none");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Agendar {booking.vehicle_plate}</DialogTitle></DialogHeader>
        <p className="text-xs text-slate-500 -mt-2">Ao confirmar, uma OS é criada em Análise / Triagem já com data de execução.</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data de execução</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Período</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SCHEDULE_PERIODS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Mecânico responsável</Label>
            <Select value={mechanicId} onValueChange={setMechanicId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">A definir</SelectItem>
                {mechanics.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="cgps-btn-primary" disabled={saving || !date} onClick={() => {
            setSaving(true);
            onConfirm({ date, period, mechanic_id: mechanicId === "none" ? null : mechanicId, notes });
          }}>Confirmar agendamento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
