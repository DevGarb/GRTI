import { useMemo, useState } from "react";
import { CalendarPlus, Bike, Send } from "lucide-react";
import OficinaNav from "./OficinaNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkshopBookings } from "@/hooks/useWorkshopBookings";
import { useCompanies } from "@/hooks/useOperacional";
import { filterOficinaCompanies } from "@/lib/oficinaCompanies";
import { useOficinaProfile } from "@/contexts/OficinaProfileContext";
import {
  SCHEDULE_PERIODS, periodInfo, BOOKING_STATUS_INFO, SERVICE_TYPES,
  todayISO, formatDateBRShort, type BookingStatus,
} from "@/lib/oficinaAgenda";
import { toast } from "sonner";
import "./cearagps.css";

export default function OpOficinaAgendar() {
  const { profile } = useOficinaProfile();
  const { items, add } = useWorkshopBookings();
  const { items: companies } = useCompanies();

  const [plate, setPlate] = useState("");
  const [model, setModel] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [serviceType, setServiceType] = useState(SERVICE_TYPES[0]);
  const [date, setDate] = useState(todayISO());
  const [period, setPeriod] = useState("dia");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const mine = useMemo(() => items.slice(0, 30), [items]);

  const submit = async () => {
    if (!plate.trim()) return toast.error("Informe a placa");
    if (!companyId) return toast.error("Selecione a empresa / cliente");
    setSaving(true);
    const ok = await add({
      vehicle_plate: plate.trim(),
      vehicle_model: model.trim() || null,
      company_id: companyId,
      service_type: serviceType,
      preferred_date: date,
      preferred_period: period,
      description: description.trim() || null,
      requester_name: profile?.name || null,
    });
    setSaving(false);
    if (ok) { setPlate(""); setModel(""); setCompanyId(""); setDescription(""); }
  };

  return (
    <div className="cgps-scope min-h-screen bg-slate-50">
      <OficinaNav />
      <div className="max-w-[1100px] mx-auto p-4 md:p-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <CalendarPlus className="h-5 w-5" /> Agendar manutenção
          </h1>
          <p className="text-sm text-slate-500">Envie a moto para a fila da oficina. O administrador confirma a data de execução.</p>
        </div>

        <Card className="p-4 space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>Placa *</Label>
              <Input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="ABC1D23" />
            </div>
            <div>
              <Label>Modelo</Label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Honda Biz 125" />
            </div>
            <div>
              <Label>Empresa / cliente</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não informar</SelectItem>
                  {filterOficinaCompanies(companies as any[]).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>Tipo de serviço</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SERVICE_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data desejada</Label>
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
            <Label>Descrição do problema</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva o que a moto apresenta..." />
          </div>
          <Button className="cgps-btn-primary" disabled={saving} onClick={submit}>
            <Send className="h-4 w-4 mr-1" /> Enviar solicitação
          </Button>
        </Card>

        <div>
          <h2 className="font-semibold text-slate-800 mb-2">Solicitações recentes</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {mine.length === 0 && <p className="text-sm text-slate-400">Nenhuma solicitação enviada ainda.</p>}
            {mine.map((b) => (
              <Card key={b.id} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Bike className="h-4 w-4 text-slate-400" />
                    <span className="font-bold text-slate-800">{b.vehicle_plate}</span>
                    <span className="text-xs text-slate-500">{b.vehicle_model}</span>
                  </div>
                  <Badge className={(BOOKING_STATUS_INFO[b.status as BookingStatus]?.chip || "") + " border-0"}>
                    {BOOKING_STATUS_INFO[b.status as BookingStatus]?.label || b.status}
                  </Badge>
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  Desejada: <strong>{formatDateBRShort(b.preferred_date)}</strong> · {periodInfo(b.preferred_period).label}
                </div>
                {b.scheduled_date && (
                  <div className="text-xs text-emerald-700 mt-1">
                    Confirmada para <strong>{formatDateBRShort(b.scheduled_date)}</strong> · {periodInfo(b.scheduled_period).label}
                  </div>
                )}
                {b.description && <p className="text-xs text-slate-600 mt-2 line-clamp-2">{b.description}</p>}
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
