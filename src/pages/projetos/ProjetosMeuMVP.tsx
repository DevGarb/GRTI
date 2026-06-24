import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal, AlertTriangle, TrendingUp, Sparkles } from "lucide-react";
import { useMvpIndividual } from "@/hooks/useMvpExtra";
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

  const { data: m, isLoading } = useMvpIndividual(targetUser, year, month);
  const { data: pens = [] } = usePenalties({ year, month, userId: targetUser, status: "aprovado" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Meu MVP</h1>
          <p className="text-sm text-muted-foreground">Acompanhe sua eficiência, qualidade e premiação em tempo real.</p>
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

      {isLoading || !m ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <>
          <Card>
            <CardContent className="p-5 flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[220px]">
                <p className="text-xs text-muted-foreground">Colaborador</p>
                <p className="text-lg font-bold">{m.full_name}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Eficiência Final</p>
                <p className="text-3xl font-bold">{m.final_score}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Premiação</p>
                {m.disqualified ? (
                  <Badge variant="outline" className="bg-red-500/15 text-red-700">Desclassificado</Badge>
                ) : m.award_level === "ouro" ? (
                  <Badge className="bg-amber-500/20 text-amber-700 gap-1"><Trophy className="h-3 w-3" /> Ouro · R$ {m.amount_brl}</Badge>
                ) : m.award_level === "prata" ? (
                  <Badge className="bg-slate-400/20 text-slate-700 gap-1"><Medal className="h-3 w-3" /> Prata · R$ {m.amount_brl}</Badge>
                ) : (
                  <Badge variant="outline">Fora da premiação</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <KPI label="Projetos ativos" value={m.active_projects} />
            <KPI label="Backlogs" value={m.backlogs} />
            <KPI label="Sprints" value={m.sprints} />
            <KPI label="Planejadas" value={m.planned} />
            <KPI label="Concluídas" value={m.delivered} />
            <KPI label="Atrasadas" value={m.late} accent={m.late > 0 ? "text-amber-600" : ""} />
            <KPI label="Retrabalhos" value={m.reworks} accent={m.reworks > 0 ? "text-red-600" : ""} />
            <KPI label="No prazo" value={`${m.on_time_rate}%`} />
            <KPI label="Qualidade Técnica" value={`${m.tech_quality}%`} />
            <KPI label="Eficiência Op." value={`${m.op_efficiency}%`} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-primary" /> Projeções
                </div>
                <ul className="text-sm space-y-1.5">
                  <li className="flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    {m.award_level === "ouro"
                      ? "Você já está no Ouro este mês."
                      : m.needed_for_gold > 0
                        ? <>Faltam <b>{m.needed_for_gold}</b> entrega(s) no prazo para atingir 100%.</>
                        : "Mantenha o ritmo para garantir o Ouro."}
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    Cada novo retrabalho reduz cerca de <b>{m.rework_impact_pct}%</b> da sua nota final.
                  </li>
                  {m.penalty_mvp > 0 && (
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                      Penalidades aprovadas no mês: <b>-{m.penalty_mvp}%</b> na nota final.
                    </li>
                  )}
                  {m.penalty_quality > 0 && (
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                      Penalidades de qualidade: <b>-{m.penalty_quality}%</b>.
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="text-sm font-semibold">Penalidades aprovadas no mês</div>
                {pens.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma penalidade registrada.</p>
                ) : (
                  <ul className="text-sm space-y-1.5">
                    {pens.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-2">
                        <span className="truncate">{p.type.replaceAll("_", " ")}</span>
                        <Badge variant="outline" className="bg-red-500/10 text-red-700">
                          {p.disqualify ? "Desclassifica" : p.scope === "mvp" ? `-${p.percent_impact}% MVP` : p.quality_impact > 0 ? `-${p.quality_impact}% Qual.` : `-${p.percent_impact}% Op.`}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
