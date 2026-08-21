import { filterOficinaCompanies } from "@/lib/oficinaCompanies";
import { useEffect, useMemo, useState } from "react";
import { Wrench, Package, CheckCircle2, ClipboardList, ShoppingCart, AlertTriangle, Plus, ChevronDown, ChevronUp, Camera, X, MessageSquareWarning, Eye, EyeOff, CalendarDays } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServiceOrders, useServiceChecklists, type ServiceOrder, type ServiceOrderPhoto, type ServiceOrderPart } from "@/hooks/useOficina";
import OsProgressBar from "@/components/operacional/OsProgressBar";
import OsChecklist from "@/components/operacional/OsChecklist";
import { useCompanies } from "@/hooks/useOperacional";
import { useOficinaProfile } from "@/contexts/OficinaProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OficinaNav from "./OficinaNav";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  stageInfo, PART_STATUS_INFO, daysInWorkshop, partsSlaRemaining, DIAS_ALERTA, SLA_PECAS,
} from "@/lib/oficinaStages";
import { periodInfo, todayISO, formatDateBRShort, weekdayLabel } from "@/lib/oficinaAgenda";
import { useWorkshopBookings, type WorkshopBooking } from "@/hooks/useWorkshopBookings";
import { openOsFromBooking } from "@/lib/openOsFromBooking";


const MY_STAGES = ["analise", "desempeno", "pintura", "execucao"];
const DONE_STAGES = ["pronto", "entregue"]; // "pronto" é legado
const ALERT_REASONS = [
  "Falta de peça",
  "Peça errada / avariada",
  "Aguardando autorização do cliente",
  "Serviço externo / terceirizada",
  "Intercorrência técnica",
  "Outro",
];

