import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, TrendingUp, ClipboardList, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOficinaProfile } from "@/contexts/OficinaProfileContext";
import { useCompanies } from "@/hooks/useOficina";
import { useServiceTypes, useAwardTiers } from "@/hooks/useOficinaScoring";
import { filterOficinaCompanies } from "@/lib/oficinaCompanies";
import { calcAward, tierProgress, formatPoints, POINTS_STATUS_INFO } from "@/lib/oficinaScoring";
import { cn } from "@/lib/utils";

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
  const { data: allCompanies = [] } = useCompanies();
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

  const companyName = useMemo(() => Object.fromEntries(companies.map((c) => [c.id, c.name])), [companies]);
  const typeName = useMemo(() => Object.fromEntries(types.map((t) => [t.id, t.name])), [types]);

  const monthOrders = useMemo(() => orders.filter((o) => o.finished_at && monthKey(o.finished_at) === month), [orders, month]);

  const approvedPts = useMemo(() => monthOrders.reduce((s, o) => s + Number(o.points_approved || 0), 0), [monthOrders]);
  const pendingPts = useMemo(
    () => monthOrders.filter((o) => o.points_status === "pendente").reduce((s, o) => s + Number(o.points_requested || 0), 0),
    [monthOrders],
  );
  const award = calcAward(approvedPts, tiers);
  const prog = tierProgress(approvedPts, tiers);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Meus Pontos</h1>
          <p className="text-sm text-muted-foreground">Acompanhe sua pontuação e a projeção da premiação do mês.</p>
        </div>
        <div>
          <Label className="text-xs">Mês</Label>
          <Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="w-40" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
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
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="h-3.5 w-3.5" /> Premiação projetada</p>
          <p className="text-2xl font-bold text-primary">R$ {award.total.toFixed(2)}</p>
        </CardContent></Card>
      </div>

      {prog.current && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>
                Faixa atual: <strong>R$ {Number(prog.current.rate_brl).toFixed(2)}/ponto</strong>
                {" "}({prog.current.from_points}–{prog.current.to_points ?? "∞"} pts)
              </span>
              {prog.next && (
                <span className="text-xs text-muted-foreground">
                  Faltam <strong>{formatPoints(prog.missing)} pts</strong> para R$ {Number(prog.next.rate_brl).toFixed(2)}/ponto
                </span>
              )}
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${prog.progress}%` }} />
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
  );
}
