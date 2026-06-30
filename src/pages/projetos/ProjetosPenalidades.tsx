import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, CheckCircle2, XCircle, Paperclip, ShieldAlert } from "lucide-react";
import {
  usePenalties, useCreatePenalty, useApprovePenalty,
  PENALTY_TYPES, Penalty,
} from "@/hooks/useMvpExtra";
import { toast } from "sonner";
import { formatDateBR } from "@/lib/dateFormat";

const months = Array.from({ length: 12 }, (_, i) => i + 1);
const years = (() => { const y = new Date().getFullYear(); return [y - 1, y, y + 1]; })();

export default function ProjetosPenalidades() {
  const { profile, user, hasRole } = useAuth();
  const isAdmin = hasRole("admin") || hasRole("super_admin");
  const orgId = profile?.organization_id ?? null;
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [fUser, setFUser] = useState<string>("all");
  const [fType, setFType] = useState<string>("all");
  const [fStatus, setFStatus] = useState<string>("all");

  const filters = useMemo(() => ({
    year, month,
    userId: fUser !== "all" ? fUser : undefined,
    type: fType !== "all" ? fType : undefined,
    status: fStatus !== "all" ? fStatus : undefined,
  }), [year, month, fUser, fType, fStatus]);

  const { data: items = [], isLoading } = usePenalties(filters);
  const create = useCreatePenalty();
  const approve = useApprovePenalty();

  const { data: orgUsers = [] } = useQuery({
    queryKey: ["org-profiles", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("organization_id", orgId);
      return (data || []) as { user_id: string; full_name: string }[];
    },
  });

  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({
    user_id: "", type: PENALTY_TYPES[0].value,
    reference_date: new Date().toISOString().slice(0, 10),
    justification: "", notes: "", evidence_url: "" as string | null,
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [approveDlg, setApproveDlg] = useState<{ id: string; approve: boolean } | null>(null);
  const [approveNotes, setApproveNotes] = useState("");

  const uploadEvidence = async (file: File) => {
    if (!orgId || !user) return null;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `penalties/${orgId}/${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("attachments").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("attachments").getPublicUrl(path);
      setForm((f) => ({ ...f, evidence_url: data.publicUrl }));
      toast.success("Evidência anexada");
    } catch (e: any) {
      toast.error("Erro upload: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const submitNew = async () => {
    if (!form.user_id || !form.justification.trim()) {
      toast.error("Selecione colaborador e justifique");
      return;
    }
    await create.mutateAsync({
      user_id: form.user_id,
      type: form.type,
      reference_date: form.reference_date,
      justification: form.justification,
      evidence_url: form.evidence_url || null,
      notes: form.notes || null,
    });
    setNewOpen(false);
    setForm({ user_id: "", type: PENALTY_TYPES[0].value, reference_date: new Date().toISOString().slice(0, 10), justification: "", notes: "", evidence_url: "" });
  };

  // KPIs
  const totalMonth = items.length;
  const approved = items.filter((p) => p.status === "aprovado");
  const totalImpact = approved.reduce((acc, p) => acc + Number(p.percent_impact), 0);
  const topReasons = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((p) => map.set(p.type, (map.get(p.type) || 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [items]);

  const typeLabel = (v: string) => PENALTY_TYPES.find((t) => t.value === v)?.label ?? v;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldAlert className="h-6 w-6" /> Penalidades</h1>
          <p className="text-sm text-muted-foreground">Apenas penalidades aprovadas impactam o MVP. Toda ação fica auditada.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Registrar penalidade
          </Button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Penalidades do mês</p>
          <p className="text-2xl font-bold">{totalMonth}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Impacto MVP agregado</p>
          <p className="text-2xl font-bold text-red-600">-{totalImpact}%</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Motivos recorrentes</p>
          {topReasons.length === 0
            ? <p className="text-sm text-muted-foreground">—</p>
            : <ul className="text-xs mt-1 space-y-0.5">
                {topReasons.map(([t, n]) => <li key={t}>{typeLabel(t)} <Badge variant="outline" className="ml-1">{n}</Badge></li>)}
              </ul>}
        </CardContent></Card>
      </div>

      <Card><CardContent className="p-3 flex flex-wrap gap-2">
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>{months.map((mm) => <SelectItem key={mm} value={String(mm)}>{new Date(2000, mm - 1).toLocaleString("pt-BR", { month: "long" })}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={fUser} onValueChange={setFUser}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Colaborador" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos colaboradores</SelectItem>
            {orgUsers.map((u) => <SelectItem key={u.user_id} value={u.user_id}>{u.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fType} onValueChange={setFType}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            {PENALTY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fStatus} onValueChange={setFStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="aprovado">Aprovado</SelectItem>
            <SelectItem value="rejeitado">Rejeitado</SelectItem>
          </SelectContent>
        </Select>
      </CardContent></Card>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Colaborador</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Impacto</TableHead>
              <TableHead>Justificativa</TableHead>
              <TableHead>Evidência</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-6 text-sm text-muted-foreground">Carregando…</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-6 text-sm text-muted-foreground">Sem penalidades.</TableCell></TableRow>
            ) : items.map((p: Penalty) => (
              <TableRow key={p.id}>
                <TableCell className="text-xs">{formatDateBR(p.reference_date)}</TableCell>
                <TableCell className="font-medium">{p.user_name}</TableCell>
                <TableCell><Badge variant="outline">{typeLabel(p.type)}</Badge></TableCell>
                <TableCell className="text-xs text-red-600">
                  {p.disqualify ? "Desclassifica" : p.scope === "mvp" ? `-${p.percent_impact}% MVP` : p.quality_impact > 0 ? `-${p.quality_impact}% Qual.` : `-${p.percent_impact}% Op.`}
                </TableCell>
                <TableCell className="max-w-xs truncate text-xs" title={p.justification}>{p.justification}</TableCell>
                <TableCell>
                  {p.evidence_url ? (
                    <a href={p.evidence_url} target="_blank" rel="noreferrer" className="text-primary text-xs underline">ver</a>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={
                    p.status === "aprovado" ? "bg-emerald-500/15 text-emerald-700"
                      : p.status === "rejeitado" ? "bg-red-500/15 text-red-700"
                        : "bg-amber-500/15 text-amber-700"
                  }>{p.status}</Badge>
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    {p.status !== "aprovado" && (
                      <Button size="sm" variant="ghost" onClick={() => { setApproveDlg({ id: p.id, approve: true }); setApproveNotes(""); }}>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      </Button>
                    )}
                    {p.status !== "rejeitado" && (
                      <Button size="sm" variant="ghost" onClick={() => { setApproveDlg({ id: p.id, approve: false }); setApproveNotes(""); }}>
                        <XCircle className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      {/* New penalty */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar penalidade</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Colaborador *</Label>
              <Select value={form.user_id} onValueChange={(v) => setForm((f) => ({ ...f, user_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {orgUsers.map((u) => <SelectItem key={u.user_id} value={u.user_id}>{u.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo *</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PENALTY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label} <span className="text-xs text-muted-foreground ml-2">({t.impact})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data de referência *</Label>
              <Input type="date" value={form.reference_date} onChange={(e) => setForm((f) => ({ ...f, reference_date: e.target.value }))} />
            </div>
            <div>
              <Label>Justificativa *</Label>
              <Textarea rows={3} value={form.justification} onChange={(e) => setForm((f) => ({ ...f, justification: e.target.value }))} />
            </div>
            <div>
              <Label>Observação</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div>
              <Label>Evidência</Label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <Paperclip className="h-4 w-4 mr-1" /> {uploading ? "Enviando…" : "Anexar arquivo"}
                </Button>
                {form.evidence_url && <a href={form.evidence_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">ver anexo</a>}
                <input ref={fileRef} type="file" hidden onChange={(e) => e.target.files?.[0] && uploadEvidence(e.target.files[0])} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancelar</Button>
            <Button onClick={submitNew} disabled={create.isPending}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve */}
      <Dialog open={!!approveDlg} onOpenChange={(v) => !v && setApproveDlg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{approveDlg?.approve ? "Aprovar penalidade" : "Rejeitar penalidade"}</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Observação (opcional)</Label>
            <Textarea rows={3} value={approveNotes} onChange={(e) => setApproveNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDlg(null)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!approveDlg) return;
              await approve.mutateAsync({ id: approveDlg.id, approve: approveDlg.approve, notes: approveNotes });
              setApproveDlg(null);
            }}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
