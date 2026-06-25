import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal, AlertTriangle, Headphones, FolderKanban } from "lucide-react";
import { useMvpMetrics, useMvpChamadosMetrics } from "@/hooks/useProjetosDashboard";
import { usePenalties } from "@/hooks/useMvpExtra";

const months = Array.from({ length: 12 }, (_, i) => i + 1);
const years = (() => {
  const y = new Date().getFullYear();
  return [y - 1, y, y + 1];
})();

function KPI({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`text-xl font-bold ${accent ?? ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function AwardBadge({ level, amount, disqualified }: { level: string; amount: number; disqualified?: boolean }) {
  if (disqualified) return <Badge variant="outline" className="bg-red-500/15 text-red-700">Desclassificado</Badge>;
  if (level === "ouro") return <Badge className="bg-amber-500/20 text-amber-700 gap-1"><Trophy className="h-3 w-3" /> Ouro · R$ {amount}</Badge>;
  if (level === "prata") return <Badge className="bg-slate-400/20 text-slate-700 gap-1"><Medal className="h-3 w-3" /> Prata · R$ {amount}</Badge>;
  return <Badge variant="outline">Fora da premiação</Badge>;
}

export default function ProjetosMeuMVP() {
  const { user, profile, hasRole } = useAuth();
  const isAdmin = hasRole("admin") || hasRole("super_admin");
  const orgId = profile?.organization_id ?? null;
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const targetUser = isAdmin && selectedUser ? selectedUser : user?.id;

  const { data: techs } = useQuery({
    queryKey: ["org-tech-list", orgId],
    enabled: !!orgId && isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("organization_id", orgId);
      return (data || []) as { user_id: string; full_name: string }[];
    },
  });

  const { data: projAll = [], isLoading: loadingProj } = useMvpMetrics(year, month);
  const { data: chamAll = [], isLoading: loadingCham } = useMvpChamadosMetrics(year, month);
  const { data: pens = [] } = usePenalties({ year, month, userId: targetUser, status: "aprovado" });

  const proj = projAll.find((r) => r.user_id === targetUser);
  const cham = chamAll.find((r) => r.user_id === targetUser);
  const fullName = proj?.full_name || cham?.full_name || profile?.full_name || "—";
  const isLoading = loadingProj || loadingCham;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Meu MVP</h1>
          <p className="text-sm text-muted-foreground">Duas trilhas independentes: Chamados e Projetos. Cada uma pode render Prata ou Ouro.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <Select value={selectedUser ?? user?.id ?? ""} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-52"><SelectValue placeholder="Colaborador" /></SelectTrigger>
              <SelectContent>
                {(techs || []).map((t) => (
                  <SelectItem key={t.user_id} value={t.user_id}>{t.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {months.map((mm) => (
                <SelectItem key={mm} value={String(mm)}>{new Date(2000, mm - 1, 1).toLocaleString("pt-BR", { month: "long" })}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-4 flex-wrap mb-4">
                <div className="flex-1 min-w-[220px]">
                  <p className="text-xs text-muted-foreground">Colaborador</p>
                  <p className="text-lg font-bold">{fullName}</p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Card className="border-primary/20">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Headphones className="h-4 w-4 text-primary" /> Trilha Chamados
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-3xl font-bold">{cham?.final_score ?? 0}%</p>
                      <AwardBadge level={cham?.award_level ?? "none"} amount={Number(cham?.amount_brl ?? 0)} />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-primary/20">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <FolderKanban className="h-4 w-4 text-primary" /> Trilha Projetos
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-3xl font-bold">{proj?.final_score ?? 0}%</p>
                      <AwardBadge level={proj?.award_level ?? "none"} amount={Number(proj?.amount_brl ?? 0)} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <div>
            <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Headphones className="h-4 w-4" /> KPIs Chamados</h2>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              <KPI label="Fechados" value={cham?.total_closed ?? 0} />
              <KPI label="No prazo" value={`${cham?.on_time_rate ?? 0}%`} />
              <KPI label="CSAT" value={cham?.csat_count ? `${Number(cham.csat_avg).toFixed(1)} (${cham.csat_count})` : "—"} />
              <KPI label="Retrabalho" value={`${cham?.rework_rate ?? 0}%`} accent={(cham?.reworks ?? 0) > 0 ? "text-red-600" : ""} />
              <KPI label="Pontos cat." value={Number(cham?.category_points ?? 0).toFixed(0)} />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><FolderKanban className="h-4 w-4" /> KPIs Projetos</h2>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              <KPI label="Entregas" value={proj?.total_deliveries ?? 0} />
              <KPI label="No prazo" value={`${proj?.on_time_rate ?? 0}%`} />
              <KPI label="Qualidade" value={`${proj?.quality_rate ?? 0}%`} />
              <KPI label="Retrabalho" value={`${proj?.rework_rate ?? 0}%`} accent={(proj?.reworks ?? 0) > 0 ? "text-red-600" : ""} />
              <KPI label="Eficiência Op." value={`${proj?.op_efficiency ?? 0}%`} />
            </div>
          </div>

          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="text-sm font-semibold">Penalidades aprovadas no mês</div>
              {pens.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma penalidade registrada.</p>
              ) : (
                <ul className="text-sm space-y-1.5">
                  {pens.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2">
                      <span className="truncate flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                        {p.type.replaceAll("_", " ")}
                      </span>
                      <Badge variant="outline" className="bg-red-500/10 text-red-700">
                        {p.disqualify ? "Desclassifica" : p.scope === "mvp" ? `-${p.percent_impact}% MVP` : p.quality_impact > 0 ? `-${p.quality_impact}% Qual.` : `-${p.percent_impact}% Op.`}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
