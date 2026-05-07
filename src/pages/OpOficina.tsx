import { useMemo, useState } from "react";
import { Wrench, Plus, Search, Trash2, Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useServiceOrders, useServiceOrderDetails, useMechanics, useParts, type ServiceOrder } from "@/hooks/useOficina";
import { useCompanies, useVehicles } from "@/hooks/useOperacional";

const STATUS_LIST = ["Aberta", "Em execução", "Aguardando peça", "Finalizada", "Cancelada"];
const statusColor: Record<string, string> = {
  "Aberta": "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  "Em execução": "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  "Aguardando peça": "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  "Finalizada": "bg-green-500/10 text-green-700 dark:text-green-300",
  "Cancelada": "bg-red-500/10 text-red-700 dark:text-red-300",
};

function fmtMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function OpOficina() {
  const { items, add, update, remove } = useServiceOrders();
  const { items: mechanics } = useMechanics();
  const { items: companies } = useCompanies();
  const { items: vehicles } = useVehicles();

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [mechFilter, setMechFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [selected, setSelected] = useState<ServiceOrder | null>(null);

  const filtered = useMemo(() => {
    return items.filter(o => {
      if (!o.opened_at.startsWith(month)) return false;
      if (mechFilter !== "all" && o.mechanic_id !== mechFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!(`${o.os_number}`.includes(s) ||
              (o.vehicle_plate || "").toLowerCase().includes(s) ||
              (o.description || "").toLowerCase().includes(s))) return false;
      }
      return true;
    });
  }, [items, month, mechFilter, search]);

  const kpis = useMemo(() => {
    const abertas = filtered.filter(o => o.status === "Aberta").length;
    const exec = filtered.filter(o => o.status === "Em execução" || o.status === "Aguardando peça").length;
    const finalizadas = filtered.filter(o => o.status === "Finalizada").length;
    const total = filtered.length;
    const custo = filtered.filter(o => o.status === "Finalizada").reduce((s, o) => s + Number(o.total_cost || 0), 0);
    return { abertas, exec, finalizadas, total, custo };
  }, [filtered]);

  const mechName = (id: string | null) => mechanics.find(m => m.id === id)?.name || "—";
  const companyName = (id: string | null) => companies.find(c => c.id === id)?.name || "—";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Oficina</h1>
            <p className="text-sm text-muted-foreground">Ordens de serviço, peças e fotos</p>
          </div>
        </div>
        <Button onClick={() => setOpenNew(true)}><Plus className="h-4 w-4 mr-1" /> Nova OS</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Abertas" value={kpis.abertas} />
        <Kpi label="Em execução" value={kpis.exec} />
        <Kpi label="Finalizadas" value={kpis.finalizadas} />
        <Kpi label="Total no mês" value={kpis.total} />
        <Kpi label="Custo finalizadas" value={fmtMoney(kpis.custo)} />
      </div>

      <div className="bg-card border rounded-lg p-3 flex flex-wrap gap-3 items-end">
        <div>
          <Label className="text-xs">Mês</Label>
          <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-[170px]" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs">Buscar</Label>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="OS, placa, descrição" className="pl-8" />
          </div>
        </div>
      </div>

      <Tabs value={mechFilter} onValueChange={setMechFilter}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">Todos</TabsTrigger>
          {mechanics.filter(m => m.is_active).map(m => (
            <TabsTrigger key={m.id} value={m.id}>{m.name}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="bg-card border rounded-lg divide-y">
        {filtered.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">Nenhuma OS no período</div>
        )}
        {filtered.map(o => (
          <button key={o.id} onClick={() => setSelected(o)} className="w-full text-left p-4 hover:bg-muted/40 transition flex items-center gap-4">
            <div className="font-mono text-sm bg-muted px-2 py-1 rounded">#{o.os_number}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium truncate">{o.description || "Sem descrição"}</span>
                <Badge className={statusColor[o.status] || ""} variant="secondary">{o.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {o.vehicle_plate || "—"} · {companyName(o.company_id)} · Mec.: {mechName(o.mechanic_id)} · {new Date(o.opened_at).toLocaleDateString("pt-BR")}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">{fmtMoney(Number(o.total_cost || 0))}</div>
            </div>
          </button>
        ))}
      </div>

      {openNew && <NewOsDialog onClose={() => setOpenNew(false)} onCreate={async (input) => { const r = await add(input); if (r) { setOpenNew(false); setSelected(r as ServiceOrder); } }} />}
      {selected && <OsDetailDialog os={selected} onClose={() => setSelected(null)} onUpdate={(p) => update(selected.id, p)} onDelete={() => { remove(selected.id); setSelected(null); }} />}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-card border rounded-lg p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}

function NewOsDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (input: Partial<ServiceOrder>) => void }) {
  const { items: companies } = useCompanies();
  const { items: vehicles } = useVehicles();
  const { items: mechanics } = useMechanics();
  const [form, setForm] = useState<Partial<ServiceOrder>>({
    status: "Aberta",
    opened_at: new Date().toISOString().slice(0, 10),
  });
  const setF = (p: Partial<ServiceOrder>) => setForm(prev => ({ ...prev, ...p }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Nova Ordem de Serviço</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Cliente / Empresa</Label>
            <Select value={form.company_id || ""} onValueChange={v => setF({ company_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Mecânico</Label>
            <Select value={form.mechanic_id || ""} onValueChange={v => setF({ mechanic_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{mechanics.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Veículo (frota)</Label>
            <Select value={form.vehicle_id || ""} onValueChange={v => {
              const veh = vehicles.find(x => x.id === v);
              setF({ vehicle_id: v, vehicle_plate: veh?.plate || form.vehicle_plate, vehicle_model: veh?.model || form.vehicle_model });
            }}>
              <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
              <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.plate} · {v.model}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Placa</Label>
            <Input value={form.vehicle_plate || ""} onChange={e => setF({ vehicle_plate: e.target.value.toUpperCase() })} />
          </div>
          <div>
            <Label>Modelo</Label>
            <Input value={form.vehicle_model || ""} onChange={e => setF({ vehicle_model: e.target.value })} />
          </div>
          <div>
            <Label>Data abertura</Label>
            <Input type="date" value={form.opened_at || ""} onChange={e => setF({ opened_at: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Descrição do problema</Label>
            <Textarea value={form.description || ""} onChange={e => setF({ description: e.target.value })} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onCreate(form)}>Criar OS</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OsDetailDialog({ os, onClose, onUpdate, onDelete }: { os: ServiceOrder; onClose: () => void; onUpdate: (p: Partial<ServiceOrder>) => void; onDelete: () => void }) {
  const { parts, photos, addPart, removePart, uploadPhoto, removePhoto } = useServiceOrderDetails(os.id);
  const { items: partsCatalog } = useParts();
  const { items: mechanics } = useMechanics();
  const { items: companies } = useCompanies();

  const [status, setStatus] = useState(os.status);
  const [diagnosis, setDiagnosis] = useState(os.diagnosis || "");
  const [notes, setNotes] = useState(os.notes || "");

  const [partName, setPartName] = useState(""); const [qty, setQty] = useState("1"); const [price, setPrice] = useState("0");

  const total = parts.reduce((s, p) => s + Number(p.quantity) * Number(p.unit_price), 0);

  const saveHeader = () => {
    onUpdate({
      status,
      diagnosis,
      notes,
      finished_at: status === "Finalizada" ? (os.finished_at || new Date().toISOString().slice(0, 10)) : null,
    });
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>, type: "antes" | "depois") => {
    const f = e.target.files?.[0]; if (!f) return;
    await uploadPhoto(f, type);
    e.target.value = "";
  };

  const exportPdf = () => {
    const w = window.open("", "_blank"); if (!w) return;
    const mech = mechanics.find(m => m.id === os.mechanic_id)?.name || "—";
    const comp = companies.find(c => c.id === os.company_id)?.name || "—";
    const partsRows = parts.map(p => `<tr><td>${p.part_name}</td><td style="text-align:center">${p.quantity}</td><td style="text-align:right">${fmtMoney(Number(p.unit_price))}</td><td style="text-align:right">${fmtMoney(Number(p.quantity) * Number(p.unit_price))}</td></tr>`).join("");
    const photosHtml = photos.map(p => `<div style="display:inline-block;margin:4px;text-align:center"><img src="${p.photo_url}" style="max-width:200px;max-height:160px;border:1px solid #ccc"/><div style="font-size:11px">${p.photo_type}</div></div>`).join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>OS #${os.os_number}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;color:#222}h1{margin:0 0 4px}h2{font-size:14px;margin:16px 0 6px;border-bottom:1px solid #ddd;padding-bottom:4px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:6px}th{background:#f2f2f2;text-align:left}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px}.f{padding:6px;background:#f7f7f7;border-radius:4px}</style></head><body>
      <h1>Ordem de Serviço #${os.os_number}</h1>
      <div style="font-size:12px;color:#666">Aberta em ${new Date(os.opened_at).toLocaleDateString("pt-BR")} · Status: <b>${status}</b></div>
      <h2>Dados</h2>
      <div class="grid">
        <div class="f"><b>Cliente:</b> ${comp}</div>
        <div class="f"><b>Mecânico:</b> ${mech}</div>
        <div class="f"><b>Placa:</b> ${os.vehicle_plate || "—"}</div>
        <div class="f"><b>Modelo:</b> ${os.vehicle_model || "—"}</div>
      </div>
      <h2>Descrição</h2><div>${(os.description || "—").replace(/\n/g, "<br>")}</div>
      <h2>Diagnóstico</h2><div>${(diagnosis || "—").replace(/\n/g, "<br>")}</div>
      <h2>Peças / Itens</h2>
      <table><thead><tr><th>Item</th><th>Qtd</th><th>Unit.</th><th>Total</th></tr></thead><tbody>${partsRows || '<tr><td colspan="4" style="text-align:center">Sem itens</td></tr>'}</tbody>
      <tfoot><tr><th colspan="3" style="text-align:right">Total</th><th style="text-align:right">${fmtMoney(total)}</th></tr></tfoot></table>
      ${photos.length ? `<h2>Fotos</h2><div>${photosHtml}</div>` : ""}
      ${notes ? `<h2>Observações</h2><div>${notes.replace(/\n/g, "<br>")}</div>` : ""}
      <script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
      </body></html>`);
    w.document.close();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono bg-muted px-2 py-1 rounded text-sm">#{os.os_number}</span>
            Ordem de Serviço
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_LIST.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="text-sm pt-6">
            <div><b>Cliente:</b> {companies.find(c => c.id === os.company_id)?.name || "—"}</div>
            <div><b>Veículo:</b> {os.vehicle_plate || "—"} · {os.vehicle_model || "—"}</div>
            <div><b>Mecânico:</b> {mechanics.find(m => m.id === os.mechanic_id)?.name || "—"}</div>
          </div>
          <div className="md:col-span-2">
            <Label>Descrição</Label>
            <div className="text-sm bg-muted/40 rounded p-2">{os.description || "—"}</div>
          </div>
          <div className="md:col-span-2">
            <Label>Diagnóstico / Serviço executado</Label>
            <Textarea rows={3} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Observações</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="border-t pt-3">
          <h3 className="font-medium mb-2">Peças / Itens</h3>
          <div className="grid grid-cols-[1fr_80px_120px_auto] gap-2 mb-2">
            <Input list="parts-catalog" placeholder="Peça/serviço" value={partName} onChange={e => {
              setPartName(e.target.value);
              const found = partsCatalog.find(p => p.name === e.target.value);
              if (found) setPrice(String(found.default_price));
            }} />
            <datalist id="parts-catalog">{partsCatalog.map(p => <option key={p.id} value={p.name} />)}</datalist>
            <Input type="number" step="0.5" min="0" value={qty} onChange={e => setQty(e.target.value)} />
            <Input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="Valor" />
            <Button onClick={() => { if (!partName) return; addPart({ part_name: partName, quantity: Number(qty), unit_price: Number(price) }); setPartName(""); setQty("1"); setPrice("0"); }}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="border rounded divide-y text-sm">
            {parts.length === 0 && <div className="p-3 text-center text-muted-foreground text-xs">Nenhum item</div>}
            {parts.map(p => (
              <div key={p.id} className="p-2 flex items-center gap-2">
                <div className="flex-1">{p.part_name}</div>
                <div className="w-12 text-center text-xs">{p.quantity}x</div>
                <div className="w-24 text-right text-xs">{fmtMoney(Number(p.unit_price))}</div>
                <div className="w-24 text-right font-medium">{fmtMoney(Number(p.quantity) * Number(p.unit_price))}</div>
                <Button variant="ghost" size="icon" onClick={() => removePart(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            {parts.length > 0 && (
              <div className="p-2 flex justify-end font-semibold bg-muted/30">Total: {fmtMoney(total)}</div>
            )}
          </div>
        </div>

        <div className="border-t pt-3">
          <h3 className="font-medium mb-2">Fotos</h3>
          <div className="flex gap-2 mb-2">
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={e => handlePhoto(e, "antes")} />
              <span className="inline-flex items-center gap-1 text-xs px-3 py-2 border rounded hover:bg-muted"><Upload className="h-3 w-3" /> Antes</span>
            </label>
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={e => handlePhoto(e, "depois")} />
              <span className="inline-flex items-center gap-1 text-xs px-3 py-2 border rounded hover:bg-muted"><Upload className="h-3 w-3" /> Depois</span>
            </label>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {photos.map(p => (
              <div key={p.id} className="relative group">
                <img src={p.photo_url} alt={p.photo_type} className="w-full h-24 object-cover rounded border" />
                <span className="absolute bottom-1 left-1 text-[10px] bg-black/70 text-white px-1 rounded">{p.photo_type}</span>
                <button onClick={() => removePhoto(p.id)} className="absolute top-1 right-1 bg-black/70 text-white rounded p-0.5 opacity-0 group-hover:opacity-100">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={exportPdf}><FileText className="h-4 w-4 mr-1" /> Exportar PDF</Button>
          <Button variant="destructive" onClick={() => { if (confirm("Excluir esta OS?")) onDelete(); }}>Excluir</Button>
          <Button onClick={() => { saveHeader(); onClose(); }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
