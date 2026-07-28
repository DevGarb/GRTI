import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Users, Building2, Car, Plus, Wrench, Package, HardHat, UserCheck, Layers } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useDrivers, useCompanies, useVehicles } from "@/hooks/useOperacional";
import { useMechanics, useParts } from "@/hooks/useOficina";
import { OFICINA_ROLES, oficinaRoleInfo } from "@/lib/oficinaRoles";
import { useMaintTechnicians } from "@/hooks/useMaintTechnicians";
import { useDeliveryRequesters } from "@/hooks/useDeliveryRequesters";
import { useOrgProfiles } from "@/hooks/useOrgProfiles";
import { useSectors, useCreateSector, useUpdateSector, useDeleteSector } from "@/hooks/useSectors";
import { useAuth } from "@/contexts/AuthContext";

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
          <TabsTrigger value="requesters"><UserCheck className="h-4 w-4 mr-1" /> Solicitantes</TabsTrigger>
          <TabsTrigger value="sectors"><Layers className="h-4 w-4 mr-1" /> Setores</TabsTrigger>
          <TabsTrigger value="companies"><Building2 className="h-4 w-4 mr-1" /> Empresas</TabsTrigger>
          <TabsTrigger value="workshop_companies"><Building2 className="h-4 w-4 mr-1" /> Empresas (Oficina)</TabsTrigger>
          <TabsTrigger value="vehicles"><Car className="h-4 w-4 mr-1" /> Veículos</TabsTrigger>
          <TabsTrigger value="mechanics"><Wrench className="h-4 w-4 mr-1" /> Mecânicos (Oficina)</TabsTrigger>
          <TabsTrigger value="maint_tech"><HardHat className="h-4 w-4 mr-1" /> Técnicos Manutenção</TabsTrigger>
          <TabsTrigger value="parts"><Package className="h-4 w-4 mr-1" /> Peças</TabsTrigger>
        </TabsList>
        <TabsContent value="drivers"><DriversTab /></TabsContent>
        <TabsContent value="requesters"><RequestersTab /></TabsContent>
        <TabsContent value="sectors"><SectorsTab /></TabsContent>
        <TabsContent value="companies"><CompaniesTab /></TabsContent>
        <TabsContent value="vehicles"><VehiclesTab /></TabsContent>
        <TabsContent value="mechanics"><MechanicsTab /></TabsContent>
        <TabsContent value="maint_tech"><MaintTechniciansTab /></TabsContent>
        <TabsContent value="parts"><PartsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function SectorsTab() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id || null;
  const { data: sectors = [] } = useSectors(orgId);
  const createSector = useCreateSector();
  const updateSector = useUpdateSector();
  const deleteSector = useDeleteSector();
  const [name, setName] = useState("");

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-sky-50 text-sky-900 px-3 py-2 text-xs">
        Setores cadastrados aqui aparecem na abertura de OMs de <strong>Manutenção Predial</strong> e são obrigatórios na solicitação.
      </div>
      <div className="bg-card border rounded-lg p-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <div><Label>Nome do setor</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Financeiro, RH, Almoxarifado" /></div>
        <div className="flex items-end">
          <Button onClick={() => {
            if (!name.trim()) return;
            createSector.mutate({ name: name.trim(), organization_id: orgId }, { onSuccess: () => setName("") });
          }} disabled={createSector.isPending}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
      </div>
      <div className="bg-card border rounded-lg divide-y">
        {sectors.length === 0 && <div className="p-8 text-center text-muted-foreground">Nenhum setor cadastrado</div>}
        {sectors.map(s => (
          <div key={s.id} className="p-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="font-medium">{s.name}</div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={s.is_active} onCheckedChange={(v) => updateSector.mutate({ id: s.id, is_active: v })} />
              <span className="text-xs text-muted-foreground">Ativo</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Remover ${s.name}?`)) deleteSector.mutate(s.id); }}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function RequestersTab() {
  const { items, add, update, remove } = useDeliveryRequesters();
  const orgProfiles = useOrgProfiles();
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [pin, setPin] = useState(""); const [userId, setUserId] = useState<string>("");
  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-sky-50 text-sky-900 px-3 py-2 text-xs">
        Solicitantes cadastrados aqui podem abrir pedidos tanto em <strong>Entregas</strong> quanto em <strong>Manutenção Predial</strong> — o mesmo PIN vale para os dois módulos.
      </div>
      <div className="bg-card border rounded-lg p-4 grid gap-3 md:grid-cols-[1fr_160px_140px_1fr_auto]">
        <div><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do solicitante" /></div>
        <div><Label>Telefone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" /></div>
        <div><Label>PIN (4-6 dígitos)</Label><Input inputMode="numeric" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} placeholder="ex.: 4444" /></div>
        <div><Label>Usuário do sistema</Label>
          <Select value={userId || "none"} onValueChange={(v) => setUserId(v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {orgProfiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || p.email || p.username}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={() => {
            if (!name) return;
            if (pin && !/^[0-9]{4,6}$/.test(pin)) return alert("PIN deve ter 4 a 6 dígitos");
            add({ name, phone, pin: pin || null, user_id: userId || null, is_active: true });
            setName(""); setPhone(""); setPin(""); setUserId("");
          }}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
      </div>
      <div className="bg-card border rounded-lg divide-y">
        {items.length === 0 && <div className="p-8 text-center text-muted-foreground">Nenhum solicitante cadastrado</div>}
        {items.map(r => {
          const linkedUser = orgProfiles.find(p => p.user_id === r.user_id);
          return (
            <div key={r.id} className="p-3 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <div className="font-medium flex items-center gap-2">
                  {r.name}
                  {r.pin && <span className="text-[10px] font-mono px-1.5 py-0.5 bg-muted rounded">PIN {r.pin}</span>}
                  {!r.is_active && <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded">Inativo</span>}
                </div>
                <div className="text-xs text-muted-foreground">{r.phone || "—"}{linkedUser ? ` · usuário: ${linkedUser.full_name}` : ""}</div>
              </div>
              <Input
                className="w-28 h-8"
                inputMode="numeric" maxLength={6}
                defaultValue={r.pin || ""}
                placeholder="PIN"
                onBlur={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  if ((v || null) !== (r.pin || null)) update(r.id, { pin: v || null });
                }}
              />
              <Select value={r.user_id || "none"} onValueChange={(v) => update(r.id, { user_id: v === "none" ? null : v })}>
                <SelectTrigger className="w-52 h-8"><SelectValue placeholder="Vincular usuário" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem vínculo</SelectItem>
                  {orgProfiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || p.email || p.username}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Switch checked={r.is_active} onCheckedChange={(v) => update(r.id, { is_active: v })} />
                <span className="text-xs text-muted-foreground">Ativo</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Remover ${r.name}?`)) remove(r.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          );
        })}
      </div>
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

