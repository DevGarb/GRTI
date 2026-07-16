import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import EntregasNav from "./EntregasNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useDeliveries } from "@/hooks/useDeliveries";
import { useDeliveryCategories } from "@/hooks/useDeliveryCategories";
import { useCompanies } from "@/hooks/useOperacional";
import { useEntregasProfile } from "@/contexts/EntregasProfileContext";
import { Bike, Car, HelpCircle, MapPin, Phone, Send, Building2 } from "lucide-react";
import { toast } from "sonner";

const VEHICLE_REQUIRED = [
  { value: "qualquer", label: "Qualquer", icon: HelpCircle },
  { value: "moto", label: "Moto", icon: Bike },
  { value: "carro", label: "Carro", icon: Car },
];
const PERIODS = ["Manhã", "Tarde", "Noite"];

function todayISO() { return new Date().toISOString().slice(0, 10); }

export default function OpEntregasSolicitar() {
  const navigate = useNavigate();
  const { profile } = useEntregasProfile();
  const { add } = useDeliveries();
  const { activeItems: categories } = useDeliveryCategories();
  const { items: companies } = useCompanies();

  const [form, setForm] = useState({
    category_id: "",
    company_id: "",
    address: "",
    contact_name: "",
    contact_phone: profile?.phone || "",
    receiver_phone: "",
    vehicle_required: "qualquer",
    period: "Manhã",
    scheduled_date: todayISO(),
    notes: "",
  });

  const submit = async () => {
    if (!form.category_id) return toast.error("Escolha a categoria");
    if (!form.address.trim()) return toast.error("Informe o endereço");
    const res = await add({
      ...form,
      type: categories.find((c) => c.id === form.category_id)?.name || "Entrega",
      status: "Pendente",
      requester_name: profile?.name || null,
    });
    if (!res?.error) {
      navigate("/op/entregas/minhas");
    }
  };

  return (
    <div className="cgps-scope min-h-screen bg-[hsl(var(--cgps-muted))]">
      <EntregasNav />
      <div className="max-w-2xl mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "hsl(191 74% 20%)" }}>Nova solicitação de entrega</h1>
          <p className="text-sm text-muted-foreground">Preencha os dados. A equipe atribuirá um motorista.</p>
        </div>

        <div className="bg-white border rounded-xl p-5 space-y-4">
          <div>
            <Label>Categoria *</Label>
            <Select value={form.category_id} onValueChange={(v) => setForm((p) => ({ ...p, category_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Escolha o tipo de serviço" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Endereço *</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              placeholder="Rua, nº, bairro, cidade"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.scheduled_date} onChange={(e) => setForm((p) => ({ ...p, scheduled_date: e.target.value }))} />
            </div>
            <div>
              <Label>Período</Label>
              <Select value={form.period} onValueChange={(v) => setForm((p) => ({ ...p, period: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PERIODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Veículo necessário</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {VEHICLE_REQUIRED.map((v) => {
                const Icon = v.icon;
                const active = form.vehicle_required === v.value;
                return (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, vehicle_required: v.value }))}
                    className={`border rounded-lg py-2 flex flex-col items-center gap-1 text-xs transition ${active ? "border-2 shadow-sm" : "hover:bg-slate-50"}`}
                    style={active ? { borderColor: "hsl(14 82% 51%)", background: "hsl(14 82% 96%)" } : {}}
                  >
                    <Icon className="h-4 w-4" />
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nome do recebedor</Label>
              <Input value={form.contact_name} onChange={(e) => setForm((p) => ({ ...p, contact_name: e.target.value }))} />
            </div>
            <div>
              <Label>Telefone do recebedor</Label>
              <Input value={form.receiver_phone} onChange={(e) => setForm((p) => ({ ...p, receiver_phone: e.target.value }))} placeholder="(85) 9 9999-9999" />
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Instruções extras, ponto de referência..." />
          </div>

          <Button onClick={submit} className="w-full cgps-btn-primary">
            <Send className="h-4 w-4 mr-1" /> Enviar solicitação
          </Button>
        </div>
      </div>
    </div>
  );
}
