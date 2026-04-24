import { useState } from "react";
import { Target, Star, Clock, TrendingUp, User, ChevronDown, ChevronRight, Award, Settings2, BarChart3, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGoals } from "@/hooks/useGoals";
import GoalsManager from "@/components/metas/GoalsManager";
import GoalsSummaryCards from "@/components/metas/GoalsSummaryCards";
import { calcBusinessMinutes, BUSINESS_HOURS_PER_DAY } from "@/lib/businessHours";
import { fetchTicketResolutionEnds, getTicketWorkStart } from "@/lib/ticketTiming";

interface TechnicianStats {
  userId: string;
  name: string;
  totalClosed: number;
  avgScore: number;
  avgResolutionHours: number;
  evaluations: number;
  totalPoints: number;
  preventivasDone: number;
  reworkCount: number;
  tickets: { title: string; score: number | null; resolutionHours: number; closedAt: string; categoryName: string | null; points: number }[];
}

export default function MetasTecnicos() {
  const [expandedTech, setExpandedTech] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"desempenho" | "definir">("desempenho");
  const { hasRole, user } = useAuth();
  const isAdmin = hasRole("admin");
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const { data: goals = [] } = useGoals(selectedYear, selectedMonth);

  const { data: stats = [], isLoading } = useQuery({
    queryKey: ["metas-tecnicos", selectedYear, selectedMonth],
    queryFn: async () => {
      // Range do mês selecionado
      const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
      const monthEnd = new Date(selectedYear, selectedMonth, 1);

      // Tickets CRIADOS no mês E fechados — mesma base da Auditoria (created_at)
      const { data: closedTickets, error: tErr } = await supabase
        .from("tickets")
        .select("*")
        .eq("status", "Fechado")
        .gte("created_at", monthStart.toISOString())
        .lt("created_at", monthEnd.toISOString());
      if (tErr) throw tErr;

      const closedIds = (closedTickets || []).map((t) => t.id);
      if (closedIds.length === 0) return [];

      // Avaliações de satisfação (CSAT) e meta (pontos do admin) APENAS para tickets do mês
      const { data: evaluations, error: eErr } = await supabase
        .from("evaluations")
        .select("*")
        .eq("type", "satisfaction")
        .in("ticket_id", closedIds);
      if (eErr) throw eErr;

      // Pontuação: avaliações META dos chamados fechados no mês
      // Regra: 1 meta por ticket (garantido pelo unique index no banco)
      const { data: metaEvaluations, error: mErr } = await supabase
        .from("evaluations")
        .select("ticket_id, score")
        .eq("type", "meta")
        .in("ticket_id", closedIds);
      if (mErr) throw mErr;

      const metaScoreMap = new Map<string, number>(
        (metaEvaluations || []).map((e) => [e.ticket_id, e.score])
      );

      const categoryIds = [...new Set(closedTickets.map((t) => t.category_id).filter(Boolean))] as string[];
      let categoryMap = new Map<string, string>();
      if (categoryIds.length > 0) {
        const { data: cats } = await supabase
          .from("categories")
          .select("id, name")
          .in("id", categoryIds);
        categoryMap = new Map((cats || []).map((c) => [c.id, c.name]));
      }

      const techIds = [...new Set(closedTickets.map((t) => t.assigned_to).filter(Boolean))] as string[];
      if (techIds.length === 0) return [];

      // Preventivas FEITAS no mês selecionado, por técnico
      const { data: preventivas } = await supabase
        .from("preventive_maintenance")
        .select("created_by, created_at")
        .gte("created_at", monthStart.toISOString())
        .lt("created_at", monthEnd.toISOString());
      const preventivasMap = new Map<string, number>();
      (preventivas || []).forEach((p) => {
        preventivasMap.set(p.created_by, (preventivasMap.get(p.created_by) || 0) + 1);
      });

      // Retrabalhos para os tickets do mês
      let reworkMap = new Map<string, number>();
      if (closedIds.length > 0) {
        const { data: reworkHistory } = await supabase
          .from("ticket_history")
          .select("ticket_id")
          .eq("action", "rework")
          .in("ticket_id", closedIds);
        (reworkHistory || []).forEach((r) => {
          reworkMap.set(r.ticket_id, (reworkMap.get(r.ticket_id) || 0) + 1);
        });
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", techIds);
      const nameMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));

      const evalMap = new Map(evaluations.map((e) => [e.ticket_id, e.score]));

      const techMap = new Map<string, TechnicianStats>();

      for (const ticket of closedTickets) {
        if (!ticket.assigned_to) continue;
        const id = ticket.assigned_to;

        if (!techMap.has(id)) {
          techMap.set(id, {
            userId: id,
            name: nameMap.get(id) || "Sem nome",
            totalClosed: 0,
            avgScore: 0,
            avgResolutionHours: 0,
            evaluations: 0,
            totalPoints: 0,
            preventivasDone: preventivasMap.get(id) || 0,
            reworkCount: 0,
            tickets: [],
          });
        }

        const tech = techMap.get(id)!;
        // SLA: de started_at (início do atendimento) até updated_at, em horas úteis
        const start = ticket.started_at ? new Date(ticket.started_at) : new Date(ticket.created_at);
        const resolutionHours = Math.max(0, calcBusinessMinutes(start, new Date(ticket.updated_at)) / 60);
        const evalScore = evalMap.get(ticket.id) ?? null;

        const categoryName = ticket.category_id ? categoryMap.get(ticket.category_id) ?? null : null;
        // Pontuação: avaliação META atribuída a este chamado fechado
        const points = metaScoreMap.get(ticket.id) ?? 0;

        tech.totalClosed++;
        tech.totalPoints += points;
        tech.reworkCount += reworkMap.get(ticket.id) || 0;
        if (evalScore !== null) tech.evaluations++;

        tech.tickets.push({
          title: ticket.title,
          score: evalScore,
          resolutionHours,
          closedAt: ticket.updated_at,
          categoryName,
          points,
        });
      }

      const result: TechnicianStats[] = [];
      for (const tech of techMap.values()) {
        const scores = tech.tickets.filter((t) => t.score !== null).map((t) => t.score!);
        tech.avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        const totalHours = tech.tickets.reduce((a, t) => a + t.resolutionHours, 0);
        tech.avgResolutionHours = tech.totalClosed > 0 ? totalHours / tech.totalClosed : 0;
        result.push(tech);
      }

      return result.sort((a, b) => b.totalPoints - a.totalPoints || b.avgScore - a.avgScore);
    },
  });

  // Goal progress helper
  const getGoalProgress = (userId: string, metric: string) => {
    const goal = goals.find((g) => g.target_type === "individual" && g.target_id === userId && g.metric === metric);
    if (!goal) return null;
    const tech = stats.find((s) => s.userId === userId);
    if (!tech) return { target: goal.target_value, current: 0, pct: 0 };
     let current = 0;
      if (metric === "tickets_closed") current = tech.totalClosed;
      else if (metric === "avg_score") current = tech.avgScore;
      else if (metric === "avg_resolution_hours") current = tech.avgResolutionHours;
      else if (metric === "points") current = tech.totalPoints;
      else if (metric === "preventivas_done") current = tech.preventivasDone;
    const pct = goal.target_value > 0 ? Math.min(100, Math.round((current / goal.target_value) * 100)) : 0;
    return { target: goal.target_value, current, pct };
  };

  const hasGoals = (userId: string) => goals.some((g) => g.target_type === "individual" && g.target_id === userId);

  const globalAvgScore = stats.length > 0
    ? (stats.reduce((a, s) => a + s.avgScore, 0) / stats.filter(s => s.evaluations > 0).length || 0)
    : 0;
  const globalAvgHours = stats.length > 0
    ? stats.reduce((a, s) => a + s.avgResolutionHours, 0) / stats.length
    : 0;
  const totalClosed = stats.reduce((a, s) => a + s.totalClosed, 0);
  const totalPoints = stats.reduce((a, s) => a + s.totalPoints, 0);

  const formatHours = (h: number) => {
    if (h < 1) return `${Math.round(h * 60)}min`;
    if (h < BUSINESS_HOURS_PER_DAY) return `${h.toFixed(1)}h`;
    const days = Math.floor(h / BUSINESS_HOURS_PER_DAY);
    const rem = Math.round(h % BUSINESS_HOURS_PER_DAY);
    return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
  };

  const scoreColor = (score: number) => {
    if (score >= 4) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 3) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  // Visão do técnico: apenas seu próprio card
  if (!isAdmin) {
    const myStats = stats.filter((s) => s.userId === user?.id);
    const myGoals = goals.filter((g) => g.target_type === "individual" && g.target_id === user?.id);
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Minhas Metas</h1>
              <p className="text-sm text-muted-foreground">Acompanhe seu desempenho e metas do mês</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground"
            >
              {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground"
            >
              {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        {isLoading ? (
          <div className="card-elevated p-12 flex items-center justify-center">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <GoalsSummaryCards stats={myStats} goals={myGoals} formatHours={formatHours} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Metas & Desempenho</h1>
            <p className="text-sm text-muted-foreground">Defina metas e acompanhe o desempenho dos técnicos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground"
          >
            {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground"
          >
            {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab("desempenho")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "desempenho" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5" /> Desempenho
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab("definir")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "definir" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings2 className="h-3.5 w-3.5" /> Definir Metas
          </button>
        )}
      </div>

      {activeTab === "definir" && isAdmin ? (
        <GoalsManager year={selectedYear} month={selectedMonth} />
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="card-elevated p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-2xl font-bold text-foreground">{stats.length}</span>
              <p className="text-[11px] text-muted-foreground mt-1">Técnicos Ativos</p>
            </div>
            <div className="card-elevated p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-2xl font-bold text-foreground">{totalClosed}</span>
              <p className="text-[11px] text-muted-foreground mt-1">Chamados Fechados</p>
            </div>
            <div className="card-elevated p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Award className="h-4 w-4 text-amber-500" />
              </div>
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{totalPoints}</span>
              <p className="text-[11px] text-muted-foreground mt-1">Pontuação Total</p>
            </div>
            <div className="card-elevated p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Star className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className={`text-2xl font-bold ${globalAvgScore > 0 ? scoreColor(globalAvgScore) : "text-foreground"}`}>
                {globalAvgScore > 0 ? globalAvgScore.toFixed(1) : "—"}
              </span>
              <p className="text-[11px] text-muted-foreground mt-1">Nota Média Geral</p>
            </div>
            <div className="card-elevated p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-2xl font-bold text-foreground">
                {globalAvgHours > 0 ? formatHours(globalAvgHours) : "—"}
              </span>
              <p className="text-[11px] text-muted-foreground mt-1">Tempo Médio Geral</p>
            </div>
          </div>

          {/* Goals Summary Cards */}
          <GoalsSummaryCards stats={stats} goals={goals} formatHours={formatHours} />

          {/* Technician list */}
          {isLoading ? (
            <div className="card-elevated p-12 flex items-center justify-center">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : stats.length === 0 ? (
            <div className="card-elevated p-12 text-center text-sm text-muted-foreground">
              Nenhum chamado fechado com técnico atribuído.
            </div>
          ) : (
            <div className="space-y-3">
              {stats.map((tech, i) => {
                const isExpanded = expandedTech === tech.userId;
                const techHasGoals = hasGoals(tech.userId);
                return (
                  <div key={tech.userId} className="card-elevated overflow-hidden">
                    <button
                      onClick={() => setExpandedTech(isExpanded ? null : tech.userId)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}

                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        i === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" :
                        i === 1 ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" :
                        i === 2 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {i + 1}º
                      </div>

                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>

                      <div className="flex-1 text-left min-w-0">
                        <span className="text-sm font-semibold text-foreground">{tech.name}</span>
                        <p className="text-[11px] text-muted-foreground">
                          {tech.totalClosed} chamados · {tech.evaluations} avaliações · {tech.reworkCount} retrabalhos
                        </p>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        {tech.reworkCount > 0 && (
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <RefreshCw className="h-4 w-4 text-destructive" />
                              <span className="text-sm font-bold text-destructive">{tech.reworkCount}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">Retrabalhos</p>
                          </div>
                        )}
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <Award className="h-4 w-4 text-amber-500" />
                            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{tech.totalPoints}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">Pontos</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <Star className={`h-4 w-4 ${tech.avgScore > 0 ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
                            <span className={`text-sm font-bold ${tech.avgScore > 0 ? scoreColor(tech.avgScore) : "text-muted-foreground"}`}>
                              {tech.avgScore > 0 ? tech.avgScore.toFixed(1) : "—"}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">Nota</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-bold text-foreground">{formatHours(tech.avgResolutionHours)}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">Tempo Médio</p>
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border">
                        {/* Goal progress bars */}
                        {techHasGoals && (
                          <div className="px-4 py-3 bg-muted/20 border-b border-border">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                              <Target className="h-3 w-3" /> Progresso das Metas
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {["tickets_closed", "avg_score", "points", "avg_resolution_hours", "preventivas_done"].map((metric) => {
                                const progress = getGoalProgress(tech.userId, metric);
                                if (!progress) return null;
                                const metricLabels: Record<string, string> = {
                                  tickets_closed: "Chamados Fechados",
                                  avg_score: "Nota Média",
                                  points: "Pontuação",
                                  avg_resolution_hours: "Tempo Resolução",
                                  preventivas_done: "Preventivas",
                                };
                                const isInverse = metric === "avg_resolution_hours";
                                const pctColor = isInverse
                                  ? (progress.pct <= 100 ? "bg-emerald-500" : "bg-destructive")
                                  : (progress.pct >= 80 ? "bg-emerald-500" : progress.pct >= 50 ? "bg-amber-500" : "bg-destructive");
                                return (
                                  <div key={metric}>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs text-foreground">{metricLabels[metric]}</span>
                                      <span className="text-xs font-bold text-foreground">
                                        {metric === "avg_score" ? progress.current.toFixed(1) : metric === "avg_resolution_hours" ? formatHours(progress.current) : Math.round(progress.current)}
                                        <span className="text-muted-foreground font-normal"> / {progress.target}</span>
                                      </span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full">
                                      <div className={`h-full rounded-full transition-all ${pctColor}`} style={{ width: `${Math.min(100, progress.pct)}%` }} />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5 text-right">{progress.pct}%</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2">Chamado</th>
                                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2">Categoria</th>
                                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2">Pontos</th>
                                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2">Nota</th>
                                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2">Tempo</th>
                                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2">Fechado em</th>
                              </tr>
                            </thead>
                            <tbody>
                              {tech.tickets.map((t, idx) => (
                                <tr key={idx} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                                  <td className="px-4 py-2.5 text-sm text-foreground max-w-[250px] truncate">{t.title}</td>
                                  <td className="px-4 py-2.5 text-sm text-muted-foreground">{t.categoryName || "—"}</td>
                                  <td className="px-4 py-2.5">
                                    {t.points > 0 ? (
                                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                        <Award className="h-3 w-3" />{t.points}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    {t.score !== null ? (
                                      <div className="flex items-center gap-1">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                          <Star key={s} className={`h-3 w-3 ${s <= t.score! ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20"}`} />
                                        ))}
                                        <span className="text-xs font-medium text-muted-foreground ml-1">{t.score}/5</span>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">Sem avaliação</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5 text-sm text-muted-foreground">{formatHours(t.resolutionHours)}</td>
                                  <td className="px-4 py-2.5 text-sm text-muted-foreground">
                                    {new Date(t.closedAt).toLocaleDateString("pt-BR")}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
