import { useEffect, useMemo, useState } from "react";
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
  SCHEDULE_PERIODS, BOOKING_PERIODS, takenPeriods, periodInfo, BOOKING_STATUS_INFO, todayISO, shiftDay,
  formatDateBRShort, weekdayLabel, SERVICE_TYPES, type BookingStatus,
} from "@/lib/oficinaAgenda";
import { toast } from "sonner";
import "./cearagps.css";

const isActive = (o: ServiceOrder) => o.stage !== STAGE_ENTREGUE && !o.finished_at && o.status !== "Finalizada";

export default function OpOficinaAgenda() {
  const { profile } = useOficinaProfile();
  const readOnly = profile?.type === "mecanico";
  const { items: orders, update, add: addOrder } = useServiceOrders();
  const { items: mechanics } = useMechanics();
  const { items: bookings, update: updateBooking, add: addBooking } = useWorkshopBookings();

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

  const today = todayISO();
  // Serviço não finalizado no dia agendado rola automaticamente para o dia seguinte,
  // até a finalização: a data efetiva é sempre >= hoje.
  const effectiveDate = (d?: string | null) => (!d ? null : d < today ? today : d);
  const isRolled = (d?: string | null) => !!d && d < today;
  // OS sem data mas com mecânico atribuído entra automaticamente na execução do dia atual
  const effectiveOrderDate = (o: ServiceOrder) => {
    const d = (o as any).scheduled_date as string | null | undefined;
    if (d) return effectiveDate(d);
    return o.mechanic_id ? today : null;
  };

  const actives = useMemo(() => orders.filter(isActive), [orders]);
  const ofDay = useMemo(
    () => actives.filter((o) => effectiveOrderDate(o) === day)
      .filter((o) => (readOnly && profile?.id ? o.mechanic_id === profile.id : true))
      .filter(matches),
    [actives, day, today, readOnly, profile?.id, q],
  );
  const unscheduled = useMemo(
    () => actives.filter((o) => !(o as any).scheduled_date && !o.mechanic_id).filter(matches),
    [actives, q],
  );
  const pending = useMemo(() => bookings.filter((b) => b.status === "pendente"), [bookings]);
  const awaiting = useMemo(
    () => bookings.filter((b) => b.status === "agendado" && !b.service_order_id && effectiveDate(b.scheduled_date) === day),
    [bookings, day, today],
  );

  const columns = useMemo(() => {
    const cols = (readOnly && profile?.id ? mecs.filter((m) => m.id === profile.id) : mecs)
      .map((m) => ({ id: m.id as string | null, name: m.name, list: ofDay.filter((o) => o.mechanic_id === m.id) }));
    if (!readOnly) cols.push({ id: null, name: "A definir", list: ofDay.filter((o) => !o.mechanic_id || !mecs.some((m) => m.id === o.mechanic_id)) });
    return cols;
  }, [mecs, ofDay, readOnly, profile?.id]);


  // Calendário mensal: contagem de serviços + agendamentos aguardando chegada por dia
  const [monthCursor, setMonthCursor] = useState(() => day.slice(0, 7));

  const monthDays = useMemo(() => {
    const [y, m] = monthCursor.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const last = new Date(y, m, 0);
    const cells: (string | null)[] = Array.from({ length: first.getDay() }, () => null);
    for (let i = 1; i <= last.getDate(); i++) {
      cells.push(`${monthCursor}-${String(i).padStart(2, "0")}`);
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [monthCursor]);

  const dayCounts = useMemo(() => {
    const map = new Map<string, { services: number; bookings: number; free: number }>();
    const bump = (d: string | null, key: "services" | "bookings") => {
      if (!d) return;
      const cur = map.get(d) || { services: 0, bookings: 0, free: BOOKING_PERIODS.length };
      cur[key] += 1;
      map.set(d, cur);
    };
    actives.forEach((o) => bump(effectiveOrderDate(o), "services"));
    bookings
      .filter((b) => b.status === "agendado" && !b.service_order_id)
      .forEach((b) => bump(effectiveDate(b.scheduled_date), "bookings"));
    // vagas livres: 1 manhã + 1 tarde por dia, descontando períodos já ocupados
    map.forEach((cur, d) => {
      const taken = takenPeriods(bookings as any[], d);
      cur.free = BOOKING_PERIODS.filter((p) => !taken.has(p.id)).length;
    });
    return map;
  }, [actives, bookings, today]);

  useEffect(() => { setMonthCursor(day.slice(0, 7)); }, [day]);

  const shiftMonth = (delta: number) => {
    const [y, m] = monthCursor.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonthCursor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const monthLabel = useMemo(() => {
    const [y, m] = monthCursor.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }, [monthCursor]);

  const rolledCount = ofDay.filter((o) => isRolled((o as any).scheduled_date)).length;


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
              {rolledCount > 0 && <span className="text-rose-600 normal-case"> · {rolledCount} adiado(s) de dias anteriores</span>}
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

        <Card className="p-3">
          <div className="flex items-center justify-between mb-2">
            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => shiftMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold capitalize text-slate-800">{monthLabel}</span>
            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => shiftMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-400 mb-1">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((d, i) => {
              if (!d) return <div key={`e${i}`} />;
              const c = dayCounts.get(d);
              const selected = d === day;
              const isToday = d === today;
              return (
                <button
                  key={d}
                  onClick={() => setDay(d)}
                  className={`rounded-lg border px-1 py-1.5 min-h-[52px] text-left transition ${
                    selected ? "bg-slate-800 text-white border-slate-800" : isToday ? "bg-white border-slate-800 hover:bg-slate-100" : "bg-white hover:bg-slate-100"
                  }`}
                >
                  <div className="text-xs font-semibold">{Number(d.slice(8))}</div>
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {!!c?.services && (
                      <span className={`text-[9px] px-1 rounded ${selected ? "bg-white/20" : "bg-teal-500/15 text-teal-700"}`}>{c.services} serv.</span>
                    )}
                    {!!c?.bookings && (
                      <span className={`text-[9px] px-1 rounded ${selected ? "bg-white/20" : "bg-amber-500/15 text-amber-700"}`}>{c.bookings} ag.</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>


        {!readOnly && pending.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-amber-600" />
              <h2 className="font-semibold text-slate-800">Solicitações do Agendar ({pending.length})</h2>
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
                          {isRolled((o as any).scheduled_date) && (
                            <div className="text-[10px] text-rose-600 mt-1">
                              Adiado de {formatDateBRShort((o as any).scheduled_date)}
                            </div>
                          )}
                          {!(o as any).scheduled_date && (
                            <div className="text-[10px] text-teal-700 mt-1">Sem data · em execução hoje</div>
                          )}
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

          <div className="space-y-4">
            <Card className="p-3 h-fit">
              <h2 className="font-semibold text-sm text-slate-800 mb-2">Aguardando chegada ({awaiting.length})</h2>
              <p className="text-[11px] text-slate-500 mb-2">Motos agendadas para este dia que ainda não estão na oficina. A OS é aberta no Kanban ao clicar em "Moto chegou · abrir OS".</p>
              <div className="space-y-2 max-h-[260px] overflow-y-auto">
                {awaiting.length === 0 && <p className="text-xs text-slate-400">Nenhuma moto aguardando chegada.</p>}
                {awaiting.map((b) => (
                  <div key={b.id} className="rounded-lg border p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-slate-800">{b.vehicle_plate}</span>
                      <Badge className={periodInfo(b.scheduled_period).chip + " border-0 text-[10px]"}>
                        {periodInfo(b.scheduled_period).label}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-500">{b.vehicle_model || "—"} · {mecName(b.mechanic_id)}</div>
                    {b.service_type && <div className="text-[11px] text-slate-400 mt-1">{b.service_type}</div>}
                    {isRolled(b.scheduled_date) && (
                      <div className="text-[10px] text-rose-600 mt-1">Adiado de {formatDateBRShort(b.scheduled_date)}</div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

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
          allBookings={bookings}
          defaultDate={day}
          mechanics={mecs}
          onClose={() => setBooking(null)}
          onConfirm={async ({ date, period, mechanic_id, notes }) => {
            await updateBooking(booking.id, {
              status: "agendado", scheduled_date: date, scheduled_period: period,
              mechanic_id: mechanic_id || null, admin_notes: notes || null,
            });
            setDay(date);
            toast.success("Agendamento confirmado. A OS será aberta quando a moto chegar.");
            setBooking(null);
          }}
        />
      )}

      {creating && (
        <NewBookingDialog
          allBookings={bookings}
          defaultDate={day}
          mechanics={mecs}
          onClose={() => setCreating(false)}
          onConfirm={async (v) => {
            const b = await addBooking({
              vehicle_plate: v.plate,
              vehicle_model: v.model || null,
              service_type: v.serviceType || null,
              description: v.notes || null,
              preferred_date: v.date,
              preferred_period: v.period,
            });
            if (b) {
              await updateBooking((b as any).id, {
                status: "agendado", scheduled_date: v.date, scheduled_period: v.period,
                mechanic_id: v.mechanic_id === "none" ? null : v.mechanic_id, admin_notes: v.notes || null,
              });
              setDay(v.date);
              toast.success("Agendamento criado. A OS será aberta quando a moto chegar.");
            }
            setCreating(false);
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

function BookingDialog({ booking, allBookings, defaultDate, mechanics, onClose, onConfirm }: {
  booking: any; allBookings: any[]; defaultDate: string;
  mechanics: { id: string; name: string }[];
  onClose: () => void;
  onConfirm: (v: { date: string; period: string; mechanic_id: string | null; notes: string }) => void;
}) {
  const [date, setDate] = useState(booking.preferred_date || defaultDate);
  const [period, setPeriod] = useState(booking.preferred_period === "tarde" ? "tarde" : "manha");
  const taken = useMemo(() => takenPeriods(allBookings, date, booking.id), [allBookings, date, booking.id]);
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
                <SelectContent>
                  {BOOKING_PERIODS.map((p) => (
                    <SelectItem key={p.id} value={p.id} disabled={taken.has(p.id)}>
                      {p.label}{taken.has(p.id) ? " — ocupado" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
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
          <Button className="cgps-btn-primary" disabled={saving || !date || taken.has(period)} onClick={() => {
            setSaving(true);
            onConfirm({ date, period, mechanic_id: mechanicId === "none" ? null : mechanicId, notes });
          }}>Confirmar agendamento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewBookingDialog({ allBookings, defaultDate, mechanics, onClose, onConfirm }: {
  allBookings: any[]; defaultDate: string;
  mechanics: { id: string; name: string }[];
  onClose: () => void;
  onConfirm: (v: { plate: string; model: string; serviceType: string; date: string; period: string; mechanic_id: string | null; notes: string }) => void;
}) {
  const [plate, setPlate] = useState("");
  const [model, setModel] = useState("");
  const [serviceType, setServiceType] = useState(SERVICE_TYPES[0]);
  const [date, setDate] = useState(defaultDate);
  const [period, setPeriod] = useState("manha");
  const taken = useMemo(() => takenPeriods(allBookings, date), [allBookings, date]);
  const [mechanicId, setMechanicId] = useState("none");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo agendamento</DialogTitle></DialogHeader>
        <p className="text-xs text-slate-500 -mt-2">Reserva a data na oficina. A OS só é aberta quando a moto chegar.</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Placa *</Label>
              <Input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="ABC1D23" />
            </div>
            <div>
              <Label>Modelo</Label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="CG 160 Titan" />
            </div>
          </div>
          <div>
            <Label>Tipo de serviço</Label>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SERVICE_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data de execução</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Período</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BOOKING_PERIODS.map((p) => (
                    <SelectItem key={p.id} value={p.id} disabled={taken.has(p.id)}>
                      {p.label}{taken.has(p.id) ? " — ocupado" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
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
          <Button className="cgps-btn-primary" disabled={saving || !plate.trim() || !date || taken.has(period)} onClick={() => {
            setSaving(true);
            onConfirm({ plate: plate.trim(), model, serviceType, date, period, mechanic_id: mechanicId === "none" ? null : mechanicId, notes });
          }}>Criar agendamento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
