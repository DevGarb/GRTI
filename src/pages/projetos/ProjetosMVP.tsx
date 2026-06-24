import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trophy, Medal, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { useMvpMetrics } from "@/hooks/useProjetosDashboard";
import { toast } from "sonner";

interface AwardRow {
  id: string;
  user_id: string;
  on_time_rate: number;
  quality_rate: number;
  rework_rate: number;
  final_score: number;
  award_level: string;
  amount_brl: number;
  status: string;
  notes: string | null;
  approved_at: string | null;
}

const months = Array.from({ length: 12 }, (_, i) => i + 1);
const years = (() => {
  const y = new Date().getFullYear();
  return [y - 1, y, y + 1];
})();

export default function ProjetosMVP() {
  const { profile, hasRole } = useAuth();
  const isAdmin = hasRole("admin") || hasRole("super_admin");
  const orgId = profile?.organization_id ?? null;
  const qc = useQueryClient();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [approveDlg, setApproveDlg] = useState<{ id: string; approve: boolean } | null>(null);
  const [notes, setNotes] = useState("");

  const { data: metrics = [], isLoading } = useMvpMetrics(year, month);

  const { data: awards = [] } = useQuery({
    queryKey: ["mvp-awards", orgId, year, month],
    queryFn: async () => {
      if (!orgId) return [] as AwardRow[];
      const { data, error } = await supabase
        .from("mvp_awards")
        .select("*")
        .eq("organization_id", orgId)
        .eq("year", year)
        .eq("month", month);
      if (error) throw error;
      return (data || []) as AwardRow[];
    },
    enabled: !!orgId,
  });

  const compute = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc("compute_mvp_awards", {
        _organization_id: orgId,
        _year: year,
        _month: month,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mvp-awards"] });
      toast.success("Premiações calculadas");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  const approve = useMutation({
    mutationFn: async () => {
      if (!approveDlg) return;
      const { error } = await (supabase as any).rpc("approve_mvp_award", {
        _id: approveDlg.id,
        _approve: approveDlg.approve,
        _notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mvp-awards"] });
      toast.success("Status atualizado");
      setApproveDlg(null);
      setNotes("");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  const awardByUser = new Map(awards.map((a) => [a.user_id, a]));

  const totals = awards.reduce(
    (acc, a) => {
      if (a.status === "aprovado") {
        acc.aprovado += a.amount_brl;
        if (a.award_level === "ouro") acc.ouros++;
        if (a.award_level === "prata") acc.pratas++;
      }
      return acc;
    },
    { aprovado: 0, ouros: 0, pratas: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Dashboard MVP & Premiação</h1>
          <p className="text-sm text-muted-foreground">
            Eficiência Final = (Prazo ÷ Planejadas) × (Qualidade ÷ 100) × (1 − Retrabalho).
            Prata ≥ 90% (R$ 300) · Ouro = 100% (R$ 500).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {new Date(2000, m - 1, 1).toLocaleString("pt-BR", { month: "long" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button onClick={() => compute.mutate()} disabled={compute.isPending}>
              <RefreshCw className="h-4 w-4 mr-1" /> Recalcular mês
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Trophy className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-xs text-muted-foreground">Total aprovado</p>
              <p className="text-2xl font-bold">R$ {totals.aprovado.toFixed(0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Medal className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs text-muted-foreground">Ouros aprovados</p>
              <p className="text-2xl font-bold">{totals.ouros}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Medal className="h-8 w-8 text-slate-400" />
            <div>
              <p className="text-xs text-muted-foreground">Pratas aprovadas</p>
              <p className="text-2xl font-bold">{totals.pratas}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead className="text-right">Entregas</TableHead>
                <TableHead className="text-right">No prazo</TableHead>
                <TableHead className="text-right">Qualidade</TableHead>
                <TableHead className="text-right">Retrabalho</TableHead>
                <TableHead className="text-right">Final</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-6">Carregando...</TableCell></TableRow>
              ) : metrics.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-6">Sem dados para o período.</TableCell></TableRow>
              ) : (
                metrics.map((m) => {
                  const a = awardByUser.get(m.user_id);
                  const lvl = a?.award_level || m.award_level;
                  const value = a?.amount_brl ?? m.amount_brl;
                  const status = a?.status || "—";
                  return (
                    <TableRow key={m.user_id}>
                      <TableCell className="font-medium">{m.full_name}</TableCell>
                      <TableCell className="text-right">{m.total_deliveries}</TableCell>
                      <TableCell className="text-right">{m.on_time_rate}%</TableCell>
                      <TableCell className="text-right">{m.quality_rate}%</TableCell>
                      <TableCell className="text-right">{m.rework_rate}%</TableCell>
                      <TableCell className="text-right font-semibold">{m.final_score}%</TableCell>
                      <TableCell>
                        {lvl === "ouro" && <Badge className="bg-amber-500/20 text-amber-700">Ouro</Badge>}
                        {lvl === "prata" && <Badge className="bg-slate-400/20 text-slate-700">Prata</Badge>}
                        {lvl === "none" && <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-right">R$ {Number(value).toFixed(0)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            status === "aprovado"
                              ? "bg-emerald-500/15 text-emerald-700"
                              : status === "rejeitado"
                                ? "bg-red-500/15 text-red-700"
                                : status === "pendente"
                                  ? "bg-amber-500/15 text-amber-700"
                                  : ""
                          }
                        >
                          {status}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          {a && a.status !== "aprovado" && (
                            <Button size="sm" variant="ghost" onClick={() => setApproveDlg({ id: a.id, approve: true })}>
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            </Button>
                          )}
                          {a && a.status !== "rejeitado" && (
                            <Button size="sm" variant="ghost" onClick={() => setApproveDlg({ id: a.id, approve: false })}>
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!approveDlg} onOpenChange={(v) => !v && setApproveDlg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{approveDlg?.approve ? "Aprovar premiação" : "Rejeitar premiação"}</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Observações (opcional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDlg(null)}>Cancelar</Button>
            <Button onClick={() => approve.mutate()} disabled={approve.isPending}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
