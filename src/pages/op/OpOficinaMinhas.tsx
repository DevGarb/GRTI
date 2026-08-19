import { filterOficinaCompanies } from "@/lib/oficinaCompanies";
import { useEffect, useMemo, useState } from "react";
import { Wrench, Package, CheckCircle2, ClipboardList, ShoppingCart, AlertTriangle, Plus, ChevronDown, ChevronUp, Camera, X, MessageSquareWarning } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServiceOrders, useServiceChecklists, type ServiceOrder, type ServiceOrderPhoto } from "@/hooks/useOficina";
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

const MY_STAGES = ["analise", "desempeno", "pintura", "execucao"];
const DONE_STAGES = ["pronto", "entregue"];
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

  const [openNew, setOpenNew] = useState(false);
  const [plate, setPlate] = useState("");
  const [model, setModel] = useState("");
  const [companyId, setCompanyId] = useState("none");
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

  const openFinish = (o: ServiceOrder) => {
    setFinishOs(o);
    setSummary("");
    setFiles([]);
  };

  const confirmFinish = async () => {
    if (!finishOs) return;
    if (!summary.trim()) return toast.error("Descreva o que foi feito no serviço");
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
        stage: "pronto",
        closure_summary: summary.trim(),
        finished_at: new Date().toISOString(),
      });
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
    setSaving(true);
    const receivedText = newItems.length
      ? `Itens recebidos na entrada:\n${newItems.map(i => `- ${i.name} (x${i.qty})`).join("\n")}`
      : null;
    const res = await add({
      vehicle_plate: plate.trim().toUpperCase(),
      vehicle_model: model.trim() || null,
      company_id: companyId === "none" ? null : companyId,
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
      setPlate(""); setModel(""); setCompanyId("none"); setDesc(""); setCustomerName("");
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
                    <Label>Empresa</Label>
                    <Select value={companyId} onValueChange={setCompanyId}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
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

            {mineGroups.map((g, gi) => (
            <div key={g.id} className="space-y-3">
              <div className={`flex items-center gap-2 ${gi > 0 ? "pt-4" : ""}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${g.dot}`} />
                <h3 className="text-sm font-bold uppercase tracking-wide">{g.label}</h3>
                <Badge variant="secondary" className={g.chip}>{g.orders.length}</Badge>
                {gi === 0 && <span className="text-[11px] text-muted-foreground">prioridade</span>}
              </div>
            {g.orders.map(o => {
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
          </TabsContent>

          <TabsContent value="pecas" className="space-y-3 mt-4">
            {myParts.length === 0 && (
              <div className="bg-card border rounded-lg p-12 text-center text-muted-foreground">
                Nenhuma peça vinculada às suas motos.
              </div>
            )}
            {myParts.map(p => {
              const info = PART_STATUS_INFO[p.part_status] || { label: p.part_status, chip: "" };
              return (
                <div key={p.id} className="bg-card border rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-medium text-sm">{p.part_name} (x{p.quantity})</div>
                    <div className="text-xs text-muted-foreground">
                      {p.os.vehicle_plate || `OS #${p.os.os_number}`} · {p.os.vehicle_model || "—"}
                    </div>
                  </div>
                  <Badge variant="secondary" className={info.chip}>{info.label}</Badge>
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
                        Finalizado em {new Date(o.finished_at).toLocaleDateString("pt-BR")}
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
