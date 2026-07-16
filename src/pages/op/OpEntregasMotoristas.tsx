import { useState } from "react";
import { Plus, Pencil, Trash2, Phone, Bike, Car } from "lucide-react";
import EntregasNav from "./EntregasNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useDrivers, type Driver } from "@/hooks/useOperacional";

const VEHICLE_TYPES = ["Moto", "Carro", "Van", "Caminhão"];

export default function OpEntregasMotoristas() {
  const { items, loading, add, update, remove } = useDrivers();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [form, setForm] = useState<Partial<Driver>>({});

  const openNew = () => { setEditing(null); setForm({ default_vehicle_type: "Moto", is_active: true }); setModalOpen(true); };
  const openEdit = (d: Driver) => { setEditing(d); setForm({ ...d }); setModalOpen(true); };

  const submit = async () => {
    if (!form.name?.trim()) return;
    if (editing) await update(editing.id, form);
    else await add(form);
    setModalOpen(false);
  };

  return (
    <div className="cgps-scope min-h-screen bg-[hsl(var(--cgps-muted))]">
      <EntregasNav />
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "hsl(191 74% 20%)" }}>Motoristas</h1>
            <p className="text-sm text-muted-foreground">Cadastro dos motoristas que aparecem no Kanban</p>
          </div>
          <Button onClick={openNew} className="cgps-btn-primary">
            <Plus className="h-4 w-4 mr-1" /> Novo motorista
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 bg-white border rounded-lg text-muted-foreground">
            Nenhum motorista cadastrado ainda.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {items.map(d => (
              <div key={d.id} className="bg-white border rounded-lg p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-base">{d.name}</div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      {d.default_vehicle_type === "Moto" ? <Bike className="h-3.5 w-3.5" /> : <Car className="h-3.5 w-3.5" />}
                      <span>{d.default_vehicle_type}</span>
                      {d.phone && <><Phone className="h-3.5 w-3.5" /><span>{d.phone}</span></>}
                    </div>
                  </div>
                  {d.is_active ? (
                    <Badge className="bg-emerald-100 text-emerald-800 border-0">Ativo</Badge>
                  ) : (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                </div>
                <div className="flex gap-2 border-t pt-3">
                  <Button variant="outline" size="sm" onClick={() => openEdit(d)} className="flex-1">
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { if (confirm(`Remover ${d.name}?`)) remove(d.id); }} className="text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar motorista" : "Novo motorista"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Nome *</Label>
              <Input value={form.name || ""} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.phone || ""} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(85) 9 9999-9999" />
            </div>
            <div>
              <Label>Tipo de veículo</Label>
              <Select value={form.default_vehicle_type || "Moto"} onValueChange={v => setForm(p => ({ ...p, default_vehicle_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{VEHICLE_TYPES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>PIN (4 a 6 dígitos)</Label>
              <Input inputMode="numeric" maxLength={6} value={form.pin || ""} onChange={e => setForm(p => ({ ...p, pin: e.target.value.replace(/\D/g, "") }))} placeholder="ex.: 1234" />
              <p className="text-xs text-muted-foreground mt-1">Usado pelo motorista para entrar no módulo de entregas.</p>
            </div>
            <div className="flex items-center justify-between border rounded-md p-3">
              <div>
                <div className="text-sm font-medium">Ativo</div>
                <div className="text-xs text-muted-foreground">Aparece como coluna no Kanban</div>
              </div>
              <Switch checked={form.is_active ?? true} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={submit} className="cgps-btn-primary">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
