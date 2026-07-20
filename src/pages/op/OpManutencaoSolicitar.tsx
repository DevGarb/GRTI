import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ManutencaoNav from "./ManutencaoNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Building2, Wrench, AlertTriangle, Calendar } from "lucide-react";
import { useMaintenanceOrders, useSites, MAINT_CATEGORIES, MAINT_PRIORITIES } from "@/hooks/useManutencao";
import { useMaintProfile } from "@/hooks/useMaintProfile";
import { toast } from "sonner";

function todayISO() { return new Date().toISOString().slice(0, 10); }

export default function OpManutencaoSolicitar() {
  const navigate = useNavigate();
  const orders = useMaintenanceOrders();
  const sites = useSites();
  const maintProfile = useMaintProfile();

  const [form, setForm] = useState({
    title: "",
    site_id: "",
    category: "Outros",
    priority: "Média",
    description: "",
    deadline: "",
    opened_at: todayISO(),
  });

  const submit = async () => {
    if (!form.title.trim()) return toast.error("Informe o título da solicitação");
    if (!form.site_id) return toast.error("Escolha a sede");
    const res = await orders.add({
      ...form,
      status: "Aberta",
      requester_id: maintProfile.requesterId || null,
      deadline: form.deadline || null,
    });
    if (res) navigate("/op/manutencao/minhas");
  };

  return (
    <div className="cgps-scope min-h-screen bg-[hsl(var(--cgps-muted))]">
      <ManutencaoNav />
      <div className="max-w-2xl mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "hsl(191 74% 20%)" }}>
            <Wrench className="h-6 w-6" /> Nova solicitação de manutenção
          </h1>
          <p className="text-sm text-muted-foreground">Preencha os dados. A equipe atribuirá um técnico.</p>
        </div>

        <div className="bg-white border rounded-xl p-5 space-y-4">
          <div>
            <Label>Título / problema *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Ex.: Torneira do banheiro vazando"
            />
          </div>

          <div>
            <Label className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4" style={{ color: "hsl(191 74% 20%)" }} /> Sede *
            </Label>
            <Select value={form.site_id} onValueChange={(v) => setForm((p) => ({ ...p, site_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Escolha a sede" /></SelectTrigger>
              <SelectContent>
                {sites.items.filter((s) => s.is_active).map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
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
              <Label className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" style={{ color: "hsl(14 82% 51%)" }} /> Prioridade
              </Label>
              <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MAINT_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" style={{ color: "hsl(191 74% 20%)" }} /> Prazo desejado (opcional)
            </Label>
            <Input type="date" value={form.deadline} onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))} />
          </div>

          <div>
            <Label>Descrição / detalhes</Label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Descreva o problema, local exato, quando começou..."
            />
          </div>

          <Button onClick={submit} className="w-full cgps-btn-primary">
            <Send className="h-4 w-4 mr-1" /> Enviar solicitação
          </Button>
        </div>
      </div>
    </div>
  );
}