export default function OpOficinaMinhas() {
  const { profile } = useOficinaProfile();
  const { user } = useAuth();
  const { items, partsByOs, update, add, refetch } = useServiceOrders();
  const checklist = useServiceChecklists();
  const { items: companies } = useCompanies();
  const [tab, setTab] = useState("servicos");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [hiddenStages, setHiddenStages] = useState<string[]>([]);
  const toggleStage = (id: string) =>
    setHiddenStages(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  const [expandedPartOs, setExpandedPartOs] = useState<string | null>(null);

  const [openNew, setOpenNew] = useState(false);
  const [plate, setPlate] = useState("");
  const [model, setModel] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [customerName, setCustomerName] = useState("");

  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [newItems, setNewItems] = useState<{ name: string; qty: number }[]>([]);
  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState(1);
  const [entryFiles, setEntryFiles] = useState<File[]>([]);


  // Adicionar peça em OS existente
  const [addPartFor, setAddPartFor] = useState<string | null>(null);
  const [rowPart, setRowPart] = useState("");
  const [rowQty, setRowQty] = useState(1);

  const addPartToOs = async (osId: string) => {
    if (!rowPart.trim()) return toast.error("Informe o nome da peça");
    const { error } = await supabase.from("op_service_order_parts").insert({
      service_order_id: osId,
      part_name: rowPart.trim(),
      quantity: rowQty || 1,
      unit_price: 0,
      part_status: "solicitada",
    });
    if (error) return toast.error(error.message);
    toast.success("Peça solicitada");
    setRowPart(""); setRowQty(1); setAddPartFor(null);
    refetch();
  };


  // Finalização
  const [finishOs, setFinishOs] = useState<ServiceOrder | null>(null);
  const [summary, setSummary] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [finishKm, setFinishKm] = useState("");
  const [finishing, setFinishing] = useState(false);

  // Acionar supervisor (observação / intercorrência)
  const [alertOs, setAlertOs] = useState<ServiceOrder | null>(null);
  const [alertReason, setAlertReason] = useState(ALERT_REASONS[0]);
  const [alertNote, setAlertNote] = useState("");
  const [alerting, setAlerting] = useState(false);

  const openAlert = (o: ServiceOrder) => {
    setAlertOs(o);
    setAlertReason(o.supervisor_alert_reason || ALERT_REASONS[0]);
    setAlertNote(o.supervisor_alert_note || "");
  };

  const confirmAlert = async () => {
    if (!alertOs) return;
    if (!alertNote.trim()) return toast.error("Descreva a observação para o supervisor");
    setAlerting(true);
    try {
      await update(alertOs.id, {
        supervisor_alert: true,
        supervisor_alert_reason: alertReason,
        supervisor_alert_note: alertNote.trim(),
        supervisor_alert_at: new Date().toISOString(),
        supervisor_alert_by: user?.id || null,
        supervisor_alert_resolved_at: null,
      } as any);
      toast.success("Supervisor acionado");
      setAlertOs(null);
      refetch();
    } finally {
      setAlerting(false);
    }
  };

  const cancelAlert = async (o: ServiceOrder) => {
    await update(o.id, {
      supervisor_alert: false,
      supervisor_alert_resolved_at: new Date().toISOString(),
    } as any);
    toast.success("Acionamento encerrado");
    refetch();
  };

  const mine = useMemo(
    () => items.filter(o => o.mechanic_id === profile?.id && MY_STAGES.includes(o.stage)),
    [items, profile?.id],
  );

  // Ordem de prioridade das etapas na visão do mecânico
  const STAGE_PRIORITY = ["execucao", "desempeno", "pintura", "analise"];
  const mineGroups = useMemo(
    () =>
      STAGE_PRIORITY
        .map(id => ({ ...stageInfo(id), orders: mine.filter(o => o.stage === id) }))
        .filter(g => g.orders.length > 0),
    [mine],
  );

  // Agenda do mecânico: serviços com data de execução definida
  const agendaGroups = useMemo(() => {
    const today = todayISO();
    const scheduled = items
      .filter(o => o.mechanic_id === profile?.id && !DONE_STAGES.includes(o.stage) && (o as any).scheduled_date)
      .sort((a, b) => String((a as any).scheduled_date).localeCompare(String((b as any).scheduled_date)));
    const byDate = new Map<string, ServiceOrder[]>();
    scheduled.forEach(o => {
      const d = String((o as any).scheduled_date);
      byDate.set(d, [...(byDate.get(d) || []), o]);
    });
    return Array.from(byDate.entries()).map(([date, orders]) => ({
      date,
      orders,
      isToday: date === today,
      isLate: date < today,
    }));
  }, [items, profile?.id]);

  const semData = useMemo(
    () => mine.filter(o => !(o as any).scheduled_date),
    [mine],
  );
  const agendaHoje = agendaGroups.find(g => g.isToday)?.orders.length || 0;

  // Agendamentos confirmados aguardando chegada da moto
  const { items: allBookings, refetch: refetchBookings } = useWorkshopBookings();
  const [openingBooking, setOpeningBooking] = useState<string | null>(null);
  const bookings = useMemo(
    () => allBookings
      .filter(b => b.status === "agendado" && !b.service_order_id)
      .sort((a, b) => (a.scheduled_date || "").localeCompare(b.scheduled_date || "")),
    [allBookings],
  );

  const handleOpenBooking = async (b: WorkshopBooking) => {
    setOpeningBooking(b.id);
    try {
      const os = await openOsFromBooking(b, { userId: user?.id, mechanicId: profile?.id || null });
      if (os) { refetchBookings(); refetch(); setTab("servicos"); }
    } finally {
      setOpeningBooking(null);
    }
  };

  // Motos na oficina sem mecânico atribuído
  const [availSearch, setAvailSearch] = useState("");
  const [pulling, setPulling] = useState<string | null>(null);

  const availableGroups = useMemo(() => {
    const q = availSearch.trim().toLowerCase();
    const free = items
      .filter(o => !o.mechanic_id && !DONE_STAGES.includes(o.stage))
      .filter(o => !q || `${o.vehicle_plate || ""} ${o.vehicle_model || ""} ${o.customer_name || ""} ${o.os_number}`.toLowerCase().includes(q));
    return STAGE_PRIORITY.concat(free.map(o => o.stage).filter(s => !STAGE_PRIORITY.includes(s)))
      .filter((s, i, arr) => arr.indexOf(s) === i)
      .map(id => ({ ...stageInfo(id), id, orders: free.filter(o => o.stage === id) }))
      .filter(g => g.orders.length > 0);
  }, [items, availSearch]);

  const availableCount = useMemo(
    () => items.filter(o => !o.mechanic_id && !DONE_STAGES.includes(o.stage)).length,
    [items],
  );

  const pullOs = async (o: ServiceOrder) => {
    if (!profile?.id) return toast.error("Perfil de mecânico não identificado");
    setPulling(o.id);
    try {
      await update(o.id, { mechanic_id: profile.id } as any);
      toast.success(`${o.vehicle_plate || `OS #${o.os_number}`} atribuída a você`);
      refetch();
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível puxar o serviço");
    } finally {
      setPulling(null);
    }
  };



  const [onlyMine, setOnlyMine] = useState(false);
  const [doneSearch, setDoneSearch] = useState("");

  const done = useMemo(() => {
    const q = doneSearch.trim().toLowerCase();
    return items
      .filter(o => DONE_STAGES.includes(o.stage))
      .filter(o => (onlyMine ? o.mechanic_id === profile?.id : true))
      .filter(o => !q || `${o.vehicle_plate || ""} ${o.vehicle_model || ""} ${o.os_number}`.toLowerCase().includes(q))
      .sort((a, b) => String(b.finished_at || b.opened_at).localeCompare(String(a.finished_at || a.opened_at)));
  }, [items, profile?.id, onlyMine, doneSearch]);


  const [donePhotos, setDonePhotos] = useState<Record<string, ServiceOrderPhoto[]>>({});
  const doneIds = done.map(o => o.id).join(",");
  useEffect(() => {
    const ids = doneIds ? doneIds.split(",") : [];
    if (!ids.length) { setDonePhotos({}); return; }
    let active = true;
    supabase.from("op_service_order_photos").select("*").in("service_order_id", ids).order("created_at")
      .then(({ data }) => {
        if (!active) return;
        const byOs: Record<string, ServiceOrderPhoto[]> = {};
        ((data || []) as ServiceOrderPhoto[]).forEach(p => { (byOs[p.service_order_id] ||= []).push(p); });
        setDonePhotos(byOs);
      });
    return () => { active = false; };
  }, [doneIds]);

  const myParts = useMemo(
    () => mine.flatMap(o => (partsByOs[o.id] || []).map(p => ({ ...p, os: o }))),
    [mine, partsByOs],
  );

  const partsByMoto = useMemo(() => {
    const map: Record<string, { os: ServiceOrder; parts: (ServiceOrderPart & { os: ServiceOrder })[] }> = {};
    myParts.forEach(p => {
      if (!map[p.os.id]) map[p.os.id] = { os: p.os, parts: [] };
      map[p.os.id].parts.push(p);
    });
    return Object.values(map).sort((a, b) => String(a.os.vehicle_plate || a.os.os_number).localeCompare(String(b.os.vehicle_plate || b.os.os_number)));
  }, [myParts]);

  const openFinish = (o: ServiceOrder) => {
    setFinishOs(o);
    setSummary("");
    setFiles([]);
    setFinishKm("");
  };

  const confirmFinish = async () => {
    if (!finishOs) return;
    if (!summary.trim()) return toast.error("Descreva o que foi feito no serviço");
    const km = Number(String(finishKm).replace(/\D/g, ""));
    if (!finishKm.trim() || !Number.isFinite(km) || km <= 0) return toast.error("Informe o KM atual da moto");
    setFinishing(true);
    try {
      for (const file of files) {
        const path = `${finishOs.id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("op-service-orders").upload(path, file);
        if (upErr) { toast.error(upErr.message); continue; }
        const { data: { publicUrl } } = supabase.storage.from("op-service-orders").getPublicUrl(path);
        await supabase.from("op_service_order_photos").insert({
          service_order_id: finishOs.id,
          photo_url: publicUrl,
          photo_type: "depois",
          uploaded_by: user?.id || null,
        });
      }
      await update(finishOs.id, {
        stage: "entregue",
        status: "Concluída",
        closure_summary: summary.trim(),
        finished_at: todayISO(),
        finish_km: km,
      } as any);
      toast.success("Serviço finalizado");
      setFinishOs(null);
      setExpanded(null);
      setTab("finalizadas");
      refetch();
    } finally {
      setFinishing(false);
    }
  };


  const createEntry = async () => {
    if (!plate.trim()) return toast.error("Informe a placa da moto");
    if (!companyId) return toast.error("Selecione a empresa");
    setSaving(true);
    const receivedText = newItems.length
      ? `Itens recebidos na entrada:\n${newItems.map(i => `- ${i.name} (x${i.qty})`).join("\n")}`
      : null;
    const res = await add({
      vehicle_plate: plate.trim().toUpperCase(),
      vehicle_model: model.trim() || null,
      company_id: companyId,
      customer_name: customerName.trim() || null,

      description: desc.trim() || null,
      notes: receivedText,
      mechanic_id: profile?.id || null,
      stage: "analise",
    });
    if (res && entryFiles.length) {
      const osId = (res as any).id as string;
      for (const file of entryFiles) {
        const path = `${osId}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("op-service-orders").upload(path, file);
        if (upErr) { toast.error(upErr.message); continue; }
        const { data: { publicUrl } } = supabase.storage.from("op-service-orders").getPublicUrl(path);
        await supabase.from("op_service_order_photos").insert({
          service_order_id: osId,
          photo_url: publicUrl,
          photo_type: "antes",
          uploaded_by: user?.id || null,
        });
      }
      refetch();
    }
    setSaving(false);
    if (res) {
      setOpenNew(false);
      setPlate(""); setModel(""); setCompanyId(""); setDesc(""); setCustomerName("");
      setNewItems([]); setItemName(""); setItemQty(1); setEntryFiles([]);
    }
  };




  return (
    <div className="min-h-screen bg-muted/30">
      <OficinaNav />
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="servicos"><ClipboardList className="h-4 w-4 mr-1" />Meus Serviços</TabsTrigger>
            <TabsTrigger value="agenda"><CalendarDays className="h-4 w-4 mr-1" />Agenda{agendaHoje ? ` (${agendaHoje} hoje)` : ""}</TabsTrigger>
            <TabsTrigger value="disponiveis"><Wrench className="h-4 w-4 mr-1" />Disponíveis{availableCount ? ` (${availableCount})` : ""}</TabsTrigger>
            <TabsTrigger value="pecas"><ShoppingCart className="h-4 w-4 mr-1" />Minhas Peças</TabsTrigger>
            <TabsTrigger value="finalizadas"><CheckCircle2 className="h-4 w-4 mr-1" />Finalizadas ({done.length})</TabsTrigger>

          </TabsList>

          <TabsContent value="servicos" className="space-y-3 mt-4">
            <div className="bg-card border rounded-lg p-4 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h1 className="font-bold text-lg">Fila de Trabalho de {profile?.name}</h1>
                <p className="text-sm text-muted-foreground">
                  Apenas motos em análise, desempeno, pintura e execução sob sua responsabilidade.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{mine.length} serviço(s) ativo(s)</Badge>
                <Button size="sm" onClick={() => setOpenNew(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Entrada de moto
                </Button>
              </div>
            </div>

            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Entrada de moto na oficina</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Placa *</Label>
                      <Input value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} placeholder="ABC1D23" />
                    </div>
                    <div>
                      <Label>Modelo</Label>
                      <Input value={model} onChange={e => setModel(e.target.value)} placeholder="ex.: CG 160" />
                    </div>
                  </div>
                  <div>
                    <Label>Empresa *</Label>
                    <Select value={companyId} onValueChange={setCompanyId}>
                      <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                      <SelectContent>
                        {filterOficinaCompanies(companies).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Cliente / Associado</Label>
                    <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nome do cliente/associado" />
                  </div>

                  <div>
                    <Label>Problema relatado</Label>
                    <Textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Descreva o problema relatado" />
                  </div>

                  <div className="border rounded-md p-3 bg-muted/30 space-y-2">
                    <div className="text-sm font-medium flex items-center gap-1">
                      <Package className="h-4 w-4" /> O que veio na moto ({newItems.length})
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Registre itens entregues junto com a moto (podem vir separados).
                    </p>
                    <div className="flex gap-2">
                      <Input value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Ex.: retrovisor, capacete, bagageiro"
                        onKeyDown={e => {
                          if (e.key === "Enter" && itemName.trim()) {
                            e.preventDefault();
                            setNewItems(p => [...p, { name: itemName.trim(), qty: itemQty || 1 }]);
                            setItemName(""); setItemQty(1);
                          }
                        }} />
                      <Input type="number" min={1} value={itemQty} onChange={e => setItemQty(Number(e.target.value))} className="w-16" />
                      <Button type="button" size="icon" onClick={() => {
                        if (!itemName.trim()) return;
                        setNewItems(p => [...p, { name: itemName.trim(), qty: itemQty || 1 }]);
                        setItemName(""); setItemQty(1);
                      }}><Plus className="h-4 w-4" /></Button>
                    </div>
                    {newItems.map((p, i) => (
                      <div key={i} className="flex items-center justify-between bg-card border rounded px-2 py-1 text-sm">
                        <span className="truncate">{p.name} <span className="text-muted-foreground">x{p.qty}</span></span>
                        <button type="button" className="text-destructive" onClick={() => setNewItems(list => list.filter((_, j) => j !== i))}>
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="border rounded-md p-3 bg-muted/30 space-y-2">
                    <div className="text-sm font-medium flex items-center gap-1">
                      <Camera className="h-4 w-4" /> Fotos da entrada ({entryFiles.length})
                    </div>
                    <Input type="file" accept="image/*" multiple
                      onChange={e => setEntryFiles(Array.from(e.target.files || []))} />
                    {entryFiles.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {entryFiles.map((f, i) => (
                          <div key={i} className="relative">
                            <img src={URL.createObjectURL(f)} alt={f.name} className="h-20 w-full object-cover rounded border" />
                            <button type="button" className="absolute top-1 right-1 bg-background/90 rounded-full p-0.5 text-destructive"
                              onClick={() => setEntryFiles(list => list.filter((_, j) => j !== i))}>
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenNew(false)}>Cancelar</Button>
                  <Button onClick={createEntry} disabled={saving}>Registrar entrada</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>


            {mine.length === 0 && (
              <div className="bg-card border rounded-lg p-12 text-center text-muted-foreground">
                Nenhum serviço atribuído a você no momento.
              </div>
            )}

            {mineGroups.map((g, gi) => {
              const isHidden = hiddenStages.includes(g.id);
              return (
                <div key={g.id} className="space-y-3">
                  <div className={`flex items-center gap-2 ${gi > 0 ? "pt-4" : ""}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${g.dot}`} />
                    <h3 className="text-sm font-bold uppercase tracking-wide">{g.label}</h3>
                    <Badge variant="secondary" className={g.chip}>{g.orders.length}</Badge>
                    {gi === 0 && <span className="text-[11px] text-muted-foreground">prioridade</span>}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto h-7 px-2 text-xs"
                      onClick={() => toggleStage(g.id)}
                    >
                      {isHidden ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
                      {isHidden ? "Mostrar" : "Ocultar"}
                    </Button>
                  </div>
                  {!isHidden && g.orders.map(o => {
              const st = stageInfo(o.stage);
              const parts = partsByOs[o.id] || [];
              const days = daysInWorkshop(o.opened_at);
              const sla = partsSlaRemaining(o.parts_arrived_at);
              const open = expanded === o.id;
              return (
                <div key={o.id} className="bg-card border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : o.id)}
                    className="w-full text-left p-4 flex items-center gap-3 flex-wrap hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-bold tracking-wide">{o.vehicle_plate || `OS #${o.os_number}`}</span>
                        <Badge variant="secondary" className={st.chip}>{st.label}</Badge>
                        {(o as any).scheduled_date && (
                          <Badge
                            variant="secondary"
                            className={cn(
                              "bg-sky-500/15 text-sky-700",
                              (o as any).scheduled_date === todayISO() && "bg-emerald-500/15 text-emerald-700",
                              (o as any).scheduled_date < todayISO() && "bg-rose-500/15 text-rose-700",
                            )}
                          >
                            <CalendarDays className="h-3 w-3 mr-1" />
                            {(o as any).scheduled_date === todayISO() ? "Hoje" : formatDateBRShort((o as any).scheduled_date)}
                            {(o as any).scheduled_period ? ` · ${periodInfo((o as any).scheduled_period).label}` : ""}
                          </Badge>
                        )}
                      </div>

                      <div className="text-sm text-muted-foreground mt-0.5">
                        {[o.vehicle_model, (o as any).vehicle_color, (o as any).vehicle_year].filter(Boolean).join(" · ") || "—"}
                      </div>
                      <OsProgressBar items={checklist.byOs[o.id] || []} barClass={st.bar} className="mt-2 max-w-xs" compact />
                    </div>

                    {open ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                  </button>

                  {open && (
                    <div className="px-4 pb-4 space-y-3 border-t pt-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className={cn(days >= DIAS_ALERTA && "bg-rose-500/15 text-rose-700")}>
                          {days}d na oficina
                        </Badge>
                        {sla != null && sla < 0 && (
                          <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-0.5" />SLA peças estourado</Badge>
                        )}
                        {o.supervisor_alert && (
                          <Badge variant="secondary" className="bg-amber-500/15 text-amber-700">
                            <AlertTriangle className="h-3 w-3 mr-0.5" />Supervisor acionado
                          </Badge>
                        )}
                        <div className="ml-auto flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => setExpanded(null)}>
                            <ChevronUp className="h-4 w-4 mr-1" /> Recolher
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-amber-500/60 text-amber-700 hover:bg-amber-500/10"
                            onClick={() => openAlert(o)}
                          >
                            <MessageSquareWarning className="h-4 w-4 mr-1" />
                            {o.supervisor_alert ? "Editar observação" : "Acionar supervisor"}
                          </Button>
                          <Button size="sm" onClick={() => openFinish(o)}>
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Finalizar Serviço
                          </Button>
                        </div>
                      </div>

                      {o.supervisor_alert && (
                        <div className="border border-amber-500/40 bg-amber-500/10 rounded-md p-3 space-y-1">
                          <div className="text-sm font-medium text-amber-800">
                            {o.supervisor_alert_reason || "Observação para o supervisor"}
                          </div>
                          <p className="text-sm text-amber-900/80 whitespace-pre-wrap">{o.supervisor_alert_note}</p>
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <span className="text-xs text-muted-foreground">
                              Acionado em {o.supervisor_alert_at ? new Date(o.supervisor_alert_at).toLocaleString("pt-BR") : "—"}
                            </span>
                            <Button size="sm" variant="ghost" onClick={() => cancelAlert(o)}>Encerrar acionamento</Button>
                          </div>
                        </div>
                      )}

                      <div className="text-sm">
                        <span className="font-medium">Serviço Solicitado:</span>{" "}
                        <span className="text-muted-foreground">{o.description || "—"}</span>
                      </div>
                      {o.diagnosis && (
                        <div className="text-sm">
                          <span className="font-medium">Diagnóstico:</span>{" "}
                          <span className="text-muted-foreground">{o.diagnosis}</span>
                        </div>
                      )}

                      <OsChecklist
                        items={checklist.byOs[o.id] || []}
                        barClass={st.bar}
                        onToggle={checklist.toggle}
                        onAdd={(label) => checklist.addItem(o.id, label)}
                        onRemove={checklist.removeItem}
                      />



                      <div className="border rounded-md p-3 bg-muted/30">
                        <div className="text-sm font-medium flex items-center justify-between gap-2 mb-2">
                          <span className="flex items-center gap-1"><Package className="h-4 w-4" /> Peças Solicitadas ({parts.length})</span>
                          <Button size="sm" variant="outline" onClick={() => { setAddPartFor(addPartFor === o.id ? null : o.id); setRowPart(""); setRowQty(1); }}>
                            <Plus className="h-4 w-4 mr-1" /> Incluir peça
                          </Button>
                        </div>
                        {addPartFor === o.id && (
                          <div className="flex gap-2 mb-2">
                            <Input value={rowPart} onChange={e => setRowPart(e.target.value)} placeholder="Peça / serviço"
                              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addPartToOs(o.id); } }} />
                            <Input type="number" min={1} value={rowQty} onChange={e => setRowQty(Number(e.target.value))} className="w-16" />
                            <Button size="sm" onClick={() => addPartToOs(o.id)}>Solicitar</Button>
                          </div>
                        )}

                        {parts.length === 0 ? (
                          <div className="text-xs text-muted-foreground">Nenhuma peça solicitada.</div>
                        ) : (
                          <div className="grid sm:grid-cols-2 gap-2">
                            {parts.map(p => {
                              const info = PART_STATUS_INFO[p.part_status] || { label: p.part_status, chip: "" };
                              return (
                                <div key={p.id} className="bg-card border rounded-md px-3 py-2 flex items-center justify-between gap-2">
                                  <span className="text-sm truncate">{p.part_name} (x{p.quantity})</span>
                                  <Badge variant="secondary" className={info.chip}>{info.label}</Badge>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
          </TabsContent>

          <TabsContent value="agenda" className="space-y-3 mt-4">
            <div className="bg-card border rounded-lg p-4">
              <h1 className="font-bold text-lg flex items-center gap-2">
                <CalendarDays className="h-5 w-5" /> Minha agenda de execuções
              </h1>
              <p className="text-sm text-muted-foreground">
                Datas de execução definidas pela oficina para as motos sob sua responsabilidade.
              </p>
            </div>

            {bookings.length > 0 && (
              <div className="bg-card border rounded-lg overflow-hidden">
                <div className="px-4 py-2 border-b bg-teal-600/10 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-teal-700" />
                  <span className="font-semibold text-sm">Agendamentos confirmados (chegada)</span>
                  <Badge variant="secondary" className="ml-auto">{bookings.length}</Badge>
                </div>
                <div className="divide-y">
                  {bookings.map(b => {
                    const per = periodInfo(b.scheduled_period);
                    return (
                      <div key={b.id} className="p-3 flex items-center gap-3 flex-wrap">
                        <div className="flex-1 min-w-[200px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold tracking-wide">{b.vehicle_plate}</span>
                            {b.scheduled_period && <Badge variant="secondary" className={per.chip}>{per.label}</Badge>}
                            {b.scheduled_date && (
                              <Badge variant="outline">{formatDateBRShort(b.scheduled_date)}</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-0.5">
                            {[b.vehicle_model, b.service_type, b.requester_name].filter(Boolean).join(" · ") || "—"}
                          </div>
                        </div>
                        <Button size="sm" disabled={openingBooking === b.id} onClick={() => handleOpenBooking(b)}>
                          {openingBooking === b.id ? "Abrindo..." : "Moto chegou · abrir OS"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}


            {agendaGroups.length === 0 && (
              <div className="bg-card border rounded-lg p-12 text-center text-muted-foreground">
                Nenhum serviço agendado para você no momento.
              </div>
            )}

            {agendaGroups.map(g => (
              <div key={g.date} className="bg-card border rounded-lg overflow-hidden">
                <div className={cn(
                  "px-4 py-2 flex items-center gap-2 border-b",
                  g.isToday && "bg-emerald-500/10",
                  g.isLate && "bg-rose-500/10",
                )}>
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold capitalize">
                    {weekdayLabel(g.date)} · {formatDateBRShort(g.date)}
                  </span>
                  {g.isToday && <Badge className="bg-emerald-600 hover:bg-emerald-600">Hoje</Badge>}
                  {g.isLate && <Badge variant="destructive">Atrasado</Badge>}
                  <Badge variant="secondary" className="ml-auto">{g.orders.length} serviço(s)</Badge>
                </div>
                <div className="divide-y">
                  {g.orders.map(o => {
                    const st = stageInfo(o.stage);
                    const p = periodInfo((o as any).scheduled_period);
                    return (
                      <div key={o.id} className="p-3 flex items-center gap-3 flex-wrap">
                        <div className="flex-1 min-w-[180px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold tracking-wide">{o.vehicle_plate || `OS #${o.os_number}`}</span>
                            <Badge variant="secondary" className={st.chip}>{st.label}</Badge>
                            {(o as any).scheduled_period && (
                              <Badge variant="secondary" className={p.chip}>{p.label}</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-0.5">
                            {[o.vehicle_model, o.customer_name].filter(Boolean).join(" · ") || "—"}
                          </div>
                          {(o as any).schedule_notes && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Direcionamento: {(o as any).schedule_notes}
                            </div>
                          )}
                        </div>
                        <Button size="sm" variant="outline" onClick={() => { setTab("servicos"); setExpanded(o.id); }}>
                          Abrir OS
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {semData.length > 0 && (
              <div className="bg-card border rounded-lg p-4">
                <h2 className="font-semibold text-sm mb-2">Sem data definida ({semData.length})</h2>
                <div className="flex flex-wrap gap-2">
                  {semData.map(o => (
                    <Badge key={o.id} variant="outline">
                      {o.vehicle_plate || `OS #${o.os_number}`} · {stageInfo(o.stage).label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="disponiveis" className="space-y-3 mt-4">
            <div className="bg-card border rounded-lg p-4 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h1 className="font-bold text-lg flex items-center gap-2">
                  <Wrench className="h-5 w-5" /> Motos sem mecânico atribuído
                </h1>
                <p className="text-sm text-muted-foreground">
                  Veja o status e puxe para você caso possa adiantar o serviço.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{availableCount} moto(s)</Badge>
                <Input
                  value={availSearch}
                  onChange={e => setAvailSearch(e.target.value)}
                  placeholder="Buscar placa, modelo, OS..."
                  className="w-56"
                />
              </div>
            </div>

            {availableGroups.length === 0 && (
              <div className="bg-card border rounded-lg p-12 text-center text-muted-foreground">
                Nenhuma moto disponível sem mecânico no momento.
              </div>
            )}

            {availableGroups.map(g => (
              <div key={g.id} className="bg-card border rounded-lg overflow-hidden">
                <div className="px-4 py-2 flex items-center gap-2 border-b bg-muted/40">
                  <span className="font-semibold">{g.label}</span>
                  <Badge variant="secondary" className="ml-auto">{g.orders.length}</Badge>
                </div>
                <div className="divide-y">
                  {g.orders.map(o => {
                    const st = stageInfo(o.stage);
                    const dias = daysInWorkshop(o as any);
                    return (
                      <div key={o.id} className="p-3 flex items-center gap-3 flex-wrap">
                        <div className="flex-1 min-w-[200px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold tracking-wide">{o.vehicle_plate || `OS #${o.os_number}`}</span>
                            <Badge variant="secondary" className={st.chip}>{st.label}</Badge>
                            {(o as any).scheduled_date && (
                              <Badge variant="outline" className="gap-1">
                                <CalendarDays className="h-3 w-3" />
                                {formatDateBRShort(String((o as any).scheduled_date))}
                                {(o as any).scheduled_period ? ` · ${periodInfo((o as any).scheduled_period).label}` : ""}
                              </Badge>
                            )}
                            {o.supervisor_alert && (
                              <Badge variant="destructive" className="gap-1">
                                <MessageSquareWarning className="h-3 w-3" /> Alerta
                              </Badge>
                            )}
                            {typeof dias === "number" && dias >= DIAS_ALERTA && (
                              <Badge variant="destructive">{dias} dias na oficina</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-0.5">
                            {[o.vehicle_model, o.customer_name].filter(Boolean).join(" · ") || "—"}
                          </div>
                          {o.description && (
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{o.description}</div>
                          )}
                          {(partsByOs[o.id] || []).length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Peças: {(partsByOs[o.id] || []).filter(p => p.part_status === "recebida").length}/{(partsByOs[o.id] || []).length} recebidas
                            </div>
                          )}

                        </div>
                        <Button size="sm" disabled={pulling === o.id} onClick={() => pullOs(o)}>
                          {pulling === o.id ? "Puxando..." : "Puxar pra mim"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </TabsContent>





          <TabsContent value="pecas" className="space-y-3 mt-4">
            {myParts.length === 0 && (
              <div className="bg-card border rounded-lg p-12 text-center text-muted-foreground">
                Nenhuma peça vinculada às suas motos.
              </div>
            )}

            {partsByMoto.map(({ os, parts }) => {
              const open = expandedPartOs === os.id;
              return (
                <div key={os.id} className="bg-card border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedPartOs(open ? null : os.id)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-bold tracking-wide uppercase">
                          {os.vehicle_plate || `OS #${os.os_number}`}
                        </span>
                        <span className="text-sm text-muted-foreground">{os.vehicle_model || "—"}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {parts.length} peça(s) — {os.customer_name}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs hidden sm:inline text-muted-foreground">
                        {open ? "Recolher" : "Ver peças"}
                      </span>
                      {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </button>

                  {open && (
                    <div className="px-4 pb-4 space-y-2 border-t border-border/60 pt-3">
                      {parts.map(part => {
                        const info = PART_STATUS_INFO[part.part_status] || { label: part.part_status, chip: "" };
                        return (
                          <div
                            key={part.id}
                            className="flex items-center justify-between gap-3 bg-muted/40 rounded-md px-3 py-2"
                          >
                            <span className="text-sm font-medium truncate">
                              {part.part_name} <span className="text-muted-foreground">(x{part.quantity})</span>
                            </span>
                            <Badge variant="secondary" className={cn("text-xs shrink-0", info.chip)}>
                              {info.label}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="finalizadas" className="space-y-3 mt-4">
            <div className="bg-card border rounded-lg p-3 flex items-center gap-2 flex-wrap">
              <Input
                value={doneSearch}
                onChange={e => setDoneSearch(e.target.value)}
                placeholder="Buscar por placa, modelo ou nº da OS"
                className="max-w-xs"
              />
              <Button size="sm" variant={onlyMine ? "default" : "outline"} onClick={() => setOnlyMine(v => !v)}>
                {onlyMine ? "Somente minhas" : "Todas da oficina"}
              </Button>
              <Badge variant="outline" className="ml-auto">{done.length} finalizada(s)</Badge>
            </div>
            {done.length === 0 && (
              <div className="bg-card border rounded-lg p-12 text-center text-muted-foreground">
                Nenhuma moto finalizada encontrada.
              </div>
            )}
            {done.map(o => {
              const st = stageInfo(o.stage);
              const photos = donePhotos[o.id] || [];
              return (
                <div key={o.id} className="bg-card border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-bold tracking-wide">{o.vehicle_plate || `OS #${o.os_number}`}</span>
                    <Badge variant="secondary" className={st.chip}>{st.label}</Badge>
                    {o.mechanic_id === profile?.id && <Badge variant="outline">Minha</Badge>}

                    {o.finished_at && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        Finalizado em {formatDateBRShort(o.finished_at)}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {[o.vehicle_model, o.vehicle_color, o.vehicle_year].filter(Boolean).join(" · ") || "—"}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">O que foi feito:</span>{" "}
                    <span className="text-muted-foreground">{o.closure_summary || "—"}</span>
                  </div>
                  {photos.length > 0 && (
                    <div className="flex gap-2 flex-wrap pt-1">
                      {photos.map(p => (
                        <a key={p.id} href={p.photo_url} target="_blank" rel="noreferrer">
                          <img src={p.photo_url} alt={`Foto do serviço ${o.vehicle_plate || o.os_number}`} loading="lazy"
                            className="h-20 w-20 object-cover rounded-md border" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>
        </Tabs>

        <Dialog open={!!finishOs} onOpenChange={v => !v && setFinishOs(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Finalizar serviço · {finishOs?.vehicle_plate || `OS #${finishOs?.os_number}`}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>KM atual da moto *</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={finishKm}
                  onChange={e => setFinishKm(e.target.value.replace(/\D/g, ""))}
                  placeholder="Ex: 24500"
                />
              </div>
              <div>
                <Label>O que foi feito? *</Label>
                <Textarea value={summary} onChange={e => setSummary(e.target.value)} rows={4}
                  placeholder="Descreva os serviços executados, peças trocadas, observações..." />
              </div>
              <div>
                <Label>Fotos do serviço</Label>
                <Input type="file" accept="image/*" multiple capture="environment"
                  onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files || [])])} />
                {files.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {files.map((f, i) => (
                      <div key={i} className="relative">
                        <img src={URL.createObjectURL(f)} alt={f.name} className="h-16 w-16 object-cover rounded-md border" />
                        <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))}
                          className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Camera className="h-3 w-3" /> Você pode tirar a foto na hora pelo celular.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFinishOs(null)} disabled={finishing}>Cancelar</Button>
              <Button onClick={confirmFinish} disabled={finishing}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> {finishing ? "Salvando..." : "Confirmar finalização"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


        <div className="text-center text-xs text-muted-foreground py-4 flex items-center justify-center gap-1">
          <Wrench className="h-3 w-3" />
          Gestão de Oficina · Regras de alerta em {DIAS_ALERTA} dias · SLA de {SLA_PECAS} dias para montagem após chegada de peças
        </div>

        {/* Acionar supervisor */}
        <Dialog open={!!alertOs} onOpenChange={v => !v && setAlertOs(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Acionar supervisor</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Use quando não for possível finalizar o serviço agora (falta de peça, intercorrência etc.).
                O supervisor verá a observação no acompanhamento.
              </p>
              <div>
                <Label>Motivo</Label>
                <Select value={alertReason} onValueChange={setAlertReason}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALERT_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observação *</Label>
                <Textarea rows={4} value={alertNote} onChange={e => setAlertNote(e.target.value)}
                  placeholder="Descreva o que está impedindo a conclusão do serviço" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAlertOs(null)}>Cancelar</Button>
              <Button onClick={confirmAlert} disabled={alerting}>
                {alerting ? "Enviando..." : "Acionar supervisor"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
