import { useState } from "react";
import { Plus, Pencil, Trash2, Package, PackageOpen, ClipboardCheck, Truck, Bike, Car, Wrench, Camera, MapPin, ShoppingBag, Box, GripVertical } from "lucide-react";
import EntregasNav from "./EntregasNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useDeliveryCategories, type DeliveryCategory } from "@/hooks/useDeliveryCategories";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, any> = {
  Package, PackageOpen, ClipboardCheck, Truck, Bike, Car, Wrench, Camera, MapPin, ShoppingBag, Box,
};
const ICON_OPTIONS = Object.keys(ICON_MAP);

const COLOR_PALETTE = [
  "#0d4a56", "#e8531f", "#0284c7", "#059669", "#7c3aed", "#db2777",
  "#dc2626", "#ea580c", "#ca8a04", "#4d7c0f", "#0891b2", "#475569",
];

function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] || Package;
  return <Icon className={className} />;
}

export default function OpEntregasCategorias() {
  const { items, loading, add, update, remove } = useDeliveryCategories();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DeliveryCategory | null>(null);
  const [form, setForm] = useState<Partial<DeliveryCategory>>({});

  const openNew = () => { setEditing(null); setForm({ color: "#0d4a56", icon: "Package", is_active: true }); setModalOpen(true); };
  const openEdit = (c: DeliveryCategory) => { setEditing(c); setForm({ ...c }); setModalOpen(true); };

  const submit = async () => {
    if (!form.name?.trim()) return;
    if (editing) await update(editing.id, form);
    else await add(form);
    setModalOpen(false);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const target = items[idx + dir];
    if (!target) return;
    update(items[idx].id, { sort_order: target.sort_order });
    update(target.id, { sort_order: items[idx].sort_order });
  };

  return (
    <div className="cgps-scope min-h-screen bg-[hsl(var(--cgps-muted))]">
      <EntregasNav />
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "hsl(191 74% 20%)" }}>Categorias de serviço</h1>
            <p className="text-sm text-muted-foreground">Tipos de demanda que aparecem no cadastro e nos cards</p>
          </div>
          <Button onClick={openNew} className="cgps-btn-primary">
            <Plus className="h-4 w-4 mr-1" /> Nova categoria
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 bg-white border rounded-lg text-muted-foreground">
            Nenhuma categoria cadastrada ainda.
          </div>
        ) : (
          <div className="bg-white border rounded-lg divide-y">
            {items.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 p-3">
                <div className="flex flex-col text-muted-foreground">
                  <button className="hover:text-foreground disabled:opacity-30" onClick={() => move(i, -1)} disabled={i === 0}>▲</button>
                  <button className="hover:text-foreground disabled:opacity-30" onClick={() => move(i, 1)} disabled={i === items.length - 1}>▼</button>
                </div>
                <div
                  className="h-10 w-10 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ background: c.color + "22", color: c.color }}
                >
                  <CategoryIcon name={c.icon} className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium flex items-center gap-2">
                    {c.name}
                    {!c.is_active && <Badge variant="secondary" className="text-[10px]">Inativa</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">{c.color} · {c.icon}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => { if (confirm(`Remover "${c.name}"?`)) remove(c.id); }} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Nome *</Label>
              <Input value={form.name || ""} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label>Cor do badge</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {COLOR_PALETTE.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, color: c }))}
                    className={cn("h-8 w-8 rounded-md border-2 transition", form.color === c ? "border-foreground scale-110" : "border-transparent")}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label>Ícone</Label>
              <div className="grid grid-cols-6 gap-2 mt-2">
                {ICON_OPTIONS.map(name => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, icon: name }))}
                    className={cn("h-11 rounded-md border flex items-center justify-center transition",
                      form.icon === name ? "border-foreground bg-muted" : "border-border hover:bg-muted")}
                    title={name}
                  >
                    <CategoryIcon name={name} className="h-5 w-5" />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between border rounded-md p-3">
              <div>
                <div className="text-sm font-medium">Ativa</div>
                <div className="text-xs text-muted-foreground">Aparece no select de nova entrega</div>
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
