import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, TrendingUp, ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOficinaProfile } from "@/contexts/OficinaProfileContext";
import { useCompanies } from "@/hooks/useOperacional";
import { useServiceTypes, useAwardTiers } from "@/hooks/useOficinaScoring";
import { filterOficinaCompanies } from "@/lib/oficinaCompanies";
import { formatPoints, POINTS_STATUS_INFO } from "@/lib/oficinaScoring";
import { cn } from "@/lib/utils";
import OficinaNav from "./OficinaNav";
import "./cearagps.css";

interface MyOs {
  id: string;
  plate: string;
  model: string | null;
  company_id: string | null;
  service_type_id: string | null;
  finished_at: string | null;
  points_requested: number | null;
  points_approved: number | null;
  points_status: string | null;
}

const monthKey = (ts: string) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function OpOficinaMeusPontos() {
  const { profile } = useOficinaProfile();
  const { profile: authProfile } = useAuth();
  const orgId = authProfile?.organization_id;
  const { items: allCompanies } = useCompanies();
  const companies = filterOficinaCompanies(allCompanies);
  const { types } = useServiceTypes();
  const { tiers } = useAwardTiers();

  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [orders, setOrders] = useState<MyOs[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!orgId || !profile?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("op_service_orders")
      .select("id, plate, model, company_id, service_type_id, finished_at, points_requested, points_approved, points_status")
      .eq("organization_id", orgId)
      .eq("mechanic_id", profile.id)
      .eq("status", "entregue")
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false });
    setOrders((data || []) as unknown as MyOs[]);
    setLoading(false);
  }, [orgId, profile?.id]);
  useEffect(() => { fetch(); }, [fetch]);

  // Atualiza em tempo real conforme o mecânico vai fechando OS
  useEffect(() => {
    if (!orgId || !profile?.id) return;
    const ch = supabase
      .channel("meus-pontos-os")
      .on("postgres_changes", { event: "*", schema: "public", table: "op_service_orders" }, () => fetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "op_os_service_items" }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orgId, profile?.id, fetch]);

  const companyName = useMemo(() => Object.fromEntries(companies.map((c) => [c.id, c.name])), [companies]);
  const typeName = useMemo(() => Object.fromEntries(types.map((t) => [t.id, t.name])), [types]);

  const monthOrders = useMemo(() => orders.filter((o) => o.finished_at && monthKey(o.finished_at) === month), [orders, month]);

  const approvedPts = useMemo(() => monthOrders.reduce((s, o) => s + Number(o.points_approved || 0), 0), [monthOrders]);
  const pendingPts = useMemo(
    () => monthOrders.filter((o) => o.points_status === "pendente").reduce((s, o) => s + Number(o.points_requested || 0), 0),
    [monthOrders],
  );

  // Pontuação acumulada conforme as OS vão sendo fechadas (aprovadas + em auditoria)
  const totalPts = approvedPts + pendingPts;

  const sortedTiers = useMemo(
    () => [...tiers].filter((t) => t.active).sort((a, b) => Number(a.from_points) - Number(b.from_points)),
    [tiers],
  );

  const progress = useMemo(() => {
    if (!sortedTiers.length) return { current: null as typeof sortedTiers[0] | null, next: null as typeof sortedTiers[0] | null, missing: 0, progress: 0, approvedProgress: 0, maxVisible: 0 };
    const maxVisible = Math.max(
      totalPts,
      ...sortedTiers.map((t) => Number(t.to_points || t.from_points)),
    );
    const pct = (v: number) => Math.min(100, maxVisible ? (v / maxVisible) * 100 : 0);
    for (let i = 0; i < sortedTiers.length; i++) {
      const t = sortedTiers[i];
      const upper = t.to_points == null ? Infinity : Number(t.to_points);
      if (totalPts <= upper || i === sortedTiers.length - 1) {
        const next = t.to_points == null ? null : sortedTiers[i + 1] ?? null;
        const missing = next ? Math.max(0, Number(next.from_points) - totalPts) : 0;
        return { current: t, next, missing, progress: pct(totalPts), approvedProgress: pct(approvedPts), maxVisible };
      }
    }
    return { current: sortedTiers[sortedTiers.length - 1], next: null, missing: 0, progress: 100, approvedProgress: pct(approvedPts), maxVisible };
  }, [sortedTiers, approvedPts, totalPts]);

  return (
    <div className="cgps-scope min-h-screen bg-slate-50">
      <OficinaNav />
      <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Meus Pontos</h1>
            <p className="text-sm text-muted-foreground">Acompanhe sua pontuação e a distância para a próxima meta.</p>
          </div>
          <div>
            <Label className="text-xs">Mês</Label>
            <Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="w-40" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> Pontos aprovados</p>
            <p className="text-2xl font-bold text-emerald-600">{formatPoints(approvedPts)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Em auditoria</p>
            <p className="text-2xl font-bold text-amber-600">{formatPoints(pendingPts)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><ClipboardList className="h-3.5 w-3.5" /> OS finalizadas</p>
            <p className="text-2xl font-bold">{monthOrders.length}</p>
          </CardContent></Card>
        </div>

        {sortedTiers.length > 0 && (
          <Card className="bg-transparent border-none shadow-none overflow-hidden">
            <CardContent className="p-5 md:p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[hsl(var(--cgps-primary))]">Progresso Atualizado vs Metas Operacionais</h2>
                  <p className="text-sm text-muted-foreground">Sua classificação e distância líquida para a conquista de novas metas.</p>
                </div>
                {progress.next && (
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Restante para próxima meta ({progress.next.label || "Próxima"})</p>
                    <p className="text-2xl font-bold text-[hsl(var(--cgps-accent))]">{formatPoints(progress.missing)} pontos líquidos</p>
                  </div>
                )}
              </div>

              <div className="relative pt-8 pb-2">
                <div className="h-3 w-full rounded-full bg-black/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${progress.progress}%`, background: "hsl(var(--cgps-accent))" }}
                  />
                </div>
                <div
                  className="absolute top-5 h-6 w-1 rounded bg-[hsl(var(--cgps-primary))] shadow-[0_0_8px_rgba(13,74,86,0.4)]"
                  style={{ left: `${progress.progress}%` }}
                />
                <div
                  className="absolute top-1 text-xs font-bold tabular-nums text-[hsl(var(--cgps-primary))]"
                  style={{ left: `${progress.progress}%`, transform: "translateX(-50%)" }}
                >
                  {formatPoints(approvedPts)} pts
                </div>

                <div className="relative mt-4 h-16">
                  {sortedTiers.map((tier) => {
                    const left = Math.min(100, (Number(tier.from_points) / progress.maxVisible) * 100);
                    return (
                      <div
                        key={tier.id}
                        className="absolute top-0 flex flex-col items-center"
                        style={{ left: `${left}%`, transform: "translateX(-50%)" }}
                      >
                        <div className="h-3 w-px bg-[hsl(var(--cgps-primary))]/30" />
                        <div className="text-[10px] text-foreground text-center leading-tight mt-1">
                          <div>{tier.label || "Faixa"}</div>
                          <div className="font-semibold tabular-nums">{formatPoints(Number(tier.from_points))} pts</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4">
            {loading ? (
              <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : monthOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma OS finalizada neste mês.</p>
            ) : (
              <div className="space-y-2">
                {monthOrders.map((o) => {
                  const stInfo = POINTS_STATUS_INFO[o.points_status || "pendente"] || POINTS_STATUS_INFO.pendente;
                  return (
                    <div key={o.id} className="flex items-center gap-3 border rounded-md px-3 py-2 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {o.plate} {o.model ? `· ${o.model}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {companyName[o.company_id || ""] || "—"} · {o.service_type_id ? typeName[o.service_type_id] || "—" : "Sem checklist"}
                          {" · "}{o.finished_at ? new Date(o.finished_at).toLocaleDateString("pt-BR") : "—"}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatPoints(Number(o.points_requested || 0))} solicitados
                      </span>
                      <span className="text-sm font-bold text-emerald-600 tabular-nums">
                        {formatPoints(Number(o.points_approved || 0))} pts
                      </span>
                      <Badge variant="secondary" className={cn("text-[10px]", stInfo.chip)}>{stInfo.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
