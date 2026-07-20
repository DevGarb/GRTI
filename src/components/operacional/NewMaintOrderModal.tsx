import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MAINT_CATEGORIES, MAINT_PRIORITIES, useMaintenanceOrders, useSites } from "@/hooks/useManutencao";
import { useDeliveryRequesters } from "@/hooks/useDeliveryRequesters";
import { useSectors } from "@/hooks/useSectors";
import { useAuth } from "@/contexts/AuthContext";
import { Send } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultTechnicianId?: string | null;
  onCreated?: () => void;
}

function todayISO() { return new Date().toISOString().slice(0, 10); }

export default function NewMaintOrderModal({ open, onOpenChange, defaultTechnicianId, onCreated }: Props) {
  const { profile } = useAuth();
  const orders = useMaintenanceOrders();
  const sites = useSites();
  const requesters = useDeliveryRequesters();
  const { data: sectors = [] } = useSectors(profile?.organization_id || null);

  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    site_id: "",
    sector: "",
    requester_id: "",
    category: "Outros",
    priority: "Média",
    description: "",
    deadline: "",
  });

  const reset = () => setForm({
    title: "", site_id: "", sector: "", requester_id: "",
    category: "Outros", priority: "Média", description: "", deadline: "",
  });

  const submit = async () => {
    if (!form.title.trim()) return toast.error("Informe o título");
    if (!form.site_id) return toast.error("Escolha a sede");
    if (!form.requester_id) return toast.error("Selecione o solicitante");
    if (!form.sector) return toast.error("Escolha o setor solicitante");
    setBusy(true);
    const res = await orders.add({
      title: form.title,
      site_id: form.site_id,
      sector: form.sector,
      requester_id: form.requester_id,
      category: form.category,
      priority: form.priority,
      description: form.description,
      deadline: form.deadline || null,
      opened_at: todayISO(),
      status: "Aberta",
      assigned_technician_id: defaultTechnicianId || null,
    });
    setBusy(false);
    if (res) {
      reset();
      onOpenChange(false);
      onCreated?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova OM em nome de solicitante</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Solicitante *</Label>
            <Select value={form.requester_id} onValueChange={(v) => setForm((p) => ({ ...p, requester_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Escolha o solicitante" /></SelectTrigger>
              <SelectContent>
                {requesters.items.filter((r) => r.is_active).map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Título / problema *</Label>
            <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Ex.: Torneira do banheiro vazando" />
          </div>

          <div>
            <Label>Sede *</Label>
            <Select value={form.site_id} onValueChange={(v) => setForm((p) => ({ ...p, site_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Escolha a sede" /></SelectTrigger>
              <SelectContent>
                {sites.items.filter((s) => s.is_active).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Setor solicitante</Label>
            <Select value={form.sector} onValueChange={(v) => setForm((p) => ({ ...p, sector: v }))}>
              <SelectTrigger><SelectValue placeholder="Escolha o setor (opcional)" /></SelectTrigger>
              <SelectContent>
                {sectors.map((s) => (
                  <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MAINT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MAINT_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Prazo desejado (opcional)</Label>
            <Input type="date" value={form.deadline} onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))} />
          </div>

          <div>
            <Label>Descrição / detalhes</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Descreva o problema..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button onClick={submit} disabled={busy} className="cgps-btn-primary">
            <Send className="h-4 w-4 mr-1" /> Criar OM
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
