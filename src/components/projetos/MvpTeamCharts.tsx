import { Card, CardContent } from "@/components/ui/card";
import { useMvpEvolution, useMvpTeamRanking } from "@/hooks/useMvpExtra";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid, Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";

const monthLabel = (m: number) => new Date(2000, m - 1, 1).toLocaleString("pt-BR", { month: "short" });

export default function MvpTeamCharts({ year, month }: { year: number; month: number }) {
  const [monthsBack, setMonthsBack] = useState(6);
  const { data: evolution = [] } = useMvpEvolution(monthsBack);
  const { data: ranking } = useMvpTeamRanking(year, month);

  const evoData = evolution.map((e) => ({
    label: `${monthLabel(e.month)}/${String(e.year).slice(-2)}`,
    final: Number(e.avg_final),
    quality: Number(e.avg_quality),
    deliveries: e.total_deliveries,
    reworks: e.total_reworks,
  }));

  const usersRank = ranking?.users || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">Gráficos & Rankings</h2>
        <Select value={String(monthsBack)} onValueChange={(v) => setMonthsBack(Number(v))}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[3, 6, 12].map((n) => <SelectItem key={n} value={String(n)}>Últimos {n} meses</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card><CardContent className="p-4">
          <p className="text-sm font-medium mb-2">Evolução mensal — Score final médio</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={evoData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" /><YAxis />
              <Tooltip /><Legend />
              <Line type="monotone" dataKey="final" stroke="hsl(var(--primary))" name="Score final" />
              <Line type="monotone" dataKey="quality" stroke="#f59e0b" name="Qualidade" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <p className="text-sm font-medium mb-2">Entregas vs Retrabalhos por mês</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={evoData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" /><YAxis />
              <Tooltip /><Legend />
              <Bar dataKey="deliveries" fill="hsl(var(--primary))" name="Entregas" />
              <Bar dataKey="reworks" fill="#ef4444" name="Retrabalhos" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <p className="text-sm font-medium mb-2">Retrabalhos por colaborador</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={usersRank.map((u: any) => ({ name: u.full_name, reworks: Number(u.reworks) || 0 }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" hide /><YAxis />
              <Tooltip />
              <Bar dataKey="reworks" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <p className="text-sm font-medium mb-2">Qualidade técnica por colaborador (%)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={usersRank.map((u: any) => ({ name: u.full_name, quality: Number(u.quality_rate) || 0 }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" hide /><YAxis />
              <Tooltip />
              <Bar dataKey="quality" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent></Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card><CardContent className="p-4">
          <p className="text-sm font-medium mb-2">Ranking de Sprints (qualidade)</p>
          <ul className="text-sm space-y-1">
            {(ranking?.sprints || []).slice(0, 8).map((s: any, idx: number) => (
              <li key={s.id} className="flex items-center justify-between gap-2">
                <span className="truncate"><Badge variant="outline" className="mr-1">{idx + 1}º</Badge> {s.name}</span>
                <span className="text-xs text-muted-foreground">{Number(s.quality_score || 0)}% · {s.delivered} entregas</span>
              </li>
            ))}
            {!(ranking?.sprints || []).length && <p className="text-xs text-muted-foreground">Sem sprints concluídas no período.</p>}
          </ul>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm font-medium mb-2">Ranking de Projetos (progresso)</p>
          <ul className="text-sm space-y-1">
            {(ranking?.projects || []).slice(0, 8).map((p: any, idx: number) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <span className="truncate"><Badge variant="outline" className="mr-1">{idx + 1}º</Badge> {p.name}</span>
                <span className="text-xs text-muted-foreground">{p.progress}% · {p.delivered} entregas</span>
              </li>
            ))}
            {!(ranking?.projects || []).length && <p className="text-xs text-muted-foreground">Sem projetos.</p>}
          </ul>
        </CardContent></Card>
      </div>
    </div>
  );
}
