import { useMemo, useState } from "react";
import { Trophy, Pencil, Loader2, ClipboardCheck } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useServiceOrders, useMechanics, type ServiceOrder } from "@/hooks/useOficina";
import { useOsServiceItems, useAwardTiers } from "@/hooks/useOficinaScoring";
import {
  requestedPoints, approvedPoints, calcAward, tierProgress, formatPoints, POINTS_STATUS_INFO,
  type AwardTier,
} from "@/lib/oficinaScoring";
import { useCompanies } from "@/hooks/useOperacional";
import { filterOficinaCompanies } from "@/lib/oficinaCompanies";
import OficinaNav from "./OficinaNav";
import { formatDateBR } from "@/lib/dateFormat";
import { cn } from "@/lib/utils";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const formatBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface OsRow { os: ServiceOrder; requested: number; approved: number }

export default function OpOficinaPremiacoes() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [mechanicId, setMechanicId] = useState("all");
  const [companyId, setCompanyId] = useState("all");

  const { items: orders, loading } = useServiceOrders();
  const { byOs } = useOsServiceItems();
  const { tiers, updateTier } = useAwardTiers();
  const { items: mechanics } = useMechanics();
  const { items: companies } = useCompanies();
  const workshopCompanies = filterOficinaCompanies(companies);

  const [editTier, setEditTier] = useState<AwardTier | null>(null);
  const [tierFrom, setTierFrom] = useState("");
  const [tierTo, setTierTo] = useState("");
  const [tierRate, setTierRate] = useState("");

  const mechName = (id: string | null) => (id ? mechanics.find(m => m.id === id)?.name || "—" : "—");
  const compName = (id: string | null) => (id ? companies.find(c => c.id === id)?.name || "—" : "—");

  const closedOrders = useMemo(() => {
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    return orders.filter(o =>
      o.finished_at &&
      String(o.finished_at).slice(0, 7) === prefix &&
      (mechanicId === "all" || o.mechanic_id === mechanicId) &&
      (companyId === "all" || o.company_id === companyId)
    );
  }, [orders, year, month, mechanicId, companyId]);

  const rows: OsRow[] = useMemo(
    () => closedOrders
      .map(os => {
        const items = byOs[os.id] || [];
        return { os, requested: requestedPoints(items), approved: approvedPoints(items) };
      })
      .sort((a, b) => Number(b.os.os_number) - Number(a.os.os_number)),
    [closedOrders, byOs],
  );

  const isAudited = (os: ServiceOrder) => os.points_status === "aprovada" || os.points_status === "ajustada";

  const byMechanic = useMemo(() => {
    const acc = new Map<string, { id: string; name: string; osCount: number; requested: number; approved: number; pendingAudit: number }>();
    rows.forEach(({ os, requested, approved }) => {
      if (!os.mechanic_id) return;
      const cur = acc.get(os.mechanic_id) || {
        id: os.mechanic_id, name: mechName(os.mechanic_id), osCount: 0, requested: 0, approved: 0, pendingAudit: 0,
      };
      cur.osCount += 1;
      cur.requested += requested;
      cur.approved += isAudited(os) ? approved : 0;
      if (!isAudited(os)) cur.pendingAudit += 1;
      acc.set(os.mechanic_id, cur);
    });
    return Array.from(acc.values()).sort((a, b) => b.approved - a.approved || b.requested - a.requested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, mechanics]);

  const openTierEdit = (t: AwardTier) => {
    setEditTier(t);
    setTierFrom(String(t.from_points));
    setTierTo(t.to_points == null ? "" : String(t.to_points));
    setTierRate(String(t.rate_brl));
  };

  const saveTier = async () => {
    if (!editTier) return;
    await updateTier(editTier.id, {
      from_points: Number(tierFrom) || 0,
      to_points: tierTo === "" ? null : Number(tierTo),
      rate_brl: Number(tierRate) || 0,
    } as any);
    setEditTier(null);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <OficinaNav />
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" />
          <div>
            <h1 className="text-xl font-bold">Premiações por pontos</h1>
            <p className="text-sm text-muted-foreground">
              Pontos vêm do checklist da OS (solicitados pelo mecânico) e só valem após a auditoria do administrador.
            </p>
          </div>
        </div>

        <Tabs defaultValue="mensal">
          <TabsList>
            <TabsTrigger value="mensal"><ClipboardCheck className="h-4 w-4 mr-1" />OS do mês</TabsTrigger>
            <TabsTrigger value="mecanicos"><Trophy className="h-4 w-4 mr-1" />Mecânicos</TabsTrigger>
          </TabsList>

          {/* ===================== OS DO MÊS ===================== */}
          <TabsContent value="mensal" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-w-3xl">
              <div>
                <Label className="text-xs">Mês</Label>
                <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MESES.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Ano</Label>
                <Input type="number" value={year} onChange={e => setYear(Number(e.target.value) || year)} />
              </div>
              <div>
                <Label className="text-xs">Mecânico</Label>
                <Select value={mechanicId} onValueChange={setMechanicId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {mechanics.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Empresa</Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {workshopCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-card border rounded-lg overflow-hidden">
              {loading ? (
                <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : rows.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  Nenhuma OS finalizada em {MESES[month - 1]}/{year} com os filtros atuais.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                        <th className="px-3 py-2">OS</th>
                        <th className="px-3 py-2">Finalizada em</th>
                        <th className="px-3 py-2">Mecânico</th>
                        <th className="px-3 py-2">Empresa</th>
                        <th className="px-3 py-2 text-right">Pts solicitados</th>
                        <th className="px-3 py-2 text-right">Pts aprovados</th>
                        <th className="px-3 py-2">Auditoria</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {rows.map(({ os, requested, approved }) => {
                        const st = POINTS_STATUS_INFO[os.points_status || "pendente"] || POINTS_STATUS_INFO.pendente;
                        return (
                          <tr key={os.id} className="hover:bg-muted/30">
                            <td className="px-3 py-2 font-mono">#{os.os_number}</td>
                            <td className="px-3 py-2">{formatDateBR(os.finished_at)}</td>
                            <td className="px-3 py-2">{mechName(os.mechanic_id)}</td>
                            <td className="px-3 py-2">{compName(os.company_id)}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{formatPoints(requested)}</td>
                            <td className="px-3 py-2 text-right tabular-nums font-semibold text-emerald-600">
                              {isAudited(os) ? formatPoints(approved) : "—"}
                            </td>
                            <td className="px-3 py-2"><Badge variant="secondary" className={st.chip}>{st.label}</Badge></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ===================== MECÂNICOS ===================== */}
          <TabsContent value="mecanicos" className="space-y-6 mt-4">
            {byMechanic.length === 0 ? (
              <div className="bg-card border rounded-lg p-8 text-center text-muted-foreground text-sm">
                Nenhum mecânico com OS finalizada em {MESES[month - 1]}/{year}.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {byMechanic.map((row, idx) => {
                  const award = calcAward(row.approved, tiers);
                  const prog = tierProgress(row.approved, tiers);
                  return (
                    <div key={row.id} className={cn("bg-card border rounded-lg p-4 space-y-3", idx === 0 && row.approved > 0 && "ring-1 ring-amber-400")}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold flex items-center gap-2">
                          {idx === 0 && row.approved > 0 && <Trophy className="h-4 w-4 text-amber-500" />}
                          {row.name}
                        </div>
                        {row.pendingAudit > 0 && (
                          <Badge variant="secondary" className="bg-amber-500/15 text-amber-700">{row.pendingAudit} em auditoria</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{row.osCount} OS finalizada(s) no mês</div>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-muted/40 rounded p-2">
                          <div className="text-lg font-bold tabular-nums">{formatPoints(row.requested)}</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Solicitados</div>
                        </div>
                        <div className="bg-emerald-500/10 rounded p-2">
                          <div className="text-lg font-bold tabular-nums text-emerald-600">{formatPoints(row.approved)}</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Aprovados</div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Premiação</span>
                          {award.total > 0
                            ? <span className="font-bold text-emerald-600">{formatBRL(award.total)}</span>
                            : <span className="text-muted-foreground">Sem premiação</span>}
                        </div>
                        {prog.next ? (
                          <>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${prog.progress}%` }} />
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              Faltam {formatPoints(prog.missing)} pts para a próxima faixa ({formatPoints(prog.next.from_points)}+ pts · {formatBRL(Number(prog.next.rate_brl))}/pt extra)
                            </div>
                          </>
                        ) : award.total > 0 ? (
                          <div className="text-[10px] text-emerald-600">Maior faixa de premiação atingida</div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Faixas de premiação (editáveis) */}
            <div className="bg-card border rounded-lg p-4 space-y-3">
              <div>
                <h3 className="font-semibold">Faixas de premiação</h3>
                <p className="text-xs text-muted-foreground">
                  Premiação progressiva: cada faixa paga um valor por ponto dentro do seu intervalo de pontos aprovados.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {tiers.map(t => (
                  <div key={t.id} className="border rounded-md p-3 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">
                        {formatPoints(t.from_points)}–{t.to_points == null ? "∞" : formatPoints(t.to_points)} pts
                      </div>
                      <div className="text-sm font-bold text-emerald-600">{formatBRL(Number(t.rate_brl))}/pt</div>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openTierEdit(t)} aria-label="Editar faixa">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {tiers.length === 0 && (
                  <div className="text-sm text-muted-foreground">Nenhuma faixa cadastrada — configure em Pontuação.</div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!editTier} onOpenChange={o => !o && setEditTier(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Editar faixa de premiação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>De (pontos)</Label>
              <Input type="number" min={0} step="0.01" value={tierFrom} onChange={e => setTierFrom(e.target.value)} />
            </div>
            <div>
              <Label>Até (pontos) — vazio = sem teto</Label>
              <Input type="number" min={0} step="0.01" value={tierTo} onChange={e => setTierTo(e.target.value)} />
            </div>
            <div>
              <Label>Valor por ponto (R$)</Label>
              <Input type="number" min={0} step="0.01" value={tierRate} onChange={e => setTierRate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTier(null)}>Cancelar</Button>
            <Button onClick={saveTier}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
