import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid, Legend,
  ScatterChart, Scatter, ZAxis,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMvpMetrics, useMvpChamadosMetrics } from "@/hooks/useProjetosDashboard";
import { Trophy, Medal, Award, Headphones, FolderKanban } from "lucide-react";

type Track = "chamados" | "projetos";

function useMvpEvolutionV2(track: Track, monthsBack: number) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id ?? null;
  return useQuery({
    queryKey: ["mvp-evolution-v2", orgId, track, monthsBack],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_mvp_evolution_v2", {
        _organization_id: orgId,
        _track: track,
        _months_back: monthsBack,
      });
      if (error) throw error;
      return (data || []) as Array<{
        year: number; month: number; label: string;
        avg_final: number; avg_on_time: number; avg_rework: number;
        total_deliveries: number; total_value: number;
      }>;
    },
  });
}

const medalIcon = (idx: number) => {
  if (idx === 0) return <Trophy className="h-4 w-4 text-amber-500" />;
  if (idx === 1) return <Medal className="h-4 w-4 text-slate-400" />;
  if (idx === 2) return <Award className="h-4 w-4 text-amber-700" />;
  return null;
};

export default function MvpTeamCharts({ year, month }: { year: number; month: number }) {
  const [track, setTrack] = useState<Track>("chamados");
  const [monthsBack, setMonthsBack] = useState(6);

  const { data: evolution = [], isLoading: loadingEvo } = useMvpEvolutionV2(track, monthsBack);
  const { data: projRows = [] } = useMvpMetrics(year, month);
  const { data: chamRows = [] } = useMvpChamadosMetrics(year, month);

  const rows: any[] = track === "chamados" ? chamRows : projRows;

  const ranking = useMemo(
    () => [...rows].sort((a, b) => Number(b.final_score) - Number(a.final_score)),
    [rows]
  );

  const top3 = ranking.slice(0, 3);

  const evoData = evolution.map((e) => ({
    label: e.label,
    final: Number(e.avg_final),
    on_time: Number(e.avg_on_time),
    rework: Number(e.avg_rework),
    deliveries: Number(e.total_deliveries),
    value: Number(e.total_value),
  }));

  const valueByUser = ranking
    .map((u) => ({ name: u.full_name, value: Number(u.amount_brl) || 0 }))
    .filter((u) => u.value > 0);

  const csatScatter = ranking
    .filter((u) => Number(u.csat_count) > 0)
    .map((u) => ({
      name: u.full_name,
      csat: Number(u.csat_avg) || 0,
      rework: Number(u.rework_rate) || 0,
      z: Number(u.total_closed) || 1,
    }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Tabs value={track} onValueChange={(v) => setTrack(v as Track)}>
          <TabsList>
            <TabsTrigger value="chamados" className="gap-1"><Headphones className="h-4 w-4" /> Chamados</TabsTrigger>
            <TabsTrigger value="projetos" className="gap-1"><FolderKanban className="h-4 w-4" /> Projetos</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={String(monthsBack)} onValueChange={(v) => setMonthsBack(Number(v))}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[3, 6, 12].map((n) => <SelectItem key={n} value={String(n)}>Últimos {n} meses</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Top 3 */}
      <div className="grid gap-3 md:grid-cols-3">
        {top3.length === 0 && (
          <Card className="md:col-span-3"><CardContent className="p-6 text-sm text-muted-foreground text-center">
            Sem dados no período para a trilha {track}.
          </CardContent></Card>
        )}
        {top3.map((u, idx) => (
          <Card key={u.user_id}>
            <CardContent className="p-4 flex items-center gap-3">
              {medalIcon(idx)}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{idx + 1}º lugar · {track === "chamados" ? "Chamados" : "Projetos"}</p>
                <p className="font-semibold truncate">{u.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  Final {Number(u.final_score).toFixed(0)}% · {track === "chamados" ? `${u.total_closed} fechados` : `${u.total_deliveries} entregas`}
                </p>
              </div>
              {u.award_level === "ouro" && <Badge className="bg-amber-500/20 text-amber-700">Ouro</Badge>}
              {u.award_level === "prata" && <Badge className="bg-slate-400/20 text-slate-700">Prata</Badge>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Evolution */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">Score final & % no prazo (evolução)</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={evoData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" /><YAxis domain={[0, 100]} />
                <Tooltip /><Legend />
                <Line type="monotone" dataKey="final" stroke="hsl(var(--primary))" name="Score final %" />
                <Line type="monotone" dataKey="on_time" stroke="#10b981" name="No prazo %" />
                <Line type="monotone" dataKey="rework" stroke="#ef4444" name="Retrabalho %" />
              </LineChart>
            </ResponsiveContainer>
            {loadingEvo && <p className="text-xs text-muted-foreground text-center mt-1">Carregando...</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm">
              {track === "chamados" ? "Chamados fechados por mês" : "Entregas e R$ por mês"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={evoData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis yAxisId="l" />
                {track === "projetos" && <YAxis yAxisId="r" orientation="right" />}
                <Tooltip /><Legend />
                <Bar yAxisId="l" dataKey="deliveries" fill="hsl(var(--primary))" name={track === "chamados" ? "Fechados" : "Entregas"} />
                {track === "projetos" && (
                  <Bar yAxisId="r" dataKey="value" fill="#f59e0b" name="R$" />
                )}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Track-specific */}
        {track === "projetos" ? (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-1"><CardTitle className="text-sm">Valor R$ por colaborador (mês atual)</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0">
              {valueByUser.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhum valor de projeto registrado no mês.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={valueByUser} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={140} />
                    <Tooltip formatter={(v: any) => `R$ ${Number(v).toFixed(0)}`} />
                    <Bar dataKey="value" fill="#f59e0b" name="R$" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-1"><CardTitle className="text-sm">CSAT vs Retrabalho (mês atual)</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0">
              {csatScatter.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Sem avaliações CSAT no mês.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="csat" name="CSAT" domain={[0, 5]} />
                    <YAxis type="number" dataKey="rework" name="Retrabalho %" />
                    <ZAxis type="number" dataKey="z" range={[60, 300]} name="Volume" />
                    <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(v: any, n: any) => [v, n]} labelFormatter={() => ""}
                      content={({ payload }: any) => {
                        if (!payload?.length) return null;
                        const p = payload[0].payload;
                        return (
                          <div className="bg-popover border rounded p-2 text-xs">
                            <p className="font-semibold">{p.name}</p>
                            <p>CSAT: {p.csat.toFixed(1)}</p>
                            <p>Retrabalho: {p.rework}%</p>
                            <p>Volume: {p.z}</p>
                          </div>
                        );
                      }}
                    />
                    <Scatter data={csatScatter} fill="hsl(var(--primary))" />
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Full ranking */}
      <Card>
        <CardHeader className="pb-1"><CardTitle className="text-sm">Ranking completo do mês — {track === "chamados" ? "Chamados" : "Projetos"}</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
          {ranking.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Sem dados.</p>
          ) : (
            <ul className="divide-y">
              {ranking.map((u, idx) => (
                <li key={u.user_id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="shrink-0">{idx + 1}º</Badge>
                    {medalIcon(idx)}
                    <span className="truncate font-medium">{u.full_name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    {track === "chamados" ? (
                      <>
                        <span>{u.total_closed} fechados</span>
                        <span>{u.on_time_rate}% prazo</span>
                        <span>{u.csat_count > 0 ? `CSAT ${Number(u.csat_avg).toFixed(1)}` : "CSAT —"}</span>
                        <span>{u.rework_rate}% retr.</span>
                      </>
                    ) : (
                      <>
                        <span>{u.total_deliveries} entregas</span>
                        <span>{u.on_time_rate}% prazo</span>
                        <span>{u.quality_rate}% qual.</span>
                        <span>R$ {Number(u.amount_brl).toFixed(0)}</span>
                      </>
                    )}
                    <span className="font-semibold text-foreground">{Number(u.final_score).toFixed(0)}%</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
