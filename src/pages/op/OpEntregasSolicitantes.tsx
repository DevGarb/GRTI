import { useState } from "react";
import { Plus, Pencil, Trash2, Phone, User, KeyRound } from "lucide-react";
import EntregasNav from "./EntregasNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useDeliveryRequesters, type DeliveryRequester } from "@/hooks/useDeliveryRequesters";
import { useOrgProfiles } from "@/hooks/useOrgProfiles";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function OpEntregasSolicitantes() {
  const { items, loading, add, update, remove } = useDeliveryRequesters();
  const orgProfiles = useOrgProfiles();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DeliveryRequester | null>(null);
  const [form, setForm] = useState<Partial<DeliveryRequester>>({});

  const openNew = () => { setEditing(null); setForm({ is_active: true }); setOpen(true); };
  const openEdit = (r: DeliveryRequester) => { setEditing(r); setForm({ ...r }); setOpen(true); };
  const submit = async () => {
    if (!form.name?.trim()) return;
    if (form.pin && !/^[0-9]{4,6}$/.test(form.pin)) {
      return alert("PIN deve ter 4 a 6 dígitos");
    }
    if (editing) await update(editing.id, form);
    else await add(form);
    setOpen(false);
  };

  return (
    <div className="cgps-scope min-h-screen bg-[hsl(var(--cgps-muted))]">
      <EntregasNav />
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "hsl(191 74% 20%)" }}>Solicitantes</h1>
            <p className="text-sm text-muted-foreground">Quem pode abrir pedidos de entrega usando PIN</p>
          </div>
          <Button onClick={openNew} className="cgps-btn-primary">
            <Plus className="h-4 w-4 mr-1" /> Novo solicitante
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 bg-white border rounded-lg text-muted-foreground">
            Nenhum solicitante cadastrado.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {items.map((r) => (
              <div key={r.id} className="bg-white border rounded-lg p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold flex items-center gap-1.5"><User className="h-4 w-4" />{r.name}</div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      {r.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{r.phone}</span>}
                      <span className="flex items-center gap-1"><KeyRound className="h-3 w-3" />{r.pin ? "PIN definido" : "sem PIN"}</span>
                    </div>
                  </div>
                  {r.is_active
                    ? <Badge className="bg-emerald-100 text-emerald-800 border-0">Ativo</Badge>
                    : <Badge variant="secondary">Inativo</Badge>}
                </div>
                <div className="flex gap-2 border-t pt-3">
                  <Button variant="outline" size="sm" onClick={() => openEdit(r)} className="flex-1">
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { if (confirm(`Remover ${r.name}?`)) remove(r.id); }} className="text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar solicitante" : "Novo solicitante"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Nome *</Label>
              <Input value={form.name || ""} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.phone || ""} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="(85) 9 9999-9999" />
            </div>
            <div>
              <Label>PIN (4 a 6 dígitos)</Label>
              <Input inputMode="numeric" maxLength={6} value={form.pin || ""} onChange={(e) => setForm((p) => ({ ...p, pin: e.target.value.replace(/\D/g, "") }))} placeholder="ex.: 1234" />
              <p className="text-xs text-muted-foreground mt-1">Compartilhe com o solicitante para ele acessar no PIN de entregas.</p>
            </div>
            <div>
              <Label>Usuário do sistema (para acesso às solicitações de manutenção)</Label>
              <Select value={form.user_id || "none"} onValueChange={(v) => setForm((p) => ({ ...p, user_id: v === "none" ? null : v }))}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {orgProfiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || p.email || p.username}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between border rounded-md p-3">
              <div>
                <div className="text-sm font-medium">Ativo</div>
                <div className="text-xs text-muted-foreground">Aparece na tela de login por PIN</div>
              </div>
              <Switch checked={form.is_active ?? true} onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} className="cgps-btn-primary">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
