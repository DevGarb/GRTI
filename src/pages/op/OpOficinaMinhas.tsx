import { useMemo, useState } from "react";
import { Wrench, Package, CheckCircle2, ClipboardList, ShoppingCart, AlertTriangle, Plus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServiceOrders, type ServiceOrder } from "@/hooks/useOficina";
import { useCompanies } from "@/hooks/useOperacional";
import { useOficinaProfile } from "@/contexts/OficinaProfileContext";
import OficinaNav from "./OficinaNav";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  stageInfo, PART_STATUS_INFO, daysInWorkshop, partsSlaRemaining, DIAS_ALERTA, SLA_PECAS,
} from "@/lib/oficinaStages";

const MY_STAGES = ["analise", "desempeno", "pintura", "execucao"];

export default function OpOficinaMinhas() {
  const { profile } = useOficinaProfile();
  const { items, partsByOs, update, add } = useServiceOrders();
  const { items: companies } = useCompanies();
  const [tab, setTab] = useState("servicos");

  const [openNew, setOpenNew] = useState(false);
  const [plate, setPlate] = useState("");
  const [model, setModel] = useState("");
  const [companyId, setCompanyId] = useState("none");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const mine = useMemo(
    () => items.filter(o => o.mechanic_id === profile?.id && MY_STAGES.includes(o.stage)),
    [items, profile?.id],
  );

  const myParts = useMemo(
    () => mine.flatMap(o => (partsByOs[o.id] || []).map(p => ({ ...p, os: o }))),
    [mine, partsByOs],
  );

  const finish = (o: ServiceOrder) => update(o.id, { stage: "pronto" });

  const createEntry = async () => {
    if (!plate.trim()) return toast.error("Informe a placa da moto");
    setSaving(true);
    const res = await add({
      vehicle_plate: plate.trim().toUpperCase(),
      vehicle_model: model.trim() || null,
      company_id: companyId === "none" ? null : companyId,
      description: desc.trim() || null,
      mechanic_id: profile?.id || null,
      stage: "analise",
    });
    setSaving(false);
    if (res) {
      setOpenNew(false);
      setPlate(""); setModel(""); setCompanyId("none"); setDesc("");
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
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Nova entrada de moto na oficina</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Placa *</Label>
                    <Input value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} placeholder="ABC1D23" />
                  </div>
                  <div>
                    <Label>Modelo</Label>
                    <Input value={model} onChange={e => setModel(e.target.value)} placeholder="ex.: Honda CG 160" />
                  </div>
                  <div>
                    <Label>Empresa</Label>
                    <Select value={companyId} onValueChange={setCompanyId}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Serviço solicitado</Label>
                    <Textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Descreva o problema relatado" />
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

            {mine.map(o => {
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
                        <div className="ml-auto flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => setExpanded(null)}>
                            <ChevronUp className="h-4 w-4 mr-1" /> Recolher
                          </Button>
                          <Button size="sm" onClick={() => finish(o)}>
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Finalizar Serviço
                          </Button>
                        </div>
                      </div>

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

                      <div className="border rounded-md p-3 bg-muted/30">
                        <div className="text-sm font-medium flex items-center gap-1 mb-2">
                          <Package className="h-4 w-4" /> Peças Solicitadas ({parts.length})
                        </div>
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
        </Tabs>

        <div className="text-center text-xs text-muted-foreground py-4 flex items-center justify-center gap-1">
          <Wrench className="h-3 w-3" />
          Gestão de Oficina · Regras de alerta em {DIAS_ALERTA} dias · SLA de {SLA_PECAS} dias para montagem após chegada de peças
        </div>
      </div>
    </div>
  );
}
