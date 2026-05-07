import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Users, Building2, Car, Plus, Wrench, Package } from "lucide-react";
import { useDrivers, useCompanies, useVehicles } from "@/hooks/useOperacional";
import { useMechanics, useParts } from "@/hooks/useOficina";

export default function OpCadastros() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Cadastros</h1>
          <p className="text-sm text-muted-foreground">Motoristas, empresas e veículos</p>
        </div>
      </div>

      <Tabs defaultValue="drivers">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="drivers"><Users className="h-4 w-4 mr-1" /> Motoristas</TabsTrigger>
          <TabsTrigger value="companies"><Building2 className="h-4 w-4 mr-1" /> Empresas</TabsTrigger>
          <TabsTrigger value="vehicles"><Car className="h-4 w-4 mr-1" /> Veículos</TabsTrigger>
          <TabsTrigger value="mechanics"><Wrench className="h-4 w-4 mr-1" /> Mecânicos</TabsTrigger>
          <TabsTrigger value="parts"><Package className="h-4 w-4 mr-1" /> Peças</TabsTrigger>
        </TabsList>
        <TabsContent value="drivers"><DriversTab /></TabsContent>
        <TabsContent value="companies"><CompaniesTab /></TabsContent>
        <TabsContent value="vehicles"><VehiclesTab /></TabsContent>
        <TabsContent value="mechanics"><MechanicsTab /></TabsContent>
        <TabsContent value="parts"><PartsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function DriversTab() {
  const { items, add, remove } = useDrivers();
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [type, setType] = useState("Moto");
  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-lg p-4 grid gap-3 md:grid-cols-[1fr_200px_140px_auto]">
        <div><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do motorista" /></div>
        <div><Label>Telefone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" /></div>
        <div><Label>Veículo</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="Moto">Moto</SelectItem><SelectItem value="Carro">Carro</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={() => { if (!name) return; add({ name, phone, default_vehicle_type: type }); setName(""); setPhone(""); }}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
      </div>
      <div className="bg-card border rounded-lg divide-y">
        {items.length === 0 && <div className="p-8 text-center text-muted-foreground">Nenhum motorista cadastrado</div>}
        {items.map(d => (
          <div key={d.id} className="p-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="font-medium">{d.name}</div>
              <div className="text-xs text-muted-foreground">{d.phone || "—"} · {d.default_vehicle_type}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompaniesTab() {
  const { items, add, remove } = useCompanies();
  const [name, setName] = useState(""); const [contact, setContact] = useState(""); const [phone, setPhone] = useState("");
  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-lg p-4 grid gap-3 md:grid-cols-[1fr_1fr_180px_auto]">
        <div><Label>Empresa</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome" /></div>
        <div><Label>Contato</Label><Input value={contact} onChange={e => setContact(e.target.value)} placeholder="Pessoa de contato" /></div>
        <div><Label>Telefone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" /></div>
        <div className="flex items-end">
          <Button onClick={() => { if (!name) return; add({ name, contact_name: contact, contact_phone: phone }); setName(""); setContact(""); setPhone(""); }}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
      </div>
      <div className="bg-card border rounded-lg divide-y">
        {items.length === 0 && <div className="p-8 text-center text-muted-foreground">Nenhuma empresa cadastrada</div>}
        {items.map(c => (
          <div key={c.id} className="p-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-muted-foreground">{c.contact_name || "—"} · {c.contact_phone || "—"}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function VehiclesTab() {
  const { items, add, remove } = useVehicles();
  const [plate, setPlate] = useState(""); const [model, setModel] = useState(""); const [type, setType] = useState("Moto");
  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-lg p-4 grid gap-3 md:grid-cols-[180px_1fr_140px_auto]">
        <div><Label>Placa</Label><Input value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} placeholder="ABC1D23" /></div>
        <div><Label>Modelo</Label><Input value={model} onChange={e => setModel(e.target.value)} placeholder="CG 160 Titan" /></div>
        <div><Label>Tipo</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="Moto">Moto</SelectItem><SelectItem value="Carro">Carro</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={() => { if (!plate) return; add({ plate, model, vehicle_type: type }); setPlate(""); setModel(""); }}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
      </div>
      <div className="bg-card border rounded-lg divide-y">
        {items.length === 0 && <div className="p-8 text-center text-muted-foreground">Nenhum veículo cadastrado</div>}
        {items.map(v => (
          <div key={v.id} className="p-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="font-medium">{v.plate} <span className="text-xs text-muted-foreground font-normal">· {v.vehicle_type}</span></div>
              <div className="text-xs text-muted-foreground">{v.model || "—"}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(v.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
