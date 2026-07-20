import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ManutencaoNav from "./ManutencaoNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Building2, Wrench, AlertTriangle, Calendar, Star } from "lucide-react";
import { useMaintenanceOrders, useSites, MAINT_CATEGORIES, MAINT_PRIORITIES } from "@/hooks/useManutencao";
import { useSectors } from "@/hooks/useSectors";
import { useMaintProfile } from "@/hooks/useMaintProfile";
import { useAuth } from "@/contexts/AuthContext";
import { fetchRatedIds, submitOpRating } from "@/hooks/useOpRatings";
import OpRatingDialog from "@/components/operacional/OpRatingDialog";
import { toast } from "sonner";

function todayISO() { return new Date().toISOString().slice(0, 10); }

export default function OpManutencaoSolicitar() {
  const navigate = useNavigate();
  const orders = useMaintenanceOrders();
  const sites = useSites();
  const maintProfile = useMaintProfile();
  const { user, profile: authProfile } = useAuth();
  const { data: sectors = [] } = useSectors(authProfile?.organization_id || null);

  const [form, setForm] = useState({
    title: "",
    site_id: "",
    sector: "",
    category: "Outros",
    priority: "Média",
    description: "",
    deadline: "",
    opened_at: todayISO(),
  });

  const [pending, setPending] = useState<any>(null);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const findPending = async () => {
    if (!maintProfile.requesterId || !authProfile?.organization_id) return null;
    const rated = await fetchRatedIds("maintenance", authProfile.organization_id);
    const mine = orders.items.filter(
      (o) => o.status === "Concluída" && o.requester_id === maintProfile.requesterId && !rated.has(o.id),
    );
    mine.sort((a, b) => (a.finished_at || a.opened_at).localeCompare(b.finished_at || b.opened_at));
    return mine[0] || null;
  };

  useEffect(() => {
    (async () => {
      const p = await findPending();
      if (p) { setPending(p); setRatingOpen(true); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.items.length, maintProfile.requesterId, authProfile?.organization_id]);

  const submit = async () => {
    const p = await findPending();
    if (p) {
      setPending(p); setRatingOpen(true);
      toast.error("Avalie a manutenção anterior antes de criar uma nova solicitação.");
      return;
    }
    if (!form.title.trim()) return toast.error("Informe o título da solicitação");
    if (!form.site_id) return toast.error("Escolha a sede");
    if (!form.sector) return toast.error("Escolha o setor solicitante");
    const res = await orders.add({
      ...form,
      status: "Aberta",
      requester_id: maintProfile.requesterId || null,
      deadline: form.deadline || null,
      sector: form.sector,
    });
    if (res) navigate("/op/manutencao/minhas");
  };

  const handleSubmitRating = async (rating: number, comment: string) => {
    if (!pending || !authProfile?.organization_id) return;
    setBusy(true);
    const ok = await submitOpRating({
      kind: "maintenance",
      organization_id: authProfile.organization_id,
      targetId: pending.id,
      rating,
      comment,
      rated_by_type: "solicitante",
      rated_by_name: maintProfile.requesterName,
      rated_by_user: user?.id || null,
    });
    setBusy(false);
    if (ok) { setRatingOpen(false); setPending(null); }
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

        {pending && (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-amber-900 text-sm">Avaliação pendente</div>
              <p className="text-xs text-amber-800 mt-0.5">
                Antes de abrir uma nova solicitação, avalie a manutenção anterior: <strong>OM #{pending.om_number} — {pending.title}</strong>
              </p>
            </div>
            <Button size="sm" onClick={() => setRatingOpen(true)} className="cgps-btn-primary">
              <Star className="h-4 w-4 mr-1" /> Avaliar
            </Button>
          </div>
        )}

        <div className="bg-white border rounded-xl p-5 space-y-4">
          <div>
            <Label>Título / problema *</Label>
            <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Ex.: Torneira do banheiro vazando" />
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
            <Textarea rows={4} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Descreva o problema, local exato, quando começou..." />
          </div>

          <Button onClick={submit} className="w-full cgps-btn-primary" disabled={!!pending}>
            <Send className="h-4 w-4 mr-1" /> Enviar solicitação
          </Button>
        </div>
      </div>

      <OpRatingDialog
        open={ratingOpen}
        onOpenChange={setRatingOpen}
        title="Avalie a manutenção anterior"
        subtitle="Sua opinião ajuda a melhorar o trabalho dos técnicos."
        targetLabel={pending ? `OM #${pending.om_number} — ${pending.title}` : undefined}
        busy={busy}
        onSubmit={handleSubmitRating}
      />
    </div>
  );
}