function CompaniesTab({ workshop = false }: { workshop?: boolean }) {
  const { items, add, update, remove } = useCompanies();
  const [name, setName] = useState(""); const [contact, setContact] = useState(""); const [phone, setPhone] = useState("");
  const list = workshop ? items.filter(c => c.is_workshop) : items;
  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-sky-50 text-sky-900 px-3 py-2 text-xs">
        {workshop
          ? <>Empresas cadastradas aqui aparecem <strong>somente</strong> nas ordens de serviço da <strong>Oficina</strong>.</>
          : <>Empresas cadastradas aqui aparecem em <strong>Entregas</strong> e <strong>Manutenção Predial</strong>. Para a Oficina, use a aba <strong>Empresas (Oficina)</strong>.</>}
      </div>
      <div className="bg-card border rounded-lg p-4 grid gap-3 md:grid-cols-[1fr_1fr_180px_auto]">
        <div><Label>Empresa</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome" /></div>
        <div><Label>Contato</Label><Input value={contact} onChange={e => setContact(e.target.value)} placeholder="Pessoa de contato" /></div>
        <div><Label>Telefone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" /></div>
        <div className="flex items-end">
          <Button onClick={() => { if (!name) return; add({ name, contact_name: contact, contact_phone: phone, is_workshop: workshop }); setName(""); setContact(""); setPhone(""); }}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
      </div>
      <div className="bg-card border rounded-lg divide-y">
        {list.length === 0 && <div className="p-8 text-center text-muted-foreground">Nenhuma empresa cadastrada</div>}
        {list.map(c => (
          <div key={c.id} className="p-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-muted-foreground">{c.contact_name || "—"} · {c.contact_phone || "—"}</div>
            </div>
            {!workshop && (
              <div className="flex items-center gap-2">
                <Switch checked={!!c.is_workshop} onCheckedChange={(v) => update(c.id, { is_workshop: v })} />
                <span className="text-xs text-muted-foreground">Oficina</span>
              </div>
            )}
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

function MechanicsTab() {
  const { items, add, update, remove } = useMechanics();
  const orgProfiles = useOrgProfiles();
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [specialty, setSpecialty] = useState(""); const [userId, setUserId] = useState<string>(""); const [pin, setPin] = useState(""); const [role, setRole] = useState("mecanico");
  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-lg p-4 grid gap-3 md:grid-cols-[1fr_140px_1fr_1fr_120px_160px_auto]">
        <div><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do mecânico" /></div>
        <div><Label>Telefone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
        <div><Label>Especialidade</Label><Input value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="Ex.: Elétrica, hidráulica" /></div>
        <div><Label>Usuário do sistema</Label>
          <Select value={userId || "none"} onValueChange={(v) => setUserId(v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {orgProfiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || p.email || p.username}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>PIN (Oficina)</Label><Input inputMode="numeric" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} placeholder="ex.: 1234" /></div>
        <div><Label>Função</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {OFICINA_ROLES.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={() => { if (!name) return; add({ name, phone, specialty, user_id: userId || null, pin: pin || null, role } as any); setName(""); setPhone(""); setSpecialty(""); setUserId(""); setPin(""); setRole("mecanico"); }}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
      </div>
      <div className="bg-card border rounded-lg divide-y">
        {items.length === 0 && <div className="p-8 text-center text-muted-foreground">Nenhum mecânico cadastrado</div>}
        {items.map(m => {
          const linkedUser = orgProfiles.find(p => p.user_id === m.user_id);
          return (
            <div key={m.id} className="p-3 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <div className="font-medium flex items-center gap-1 flex-wrap">{m.name}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{oficinaRoleInfo((m as any).role || "mecanico").label}</span>
                  {m.pin && <span className="text-[10px] font-mono px-1.5 py-0.5 bg-muted rounded">PIN {m.pin}</span>}</div>
                <div className="text-xs text-muted-foreground">{m.phone || "—"}{m.specialty ? ` · ${m.specialty}` : ""}{linkedUser ? ` · usuário: ${linkedUser.full_name}` : ""}</div>
              </div>
              <Input
                className="w-28 h-8"
                inputMode="numeric" maxLength={6}
                defaultValue={m.pin || ""}
                placeholder="PIN"
                onBlur={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  if ((v || null) !== (m.pin || null)) update(m.id, { pin: v || null } as any);
                }}
              />
              <Select value={(m as any).role || "mecanico"} onValueChange={(v) => update(m.id, { role: v } as any)}>
                <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OFICINA_ROLES.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={m.user_id || "none"} onValueChange={(v) => update(m.id, { user_id: v === "none" ? null : v })}>
                <SelectTrigger className="w-52 h-8"><SelectValue placeholder="Vincular usuário" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem vínculo</SelectItem>
                  {orgProfiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || p.email || p.username}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PartsTab() {
  const { items, add, remove } = useParts();
  const [name, setName] = useState(""); const [code, setCode] = useState(""); const [price, setPrice] = useState("0");
  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-lg p-4 grid gap-3 md:grid-cols-[1fr_180px_140px_auto]">
        <div><Label>Nome da peça</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Pastilha de freio" /></div>
        <div><Label>Código</Label><Input value={code} onChange={e => setCode(e.target.value)} placeholder="Opcional" /></div>
        <div><Label>Preço padrão</Label><Input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} /></div>
        <div className="flex items-end">
          <Button onClick={() => { if (!name) return; add({ name, code, default_price: Number(price) }); setName(""); setCode(""); setPrice("0"); }}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
      </div>
      <div className="bg-card border rounded-lg divide-y">
        {items.length === 0 && <div className="p-8 text-center text-muted-foreground">Nenhuma peça cadastrada</div>}
        {items.map(p => (
          <div key={p.id} className="p-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-muted-foreground">{p.code || "—"} · R$ {Number(p.default_price).toFixed(2)}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MaintTechniciansTab() {
  const { items, add, update, remove } = useMaintTechnicians();
  const orgProfiles = useOrgProfiles();
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [specialty, setSpecialty] = useState(""); const [userId, setUserId] = useState<string>(""); const [pin, setPin] = useState("");
  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-amber-50 text-amber-900 px-3 py-2 text-xs">
        Estes técnicos aparecem apenas no módulo <strong>Manutenção Predial</strong>. Para mecânicos da Oficina, use a aba anterior.
      </div>
      <div className="bg-card border rounded-lg p-4 grid gap-3 md:grid-cols-[1fr_160px_1fr_1fr_140px_auto]">
        <div><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do técnico" /></div>
        <div><Label>Telefone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
        <div><Label>Especialidade</Label><Input value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="Ex.: Elétrica, hidráulica" /></div>
        <div><Label>Usuário do sistema</Label>
          <Select value={userId || "none"} onValueChange={(v) => setUserId(v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {orgProfiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || p.email || p.username}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>PIN (Manutenção)</Label><Input inputMode="numeric" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} placeholder="ex.: 1234" /></div>
        <div className="flex items-end">
          <Button onClick={() => { if (!name) return; add({ name, phone, specialty, user_id: userId || null, pin: pin || null }); setName(""); setPhone(""); setSpecialty(""); setUserId(""); setPin(""); }}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
      </div>
      <div className="bg-card border rounded-lg divide-y">
        {items.length === 0 && <div className="p-8 text-center text-muted-foreground">Nenhum técnico cadastrado</div>}
        {items.map(m => {
          const linkedUser = orgProfiles.find(p => p.user_id === m.user_id);
          return (
            <div key={m.id} className="p-3 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <div className="font-medium">{m.name} {m.pin && <span className="ml-1 text-[10px] font-mono px-1.5 py-0.5 bg-muted rounded">PIN {m.pin}</span>}</div>
                <div className="text-xs text-muted-foreground">{m.phone || "—"}{m.specialty ? ` · ${m.specialty}` : ""}{linkedUser ? ` · usuário: ${linkedUser.full_name}` : ""}</div>
              </div>
              <Input
                className="w-28 h-8"
                inputMode="numeric" maxLength={6}
                defaultValue={m.pin || ""}
                placeholder="PIN"
                onBlur={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  if ((v || null) !== (m.pin || null)) update(m.id, { pin: v || null });
                }}
              />
              <Select value={m.user_id || "none"} onValueChange={(v) => update(m.id, { user_id: v === "none" ? null : v })}>
                <SelectTrigger className="w-52 h-8"><SelectValue placeholder="Vincular usuário" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem vínculo</SelectItem>
                  {orgProfiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || p.email || p.username}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

